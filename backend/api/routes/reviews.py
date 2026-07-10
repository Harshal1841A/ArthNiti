"""ArthNiti — Review Queue routes (F9 Human Underwriting).

GET  /api/v1/reviews                → List pending/in_review applications
POST /api/v1/reviews/{id}/assign    → Assign officer
POST /api/v1/reviews/{id}/resolve   → Approve or Reject application
"""

import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_db, verify_api_key
from backend.database.models import Applicant, ReviewQueue, Score

router = APIRouter()


def safe_json_loads(text: Optional[str]) -> List[dict]:
    if not text:
        return []
    try:
        return json.loads(text)
    except Exception:
        return []


class ReviewQueueItemResponse(BaseModel):
    review_id: str
    applicant_id: str
    business_name: str
    score_id: str
    score: int
    tier: str
    contributing_factors: List[dict]
    status: str
    assigned_officer: Optional[str] = None
    notes: Optional[str] = None
    created_at: str


class AssignOfficerRequest(BaseModel):
    officer_name: str


class ResolveReviewRequest(BaseModel):
    decision: str  # approved | rejected
    notes: str


@router.get("", response_model=List[ReviewQueueItemResponse])
async def list_review_queue(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(100, ge=1, le=500),
    _auth: str = Depends(verify_api_key),
):
    """List all flagged MSME applications requiring underwriter review."""
    stmt = select(ReviewQueue).order_by(ReviewQueue.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    reviews = result.scalars().all()

    # Batch-fetch applicants and scores instead of one round-trip per row
    # (was previously 1 + 2*N queries for N review items).
    applicant_ids = {rev.applicant_id for rev in reviews}
    score_ids = {rev.score_id for rev in reviews}

    applicants_by_id = {}
    if applicant_ids:
        res = await db.execute(select(Applicant).where(Applicant.id.in_(applicant_ids)))
        applicants_by_id = {a.id: a for a in res.scalars().all()}

    scores_by_id = {}
    if score_ids:
        res = await db.execute(select(Score).where(Score.id.in_(score_ids)))
        scores_by_id = {s.id: s for s in res.scalars().all()}

    out = []
    for rev in reviews:
        applicant = applicants_by_id.get(rev.applicant_id)
        score = scores_by_id.get(rev.score_id)
        if not applicant or not score:
            continue

        out.append(
            ReviewQueueItemResponse(
                review_id=rev.id,
                applicant_id=rev.applicant_id,
                business_name=applicant.business_name,
                score_id=rev.score_id,
                score=score.score,
                tier=score.tier,
                contributing_factors=safe_json_loads(score.contributing_factors_json),
                status=rev.status,
                assigned_officer=rev.assigned_officer,
                notes=rev.notes,
                created_at=rev.created_at.isoformat() if rev.created_at else "",
            )
        )
    return out


@router.post("/{review_id}/assign", response_model=ReviewQueueItemResponse)
async def assign_review(
    review_id: str,
    req: AssignOfficerRequest,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(verify_api_key),
):
    """Assign a credit officer to a flagged application."""
    rev = await db.get(ReviewQueue, review_id)
    if not rev:
        raise HTTPException(status_code=404, detail="Review item not found")

    rev.assigned_officer = req.officer_name
    if rev.status == "pending":
        rev.status = "in_review"
    await db.commit()

    applicant = await db.get(Applicant, rev.applicant_id)
    score = await db.get(Score, rev.score_id)
    return ReviewQueueItemResponse(
        review_id=rev.id,
        applicant_id=rev.applicant_id,
        business_name=applicant.business_name if applicant else "Unknown",
        score_id=rev.score_id,
        score=score.score if score else 0,
        tier=score.tier if score else "UNKNOWN",
        contributing_factors=safe_json_loads(score.contributing_factors_json) if score else [],
        status=rev.status,
        assigned_officer=rev.assigned_officer,
        notes=rev.notes,
        created_at=rev.created_at.isoformat() if rev.created_at else "",
    )


@router.post("/{review_id}/resolve", response_model=ReviewQueueItemResponse)
async def resolve_review(
    review_id: str,
    req: ResolveReviewRequest,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(verify_api_key),
):
    """Approve or Reject a flagged MSME credit application."""
    if req.decision not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Decision must be 'approved' or 'rejected'")

    rev = await db.get(ReviewQueue, review_id)
    if not rev:
        raise HTTPException(status_code=404, detail="Review item not found")

    rev.status = req.decision
    rev.notes = req.notes
    await db.commit()

    applicant = await db.get(Applicant, rev.applicant_id)
    score = await db.get(Score, rev.score_id)
    return ReviewQueueItemResponse(
        review_id=rev.id,
        applicant_id=rev.applicant_id,
        business_name=applicant.business_name if applicant else "Unknown",
        score_id=rev.score_id,
        score=score.score if score else 0,
        tier=score.tier if score else "UNKNOWN",
        contributing_factors=safe_json_loads(score.contributing_factors_json) if score else [],
        status=rev.status,
        assigned_officer=rev.assigned_officer,
        notes=rev.notes,
        created_at=rev.created_at.isoformat() if rev.created_at else "",
    )
