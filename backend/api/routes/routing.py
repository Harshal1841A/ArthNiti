"""ArthNiti — Routing routes.

GET /api/v1/routing/{score_id}  → route_decision() result (F9)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_db
from backend.api.models import RoutingResponse
from backend.core.routing import route_decision
from backend.database.models import Score, ReviewQueue

router = APIRouter()


@router.get("/{score_id}", response_model=RoutingResponse)
async def get_routing(
    score_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return routing decision for a score. WATCH/HIGH_RISK creates a review queue entry."""
    score = await db.get(Score, score_id)
    if not score:
        raise HTTPException(status_code=404, detail="Score not found")

    result = route_decision(score.tier)

    # If enhanced review, create review queue entry if not exists
    if result["requires_review"]:
        existing = await db.execute(
            select(ReviewQueue).where(ReviewQueue.score_id == score_id)
        )
        if existing.scalar_one_or_none() is None:
            review = ReviewQueue(
                applicant_id=score.applicant_id,
                score_id=score_id,
                status="pending",
            )
            db.add(review)
            await db.commit()

    return RoutingResponse(
        score_id=score_id,
        routing=result["routing"],
        next_step=result["next_step"],
        requires_review=result["requires_review"],
    )
