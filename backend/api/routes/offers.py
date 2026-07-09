from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_db, verify_api_key
from backend.config import get_settings
from backend.adapters.ocen_adapter import generate_offers_for_score
from backend.data.demo_personas import ALIAS_MAP
from backend.database.models import Score

router = APIRouter()
_settings = get_settings()


@router.get("/{applicant_id}")
async def get_offers(applicant_id: str, db: AsyncSession = Depends(get_db), _auth: str = Depends(verify_api_key)):
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
    score_val = score.score if score else 65
    tier_val = score.tier if score else "ADEQUATE"
    offers = generate_offers_for_score(score_val, tier_val, amount_requested=500000.0)

    return {
        "applicant_id": target_id,
        "score": score_val,
        "tier": tier_val,
        "offers": offers,
    }
