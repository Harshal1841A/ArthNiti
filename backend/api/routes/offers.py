from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_db
from backend.config import get_settings
from backend.adapters.ocen_adapter import generate_offers_for_score
from backend.data.demo_personas import ALIAS_MAP
from backend.database.models import Score

router = APIRouter()
_settings = get_settings()


@router.get("/{applicant_id}")
async def get_offers(applicant_id: str, db: AsyncSession = Depends(get_db)):
    """Return OCEN loan offers for an applicant based on their latest score."""
    target_id = ALIAS_MAP.get(applicant_id, applicant_id)
    # Look up the latest score
    result = await db.execute(
        select(Score)
        .where(Score.applicant_id == target_id)
        .order_by(Score.computed_at.desc())
        .limit(1)
    )
    score = result.scalar_one_or_none()
    if not score:
        raise HTTPException(status_code=404, detail="No score found for this applicant. Run scoring first.")

    offers = generate_offers_for_score(score.score, score.tier, amount_requested=500000.0)

    return {
        "applicant_id": target_id,
        "score": score.score,
        "tier": score.tier,
        "offers": offers,
    }
