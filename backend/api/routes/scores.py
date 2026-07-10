"""ArthNiti — Score routes.

POST /api/v1/score/{applicant_id}  → Run Core scoring model
GET  /api/v1/score/{score_id}     → Retrieve a score
GET  /api/v1/score                → List all scores

SECURITY FIX (v1.4): Added rate limiting (30/min per IP) to score endpoint.
"""

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_db, get_scoring_core, verify_api_key
from backend.api.models import ScoreResponse
from backend.core.scoring_engine import InsufficientDataError
from backend.data.demo_personas import ALIAS_MAP
from backend.database.models import Applicant, NormalizedFeatures, Score
from backend.limiter import limiter

router = APIRouter()


def _safe_json(text: Any) -> list:
    """BUG-A4/A5 FIX: Guard against NULL or malformed contributing_factors_json."""
    if not text:
        return []
    try:
        return json.loads(text)
    except Exception:
        return []


@router.post("/{applicant_id}", response_model=ScoreResponse)
@limiter.limit("30/minute")
async def score_applicant(
    request: Request,
    applicant_id: str,
    db: AsyncSession = Depends(get_db),
    core=Depends(get_scoring_core),
    _auth: str = Depends(verify_api_key),
):
    """Run the scoring model on the most recent normalized features for an applicant."""
    target_id = ALIAS_MAP.get(applicant_id, applicant_id)
    applicant = await db.get(Applicant, target_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    result = await db.execute(
        select(NormalizedFeatures)
        .where(NormalizedFeatures.applicant_id == target_id)
        .order_by(NormalizedFeatures.computed_at.desc())
        .limit(1)
    )
    features_row = result.scalar_one_or_none()
    if not features_row:
        raise HTTPException(status_code=400, detail="No normalized features found for this applicant. Run data fetch first.")

    from backend.core.feature_schema import NormalizedApplicantFeatures
    features = NormalizedApplicantFeatures.model_validate_json(features_row.feature_vector_json)

    try:
        score_result = core.score(features)
    except InsufficientDataError as e:
        raise HTTPException(status_code=400, detail=str(e))

    score = Score(
        applicant_id=target_id,
        normalized_features_id=features_row.id,
        score=score_result["score"],
        tier=score_result["tier"],
        contributing_factors_json=json.dumps(score_result["contributing_factors"]),
        inference_ms=score_result["inference_ms"],
        model_version=score_result["model_version"],
    )
    db.add(score)
    await db.commit()
    await db.refresh(score)

    return ScoreResponse(
        score_id=score.id,
        applicant_id=applicant_id,
        score=score_result["score"],
        tier=score_result["tier"],
        contributing_factors=score_result["contributing_factors"],
        inference_ms=score_result["inference_ms"],
        data_completeness_pct=score_result["data_completeness_pct"],
        is_synthetic_applicant=applicant.is_synthetic,
    )


@router.get("", response_model=list[ScoreResponse])
async def list_scores(
    applicant_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(100, ge=1, le=500, description="Max results (BUG-21 FIX: bounded)"),
    _auth: str = Depends(verify_api_key),
):
    """List all scores."""
    # BUG-08 FIX: Build full WHERE clause BEFORE applying ORDER BY + LIMIT.
    # Previously WHERE was chained after LIMIT which causes SQLAlchemy to emit
    # a subquery where LIMIT precedes the filter, potentially missing records.
    stmt = select(Score)
    if applicant_id:
        target_id = ALIAS_MAP.get(applicant_id, applicant_id)
        stmt = stmt.where(Score.applicant_id == target_id)
    stmt = stmt.order_by(Score.computed_at.desc()).limit(limit)
    result = await db.execute(stmt)
    scores = result.scalars().all()

    # Batch-fetch instead of one round-trip per row per related table
    # (was previously 1 + 2*N queries for N scores — noticeable at the
    # default limit=100 once real data volume shows up).
    applicant_ids = {s.applicant_id for s in scores}
    nf_ids = {s.normalized_features_id for s in scores if s.normalized_features_id}

    applicants_by_id = {}
    if applicant_ids:
        res = await db.execute(select(Applicant).where(Applicant.id.in_(applicant_ids)))
        applicants_by_id = {a.id: a for a in res.scalars().all()}

    nf_by_id = {}
    if nf_ids:
        res = await db.execute(select(NormalizedFeatures).where(NormalizedFeatures.id.in_(nf_ids)))
        nf_by_id = {n.id: n for n in res.scalars().all()}

    out = []
    for score in scores:
        applicant = applicants_by_id.get(score.applicant_id)
        nf = nf_by_id.get(score.normalized_features_id)
        out.append(ScoreResponse(
            score_id=score.id,
            applicant_id=score.applicant_id,
            score=score.score,
            tier=score.tier,
            contributing_factors=_safe_json(score.contributing_factors_json),
            inference_ms=score.inference_ms,
            data_completeness_pct=nf.data_completeness_pct if nf else 0.0,
            is_synthetic_applicant=applicant.is_synthetic if applicant else True,
        ))
    return out


@router.get("/{score_id}", response_model=ScoreResponse)
async def get_score(
    score_id: str,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(verify_api_key),
):
    """Retrieve a previously computed score."""
    score = await db.get(Score, score_id)
    if not score:
        raise HTTPException(status_code=404, detail="Score not found")

    applicant = await db.get(Applicant, score.applicant_id)
    nf = await db.get(NormalizedFeatures, score.normalized_features_id)
    return ScoreResponse(
        score_id=score.id,
        applicant_id=score.applicant_id,
        score=score.score,
        tier=score.tier,
        contributing_factors=_safe_json(score.contributing_factors_json),
        inference_ms=score.inference_ms,
        data_completeness_pct=nf.data_completeness_pct if nf else 0.0,
        is_synthetic_applicant=applicant.is_synthetic if applicant else True,
    )
