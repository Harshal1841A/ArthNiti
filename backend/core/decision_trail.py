"""ArthNiti — Decision Trail (F11).

Exposes the actual processing pipeline as a step-by-step trace.
These are logged DB events, not autonomous agents.

FIXED (v1.3 audit): status values are 'complete'/'pending' (backend)
which the frontend maps to '✓'/'○'. Previously backend returned 'complete'
but the Pydantic model expected '✓', causing a mismatch.
"""

from enum import Enum
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.models import (
    AdapterFetchLog,
    NormalizedFeatures,
    Score,
    XAINarrative,
)


class TrailStage(str, Enum):
    DATA_FETCHED = "DATA_FETCHED"
    FEATURES_NORMALIZED = "FEATURES_NORMALIZED"
    SCORE_COMPUTED = "SCORE_COMPUTED"
    NARRATIVE_GENERATED = "NARRATIVE_GENERATED"


async def build_decision_trail(applicant_id: str, db: AsyncSession) -> list[dict]:
    """Query the four real pipeline tables and return actual recorded status.

    Status reflects whether a real DB row exists — never a hardcoded tick.
    """

    def _row_to_stage(
        row, stage: TrailStage, detail_fn, ts_attr: str
    ) -> dict:
        if row is None:
            return {
                "stage": stage.value,
                "status": "pending",
                "detail": "Not yet reached",
                "timestamp": None,
            }
        ts = getattr(row, ts_attr, None)
        return {
            "stage": stage.value,
            "status": "complete",
            "detail": detail_fn(row),
            "timestamp": ts.isoformat() if ts else None,
        }

    # 1. Adapter fetch log
    fetch_result = await db.execute(
        select(AdapterFetchLog)
        .where(AdapterFetchLog.applicant_id == applicant_id)
        .order_by(AdapterFetchLog.fetched_at.desc())
        .limit(1)
    )
    fetch_row = fetch_result.scalar_one_or_none()

    # 2. Normalized features
    features_result = await db.execute(
        select(NormalizedFeatures)
        .where(NormalizedFeatures.applicant_id == applicant_id)
        .order_by(NormalizedFeatures.computed_at.desc())
        .limit(1)
    )
    features_row = features_result.scalar_one_or_none()

    # 3. Score
    score_result = await db.execute(
        select(Score)
        .where(Score.applicant_id == applicant_id)
        .order_by(Score.computed_at.desc())
        .limit(1)
    )
    score_row = score_result.scalar_one_or_none()

    # 4. XAI narrative (join through scores)
    narrative_row = None
    if score_row is not None:
        narrative_result = await db.execute(
            select(XAINarrative)
            .where(XAINarrative.score_id == score_row.id)
            .order_by(XAINarrative.created_at.desc())
            .limit(1)
        )
        narrative_row = narrative_result.scalar_one_or_none()

    return [
        _row_to_stage(
            fetch_row,
            TrailStage.DATA_FETCHED,
            lambda r: (
                f"AA data fetched via {r.adapter_type} "
                f"(is_mocked={r.is_mocked}, "
                f"fields_populated={r.fields_populated_count})"
            ),
            "fetched_at",
        ),
        _row_to_stage(
            features_row,
            TrailStage.FEATURES_NORMALIZED,
            lambda r: (
                f"Schema populated "
                f"({r.data_completeness_pct:.0%} fields, "
                f"sources: {r.data_sources_used})"
            ),
            "computed_at",
        ),
        _row_to_stage(
            score_row,
            TrailStage.SCORE_COMPUTED,
            lambda r: f"Score {r.score}/100, tier {r.tier}, model v{r.model_version}",
            "computed_at",
        ),
        _row_to_stage(
            narrative_row,
            TrailStage.NARRATIVE_GENERATED,
            lambda r: (
                f"XAI narrative, cross-check "
                f"{'passed' if r.cross_check_passed else 'FLAGGED'}, "
                f"model {r.model_used}"
            ),
            "created_at",
        ),
    ]
