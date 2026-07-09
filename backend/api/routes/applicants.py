"""ArthNiti — Applicant routes.

POST /api/v1/applicants  → Create applicant record
GET  /api/v1/applicants  → List applicants
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_db, verify_api_key
from backend.api.models import ApplicantCreateRequest, ApplicantResponse
from backend.data.demo_personas import ALIAS_MAP
from backend.database.models import Applicant

router = APIRouter()


@router.post("", response_model=ApplicantResponse)
async def create_applicant(
    req: ApplicantCreateRequest,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(verify_api_key),
):
    """Register a new MSME applicant."""
    applicant = Applicant(
        business_name=req.business_name,
        has_bureau_record=req.has_bureau_record,
        preferred_language=req.preferred_language,
    )
    db.add(applicant)
    await db.commit()
    await db.refresh(applicant)
    return ApplicantResponse(
        id=applicant.id,
        business_name=applicant.business_name,
        has_bureau_record=applicant.has_bureau_record,
        is_synthetic=applicant.is_synthetic,
        preferred_language=applicant.preferred_language,
        created_at=applicant.created_at.isoformat() if applicant.created_at else None,
    )


@router.get("", response_model=list[ApplicantResponse])
async def list_applicants(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """BUG-10 FIX: Added offset/limit pagination parameters to prevent unbounded queries."""
    result = await db.execute(
        select(Applicant).order_by(Applicant.created_at.desc()).offset(offset).limit(limit)
    )
    applicants = result.scalars().all()
    return [
        ApplicantResponse(
            id=a.id,
            business_name=a.business_name,
            has_bureau_record=a.has_bureau_record,
            is_synthetic=a.is_synthetic,
            preferred_language=a.preferred_language,
            created_at=a.created_at.isoformat() if a.created_at else None,
        )
        for a in applicants
    ]


@router.get("/{applicant_id}", response_model=ApplicantResponse)
async def get_applicant(
    applicant_id: str,
    db: AsyncSession = Depends(get_db),
):
    """BUG-17 FIX: Retrieve a single applicant by ID directly, without fetching the entire list."""
    target_id = ALIAS_MAP.get(applicant_id, applicant_id)
    applicant = await db.get(Applicant, target_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return ApplicantResponse(
        id=applicant.id,
        business_name=applicant.business_name,
        has_bureau_record=applicant.has_bureau_record,
        is_synthetic=applicant.is_synthetic,
        preferred_language=applicant.preferred_language,
        created_at=applicant.created_at.isoformat() if applicant.created_at else None,
    )
