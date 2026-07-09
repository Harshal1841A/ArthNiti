"""ArthNiti — Decision Trail routes.

GET /api/v1/decision-trail/{applicant_id}  → build_decision_trail() (F11)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_db
from backend.api.models import DecisionTrailResponse
from backend.core.decision_trail import build_decision_trail
from backend.data.demo_personas import ALIAS_MAP
from backend.database.models import Applicant

router = APIRouter()


@router.get("/{applicant_id}", response_model=DecisionTrailResponse)
async def get_decision_trail(
    applicant_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return the actual processing pipeline stages for an applicant."""
    target_id = ALIAS_MAP.get(applicant_id, applicant_id)
    applicant = await db.get(Applicant, target_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    stages = await build_decision_trail(target_id, db)
    return DecisionTrailResponse(
        applicant_id=target_id,
        stages=stages,
    )
