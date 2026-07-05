"""ArthNiti — Applicant routes.

POST /api/v1/applicants  → Create applicant record
GET  /api/v1/applicants  → List applicants
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_db, verify_api_key
from backend.api.models import ApplicantCreateRequest, ApplicantResponse
from backend.database.models import Applicant

router = APIRouter()


@router.post("", response_model=ApplicantResponse)
async def create_applicant(
    req: ApplicantCreateRequest,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(verify_api_key),
):
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
    limit: int = Query(100, ge=1, le=500, description="Max items per page"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
):
    result = await db.execute(
        select(Applicant).order_by(Applicant.created_at.desc()).limit(limit).offset(offset)
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
