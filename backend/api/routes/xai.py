"""ArthNiti — XAI Narrative routes.

POST /api/v1/xai/{score_id}  → Generate XAI narrative (async, cross-checked)
GET  /api/v1/xai              → List XAI narratives
"""

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_db, get_llm_client, verify_api_key
from backend.api.models import XAINarrativeResponse
from backend.core.xai_narrative import generate_narrative
from backend.database.models import Score, XAINarrative

router = APIRouter()


@router.post("/{score_id}", response_model=XAINarrativeResponse)
async def generate_xai(
    score_id: str,
    db: AsyncSession = Depends(get_db),
    llm_client=Depends(get_llm_client),
    _auth: str = Depends(verify_api_key),
):
    """Generate XAI narrative for a score and cross-check it."""
    score = await db.get(Score, score_id)
    if not score:
        raise HTTPException(status_code=404, detail="Score not found")

    score_result = {
        "score": score.score,
        "tier": score.tier,
        "contributing_factors": json.loads(score.contributing_factors_json),
    }

    try:
        narrative_result = await generate_narrative(score_result, llm_client)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM generation failed: {e}")

    xai = XAINarrative(
        score_id=score_id,
        narrative=narrative_result["narrative"],
        model_used=narrative_result["model_used"],
        cross_check_passed=narrative_result["cross_check_passed"],
        unsupported_claims=json.dumps(narrative_result["unsupported_claims"]),
        generation_ms=narrative_result["generation_ms"],
    )
    db.add(xai)
    await db.commit()
    await db.refresh(xai)

    return XAINarrativeResponse(
        xai_id=xai.id,
        score_id=score_id,
        narrative=xai.narrative,
        model_used=xai.model_used,
        cross_check_passed=xai.cross_check_passed,
        unsupported_claims=json.loads(xai.unsupported_claims) if xai.unsupported_claims else [],
    )


@router.get("", response_model=list[XAINarrativeResponse])
async def list_xai(
    applicant_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    limit: int = 100,
):
    """List XAI narratives."""
    stmt = select(XAINarrative)
    if applicant_id:
        stmt = stmt.join(Score, XAINarrative.score_id == Score.id).where(Score.applicant_id == applicant_id)
    stmt = stmt.order_by(XAINarrative.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    items = result.scalars().all()
    return [
        XAINarrativeResponse(
            xai_id=xai.id,
            score_id=xai.score_id,
            narrative=xai.narrative,
            model_used=xai.model_used,
            cross_check_passed=xai.cross_check_passed,
            unsupported_claims=json.loads(xai.unsupported_claims) if xai.unsupported_claims else [],
        )
        for xai in items
    ]
