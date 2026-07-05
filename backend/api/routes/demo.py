from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.api.deps import get_db
from backend.api.models import ConsentStatusResponse, ScoreResponse, DocumentUploadStatusResponse
from backend.config import get_settings
from backend.data.demo_personas import DEMO_PERSONAS, get_persona_by_id, list_persona_summaries
from backend.database.models import AdapterFetchLog, Applicant, ConsentRecord, NormalizedFeatures, Score, XAINarrative
from backend.adapters.ocen_adapter import generate_offers_for_score
from backend.limiter import limiter
import json
from datetime import datetime, timezone

router = APIRouter()
_settings = get_settings()


@router.post("/seed")
@limiter.limit("10/minute")
async def seed_demo_data(request: Request, db: AsyncSession = Depends(get_db)):
    """Seed all 5 demo personas into the database."""
    if not _settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="DEMO_MODE must be enabled to seed demo data.")

    for persona in DEMO_PERSONAS:
        app = persona["applicant"]
        feat = persona["features"]
        sc = persona["score_result"]

        # Upsert applicant
        existing = await db.get(Applicant, app["id"])
        if not existing:
            applicant = Applicant(
                id=app["id"],
                business_name=app["business_name"],
                has_bureau_record=app["has_bureau_record"],
                is_synthetic=app["is_synthetic"],
                preferred_language=app["preferred_language"],
            )
            db.add(applicant)
            await db.commit()
            await db.refresh(applicant)

        # Upsert features
        result = await db.execute(
            select(NormalizedFeatures)
            .where(NormalizedFeatures.applicant_id == app["id"])
            .order_by(NormalizedFeatures.computed_at.desc())
            .limit(1)
        )
        nf = result.scalar_one_or_none()
        if not nf:
            nf = NormalizedFeatures(
                applicant_id=app["id"],
                data_sources_used=json.dumps([ds.value for ds in feat["data_sources_used"]]),
                feature_vector_json=json.dumps({
                    "applicant_id": app["id"],
                    "data_sources_used": [ds.value for ds in feat["data_sources_used"]],
                    "avg_monthly_inflow": feat["avg_monthly_inflow"],
                    "inflow_volatility_coefficient": feat["inflow_volatility_coefficient"],
                    "avg_closing_balance": feat["avg_closing_balance"],
                    "days_with_negative_balance_90d": feat["days_with_negative_balance_90d"],
                    "existing_emi_to_inflow_ratio": feat["existing_emi_to_inflow_ratio"],
                    "bounce_count_90d": feat["bounce_count_90d"],
                    "txn_count_30d": feat["txn_count_30d"],
                    "unique_counterparties_30d": feat["unique_counterparties_30d"],
                    "payment_time_consistency_score": feat["payment_time_consistency_score"],
                    "gst_filing_regularity_12mo": feat["gst_filing_regularity_12mo"],
                    "gst_turnover_yoy_growth": feat["gst_turnover_yoy_growth"],
                    "epfo_payroll_headcount_trend": feat["epfo_payroll_headcount_trend"],
                    "had_bureau_record": feat["had_bureau_record"],
                    "data_completeness_pct": feat["data_completeness_pct"],
                }),
                data_completeness_pct=feat["data_completeness_pct"],
            )
            db.add(nf)
            await db.commit()
            await db.refresh(nf)

        # Upsert score
        result = await db.execute(
            select(Score).where(Score.applicant_id == app["id"]).order_by(Score.computed_at.desc()).limit(1)
        )
        score = result.scalar_one_or_none()
        if not score:
            score = Score(
                applicant_id=app["id"],
                normalized_features_id=nf.id,
                score=sc["score"],
                tier=sc["tier"],
                contributing_factors_json=json.dumps(sc["contributing_factors"]),
                inference_ms=sc["inference_ms"],
                model_version=sc["model_version"],
            )
            db.add(score)
            await db.commit()
            await db.refresh(score)

        # Upsert XAI
        result = await db.execute(
            select(XAINarrative).where(XAINarrative.score_id == score.id).limit(1)
        )
        if not result.scalar_one_or_none():
            xai = XAINarrative(
                score_id=score.id,
                narrative=persona["xai_narrative"]["en"],
                cross_check_passed=True,
                unsupported_claims="[]",
                model_used="demo_pre_generated",
                generation_ms=0,
            )
            db.add(xai)
            await db.commit()

        # Upsert adapter fetch log so decision trail shows DATA_FETCHED complete
        result = await db.execute(
            select(AdapterFetchLog).where(AdapterFetchLog.applicant_id == app["id"]).limit(1)
        )
        if not result.scalar_one_or_none():
            fetch_log = AdapterFetchLog(
                applicant_id=app["id"],
                adapter_type="aa_demo",
                is_mocked=True,
                fetch_status="SUCCESS",
                fields_populated_count=13,
            )
            db.add(fetch_log)
            await db.commit()

    return {"seeded": len(DEMO_PERSONAS)}


@router.get("/personas")
@limiter.limit("60/minute")
async def list_personas(request: Request):
    return list_persona_summaries()


@router.get("/personas/{persona_id}")
@limiter.limit("60/minute")
async def get_persona(persona_id: str, request: Request):
    persona = get_persona_by_id(persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    return persona


@router.post("/consent/{applicant_id}", response_model=ConsentStatusResponse)
@limiter.limit("60/minute")
async def demo_consent(
    applicant_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Instant ACTIVE consent in demo mode — bypasses real AA sandbox."""
    if not _settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="DEMO_MODE required")

    applicant = await db.get(Applicant, applicant_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    # Check if consent already exists
    result = await db.execute(
        select(ConsentRecord).where(ConsentRecord.applicant_id == applicant_id)
            .order_by(ConsentRecord.created_at.desc()).limit(1)
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.status = "ACTIVE"
        await db.commit()
        return ConsentStatusResponse(
            consent_handle=existing.consent_handle,
            status="ACTIVE",
            aa_provider="finvu_sandbox_demo",
        )

    consent_handle = f"DEMO-{applicant_id}-CONSENT"
    record = ConsentRecord(
        applicant_id=applicant_id,
        aa_provider="finvu_sandbox_demo",
        consent_handle=consent_handle,
        fi_types_requested=json.dumps(["DEPOSIT"]),
        purpose="Demo mode pre-loaded data",
        purpose_code="101",
        status="ACTIVE",
    )
    db.add(record)
    await db.commit()

    return ConsentStatusResponse(
        consent_handle=consent_handle,
        status="ACTIVE",
        aa_provider="finvu_sandbox_demo",
    )


@router.post("/score/{applicant_id}", response_model=ScoreResponse)
@limiter.limit("30/minute")
async def demo_score(
    applicant_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Return pre-computed score for a demo persona."""
    if not _settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="DEMO_MODE required")

    persona = get_persona_by_id(applicant_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")

    # Return the pre-computed score result, but wrapped in the same response model
    sc = persona["score_result"]
    return ScoreResponse(
        score_id=f"DEMO-SCORE-{applicant_id}",
        applicant_id=applicant_id,
        score=sc["score"],
        tier=sc["tier"],
        contributing_factors=sc["contributing_factors"],
        inference_ms=sc["inference_ms"],
        data_completeness_pct=persona["features"]["data_completeness_pct"],
        is_synthetic_applicant=True,
    )


@router.get("/offers/{applicant_id}")
@limiter.limit("60/minute")
async def demo_offers(
    applicant_id: str,
    request: Request,
):
    """Return pre-computed loan offers for a demo persona."""
    if not _settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="DEMO_MODE required")

    persona = get_persona_by_id(applicant_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")

    return {
        "applicant_id": applicant_id,
        "score": persona["score_result"]["score"],
        "tier": persona["score_result"]["tier"],
        "offers": persona["loan_offers"],
    }
