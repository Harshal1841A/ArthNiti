"""ArthNiti — Coverage stats routes.

GET /api/v1/coverage-stats  → AdapterCoverageResponse
"""

import asyncio
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_db, verify_api_key
from backend.api.models import AdapterCoverageResponse
from backend.config import get_settings
from backend.database.models import Applicant, Score

_settings = get_settings()
router = APIRouter()


@router.get("", response_model=AdapterCoverageResponse)
async def get_coverage_stats(db: AsyncSession = Depends(get_db), _auth: str = Depends(verify_api_key)):
    # Executed sequentially to adhere to SQLAlchemy AsyncSession single-fiber contract
    total_res = await db.execute(select(func.count()).select_from(Applicant))
    total = total_res.scalar() or 0

    ntb_res = await db.execute(
        select(func.count()).select_from(Applicant).where(Applicant.has_bureau_record == False)
    )
    ntb = ntb_res.scalar() or 0

    usable_res = await db.execute(
        select(func.count(func.distinct(Applicant.id)))
        .select_from(Applicant)
        .join(Score, Score.applicant_id == Applicant.id)
        .where(Applicant.has_bureau_record == False)
        .where(Score.tier != "HIGH_RISK")
    )
    usable = usable_res.scalar() or 0

    coverage_pct = (usable / ntb * 100) if ntb > 0 else 0.0

    return AdapterCoverageResponse(
        total_applicants=total,
        applicants_without_bureau_record=ntb,
        applicants_without_bureau_record_with_usable_score=usable,
        coverage_improvement_pct=coverage_pct,
    )
