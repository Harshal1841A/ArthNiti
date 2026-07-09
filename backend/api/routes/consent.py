"""ArthNiti — Consent routes.

POST /api/v1/consent/request              → Start AA consent flow
GET  /api/v1/consent/{handle}/status       → Poll consent status
POST /api/v1/consent/aa/fetch             → Fetch + normalize AA data
"""

import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.adapters.aa_adapter import (
    ConsentRequest,
    fetch_financial_data,
    map_to_normalized_schema,
    poll_consent_status,
    request_consent,
)
from backend.api.deps import get_db, verify_api_key
from backend.api.models import ConsentListItem, ConsentRequestPayload, ConsentStatusResponse
from backend.database.models import AdapterFetchLog, Applicant, ConsentRecord, NormalizedFeatures
from backend.core.feature_schema import DataSourceType

router = APIRouter()


@router.post("/request", response_model=ConsentStatusResponse)
async def create_consent(
    req: ConsentRequestPayload,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(verify_api_key),
):
    """Initiate AA consent flow via Finvu sandbox."""
    # Verify applicant exists
    applicant = await db.get(Applicant, req.applicant_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    # BUG-14 FIX: Deduplicate consent requests. If an ACTIVE or PENDING consent
    # already exists for this applicant, return it instead of creating a duplicate.
    existing_result = await db.execute(
        select(ConsentRecord)
        .where(
            ConsentRecord.applicant_id == req.applicant_id,
            ConsentRecord.status.in_(["ACTIVE", "PENDING"]),
        )
        .order_by(ConsentRecord.created_at.desc())
        .limit(1)
    )
    existing_consent = existing_result.scalar_one_or_none()
    if existing_consent:
        return ConsentStatusResponse(
            consent_handle=existing_consent.consent_handle,
            status=existing_consent.status,
            aa_provider=existing_consent.aa_provider,
        )

    consent_req = ConsentRequest(
        applicant_id=req.applicant_id,
        fi_types=req.fi_types,
        purpose=req.purpose,
        purpose_code=req.purpose_code,
        data_range_from=datetime.now(timezone.utc) - timedelta(days=180),
        data_range_to=datetime.now(timezone.utc),
        consent_expiry=datetime.now(timezone.utc) + timedelta(days=7),
    )

    try:
        resp = await request_consent(consent_req)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AA sandbox error: {e}")

    consent_handle = resp.get("ConsentHandle", resp.get("consentHandle"))
    if not consent_handle:
        raise HTTPException(status_code=502, detail="AA response missing consent handle")

    record = ConsentRecord(
        applicant_id=req.applicant_id,
        aa_provider="finvu_sandbox",
        consent_handle=consent_handle,
        fi_types_requested=json.dumps(req.fi_types),
        purpose=req.purpose,
        purpose_code=req.purpose_code,
        data_range_from=consent_req.data_range_from,
        data_range_to=consent_req.data_range_to,
        consent_expiry=consent_req.consent_expiry,
    )
    db.add(record)
    await db.commit()

    return ConsentStatusResponse(
        consent_handle=consent_handle,
        status="PENDING",
        aa_provider="finvu_sandbox",
    )


@router.get("/{handle}/status", response_model=ConsentStatusResponse)
async def get_consent_status(
    handle: str,
    db: AsyncSession = Depends(get_db),
):
    """Poll consent status from AA sandbox."""
    result = await db.execute(
        select(ConsentRecord).where(ConsentRecord.consent_handle == handle)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Consent handle not found")

    try:
        status = await poll_consent_status(handle)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AA sandbox error: {e}")

    record.status = status
    await db.commit()

    return ConsentStatusResponse(
        consent_handle=handle,
        status=status,
        aa_provider=record.aa_provider,
    )


class AAFetchRequest(BaseModel):
    """BUG-03 FIX: applicant_id and consent_handle moved to POST body to prevent
    sensitive tokens appearing in URL query strings (server logs, browser history, CDN)."""
    applicant_id: str
    consent_handle: str


@router.post("/aa/fetch")
async def fetch_aa_data(
    req: AAFetchRequest,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(verify_api_key),
):
    """Fetch AA data, decrypt, normalize, and store features."""
    applicant_id = req.applicant_id
    consent_handle = req.consent_handle
    applicant = await db.get(Applicant, applicant_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    # Verify consent exists and is ACTIVE
    result = await db.execute(
        select(ConsentRecord).where(ConsentRecord.consent_handle == consent_handle)
    )
    consent = result.scalar_one_or_none()
    if not consent:
        raise HTTPException(status_code=404, detail="Consent handle not found")
    if consent.status != "ACTIVE":
        raise HTTPException(
            status_code=400,
            detail=f"Consent is {consent.status}. Applicant must approve it on their AA app before data fetch."
        )

    # Verify consent belongs to the requested applicant
    if consent.applicant_id != applicant_id:
        raise HTTPException(
            status_code=403, detail="Consent does not belong to this applicant"
        )

    try:
        fi_data = await fetch_financial_data(consent_handle)
    except Exception as e:
        # Log failed fetch
        log = AdapterFetchLog(
            applicant_id=applicant_id,
            adapter_type="aa",
            consent_record_id=consent.id,
            is_mocked=False,
            fetch_status="FAILED",
        )
        db.add(log)
        await db.commit()
        raise HTTPException(status_code=502, detail=f"AA data fetch failed: {e}")

    # Map to normalized features
    features = map_to_normalized_schema(fi_data, applicant_id, had_bureau_record=applicant.has_bureau_record)

    # Count populated fields (only core schema fields, not metadata)
    populated = sum(
        1 for f in features.model_dump().values() if f is not None
    )

    # Store normalized features
    import json
    nf = NormalizedFeatures(
        applicant_id=applicant_id,
        data_sources_used=json.dumps([ds.value for ds in features.data_sources_used]),
        feature_vector_json=features.model_dump_json(),
        data_completeness_pct=features.data_completeness_pct,
    )
    db.add(nf)

    # Log successful fetch
    log = AdapterFetchLog(
        applicant_id=applicant_id,
        adapter_type="aa",
        consent_record_id=consent.id,
        is_mocked=False,
        fetch_status="SUCCESS",
        fields_populated_count=populated,
    )
    db.add(log)
    await db.commit()

    return {
        "applicant_id": applicant_id,
        "features_id": nf.id,
        "data_completeness_pct": features.data_completeness_pct,
        "fields_populated": populated,
    }


@router.get("/applicant/{applicant_id}", response_model=list[ConsentListItem])
async def list_consents_for_applicant(
    applicant_id: str,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(verify_api_key),
):
    """List all consent records for an applicant."""
    from backend.database.models import ConsentRecord
    result = await db.execute(
        select(ConsentRecord)
        .where(ConsentRecord.applicant_id == applicant_id)
        .order_by(ConsentRecord.created_at.desc())
    )
    consents = result.scalars().all()
    return [
        ConsentListItem(
            consent_handle=c.consent_handle,
            status=c.status,
            aa_provider=c.aa_provider,
            created_at=c.created_at.isoformat() if c.created_at else "",
        )
        for c in consents
    ]
