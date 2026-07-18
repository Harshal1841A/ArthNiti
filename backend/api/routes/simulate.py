"""ArthNiti — Score Simulation route.

POST /api/v1/score/simulate

Runs the real XGBoost model + SHAP on a stored feature vector with
caller-supplied overrides. Used by the What-If Sandbox Simulator so the
frontend never has to maintain a copy of the scoring formula.
"""

import json
import logging
import time

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_db, get_scoring_core, verify_api_key
from backend.core.scoring_engine import FEATURE_ORDER
from backend.data.demo_personas import get_persona_by_id
from backend.database.models import NormalizedFeatures, Score
from backend.limiter import limiter

router = APIRouter()
logger = logging.getLogger(__name__)


class SimulateRequest(BaseModel):
    score_id: str
    overrides: dict = {}  # feature_name -> new_value


class SimulateResponse(BaseModel):
    score: int
    tier: str
    contributing_factors: list[dict]
    inference_ms: int
    model_version: str


@router.post("", response_model=SimulateResponse)
@limiter.limit("120/minute")
async def simulate_score(
    body: SimulateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    scoring_core=Depends(get_scoring_core),
    _auth: str = Depends(verify_api_key),
):
    """Run the real XGBoost + SHAP with feature overrides.

    Looks up the stored NormalizedFeatures for the given score_id, merges
    ``overrides`` on top, then re-runs the ScoringCore. Returns the
    counterfactual score and real SHAP breakdown — no fake linear formula.
    """
    score_id = body.score_id

    # ── Demo persona path ─────────────────────────────────────────────────────
    if score_id.startswith("DEMO-SCORE-"):
        persona_id = score_id[len("DEMO-SCORE-"):]
        persona = get_persona_by_id(persona_id)
        if not persona:
            raise HTTPException(status_code=404, detail="Demo persona not found")
        base_features: dict = {
            k: (v.value if hasattr(v, "value") else v)
            for k, v in persona["features"].items()
            if k != "data_sources_used"
        }
    else:
        # ── Real applicant path ───────────────────────────────────────────────
        score_row = await db.get(Score, score_id)
        if not score_row:
            raise HTTPException(status_code=404, detail="Score not found")

        result = await db.execute(
            select(NormalizedFeatures)
            .where(NormalizedFeatures.applicant_id == score_row.applicant_id)
            .order_by(NormalizedFeatures.computed_at.desc())
            .limit(1)
        )
        nf = result.scalar_one_or_none()
        if not nf:
            raise HTTPException(
                status_code=404,
                detail="Normalized features not found for this score",
            )
        base_features = json.loads(nf.feature_vector_json)

    # ── Merge caller overrides ────────────────────────────────────────────────
    merged = {**base_features, **body.overrides}

    # ── Build feature vector in canonical order ───────────────────────────────
    x = np.array(
        [
            [
                (merged[f] if merged.get(f) is not None else np.nan)
                for f in FEATURE_ORDER
            ]
        ],
        dtype=float,
    )

    start = time.perf_counter()
    proba = scoring_core.model.predict_proba(x)[0, 1]
    score_val = round(proba * 100)
    tier = scoring_core._tier(score_val)

    shap_vals = scoring_core.explainer.shap_values(x)
    if isinstance(shap_vals, list):
        shap_vals = shap_vals[1]
    shap_vals = np.asarray(shap_vals).reshape(1, -1)[0]

    top5 = sorted(zip(FEATURE_ORDER, shap_vals), key=lambda t: -abs(t[1]))[:5]
    inference_ms = int((time.perf_counter() - start) * 1000)

    return SimulateResponse(
        score=score_val,
        tier=tier,
        contributing_factors=[
            {"feature": f, "shap_value": round(float(v), 4)} for f, v in top5
        ],
        inference_ms=inference_ms,
        model_version=scoring_core._model_version,
    )
