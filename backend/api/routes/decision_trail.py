"""ArthNiti — Decision Trail routes.

GET /api/v1/decision-trail/{applicant_id}  → build_decision_trail() (F11)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_db
from backend.api.models import DecisionTrailResponse
from backend.core.decision_trail import build_decision_trail
from backend.database.models import Applicant

router = APIRouter()


@router.get("/{applicant_id}", response_model=DecisionTrailResponse)
async def get_decision_trail(
    applicant_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return the actual processing pipeline stages for an applicant."""
    applicant = await db.get(Applicant, applicant_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    stages = await build_decision_trail(applicant_id, db)
    return DecisionTrailResponse(
        applicant_id=applicant_id,
        stages=stages,
    )
