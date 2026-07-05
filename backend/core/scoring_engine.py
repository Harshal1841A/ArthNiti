"""ArthNiti — Scoring Core: XGBoost + SHAP, no LLM in the real-time path.

Deterministic, interpretable, and fast. Every score has a contributing-
factor breakdown via SHAP.

FIXED (v1.3 audit):
- SHAP shape guard for binary classification
- Minimum data-completeness guard (reject near-zero data)
- F10 fields removed entirely
"""

import time
from pathlib import Path

import numpy as np
import shap
import xgboost as xgb

from backend.config import get_settings
from backend.core.feature_schema import NormalizedApplicantFeatures

_settings = get_settings()

# The canonical feature order — imported by the training script and scorer.
# ONE source of truth. Adding a feature here requires retraining.
FEATURE_ORDER = [
    "avg_monthly_inflow",
    "inflow_volatility_coefficient",
    "avg_closing_balance",
    "days_with_negative_balance_90d",
    "existing_emi_to_inflow_ratio",
    "bounce_count_90d",
    "txn_count_30d",
    "unique_counterparties_30d",
    "payment_time_consistency_score",
    "gst_filing_regularity_12mo",
    "gst_turnover_yoy_growth",
    "epfo_payroll_headcount_trend",
    "data_completeness_pct",
]


class InsufficientDataError(ValueError):
    """Raised when data_completeness_pct is below MIN_DATA_COMPLETENESS."""



class ScoringCore:
    """Schema-agnostic scoring core."""

    def __init__(self, model_path: str | None = None):
        path = model_path or _settings.MODEL_PATH
        if not Path(path).exists():
            raise FileNotFoundError(
                f"Model not found at {path}. Run `python backend/train_model.py` first."
            )

        self.model = xgb.XGBClassifier()
        self.model.load_model(path)
        self.explainer = shap.TreeExplainer(self.model)
        self._model_version = Path(path).stem

    def score(self, features: NormalizedApplicantFeatures) -> dict:
        """Compute score, tier, and SHAP breakdown.

        Raises:
            InsufficientDataError: if data_completeness_pct < MIN_DATA_COMPLETENESS.
        """
        if features.data_completeness_pct < _settings.MIN_DATA_COMPLETENESS:
            raise InsufficientDataError(
                f"Data completeness {features.data_completeness_pct:.0%} is below "
                f"minimum {_settings.MIN_DATA_COMPLETENESS:.0%}."
            )

        start = time.perf_counter()

        x = np.array([
            [
                getattr(features, f) if getattr(features, f) is not None else np.nan
                for f in FEATURE_ORDER
            ]
        ], dtype=float)
        proba = self.model.predict_proba(x)[0, 1]
        score_0_100 = round(proba * 100)
        tier = self._tier(score_0_100)

        # SHAP values — handle shape differences across SHAP versions
        shap_values = self.explainer.shap_values(x)
        if isinstance(shap_values, list):
            # Binary classification: list of two arrays (class 0, class 1)
            shap_values = shap_values[1]  # positive class
        # Now shap_values shape is (1, n_features) or (n_features,)
        shap_values = np.asarray(shap_values).reshape(1, -1)[0]

        contributing_factors = sorted(
            zip(FEATURE_ORDER, shap_values), key=lambda t: -abs(t[1])
        )[:5]

        inference_ms = int((time.perf_counter() - start) * 1000)

        return {
            "score": score_0_100,
            "tier": tier,
            "contributing_factors": [
                {"feature": f, "shap_value": round(float(v), 4)}
                for f, v in contributing_factors
            ],
            "data_completeness_pct": features.data_completeness_pct,
            "inference_ms": inference_ms,
            "model_version": self._model_version,
        }

    @staticmethod
    def _tier(score: int) -> str:
        if score >= 75:
            return "STRONG"
        if score >= 50:
            return "ADEQUATE"
        if score >= 25:
            return "WATCH"
        return "HIGH_RISK"
