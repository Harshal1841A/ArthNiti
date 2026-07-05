"""Synthetic MSME training data generator.

Generates a dataset whose features map 1:1 to NormalizedApplicantFeatures.
Outcome label is synthetic — disclosed alongside every reported metric.

FIXED (v1.4): label generation now reflects REAL credit logic with strong
feature-outcome correlations. AUC target: 0.72–0.78 on synthetic data.
Previous versions had max correlation ~0.04 and AUC ~0.525.
"""

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# Ensure repo root is on path so we can import FEATURE_ORDER
_repo_root = Path(__file__).resolve().parents[2]
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from backend.core.scoring_engine import FEATURE_ORDER


def _generate_outcome(row: dict, rng: np.random.Generator) -> int:
    """Generate label from realistic credit-weighted feature scoring.

    Weights reflect how credit officers actually think:
    - Bounces are the strongest negative signal
    - Volatile income and negative balances are stress signals
    - GST compliance, payment consistency, and balance buffers are positive
    - Growing payroll is a growth signal

    Missing optional features default to slightly below-average values,
    reflecting that MSMEs without formal data are often less creditworthy.
    """
    # Normalisations — all bounded to 0-1 for weighted scoring
    bounce_norm = min(row["bounce_count_90d"] / 5.0, 1.0) if row["bounce_count_90d"] is not None else 0.5
    vol_norm = row["inflow_volatility_coefficient"] if row["inflow_volatility_coefficient"] is not None else 0.5
    neg_bal_norm = min(row["days_with_negative_balance_90d"] / 10.0, 1.0) if row["days_with_negative_balance_90d"] is not None else 0.5
    # Balance buffer: closing balance as a fraction of monthly inflow, capped
    inflow = max(row["avg_monthly_inflow"], 1.0) if row["avg_monthly_inflow"] is not None else 1.0
    bal = row["avg_closing_balance"] if row["avg_closing_balance"] is not None else 0.0
    bal_norm = min(bal / (inflow * 0.5), 1.0)
    # GST and payment consistency already 0-1
    gst_regular = row["gst_filing_regularity_12mo"] if row["gst_filing_regularity_12mo"] is not None else 0.3
    pay_consist = row["payment_time_consistency_score"] if row["payment_time_consistency_score"] is not None else 0.3
    # EPFO trend: normalised to [-0.3, +0.3] then mapped to 0-1
    epfo = row["epfo_payroll_headcount_trend"]
    if epfo is not None:
        epfo_norm = min(max((epfo + 0.3) / 0.6, 0.0), 1.0)
    else:
        epfo_norm = 0.5

    # Weighted credit score
    score = (
        - 0.35 * bounce_norm          # strongest negative signal
        - 0.25 * vol_norm             # unstable income = risk
        - 0.20 * neg_bal_norm         # cash flow stress
        + 0.30 * gst_regular          # formal compliance = creditworthy
        + 0.25 * pay_consist          # behavioural stability
        + 0.20 * bal_norm             # buffer = safety
        + 0.15 * epfo_norm            # growing payroll = growing business
        - 0.35                        # offset to balance classes (~48% positive)
    )

    # Add noise so it's not perfectly separable
    score += rng.normal(0.0, 0.20)

    return int(score > 0.0)


def generate(n: int = 2000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows = []

    for _ in range(n):
        is_ntc = rng.random() < 0.45
        has_gst = rng.random() < 0.60

        inflow = max(10_000, rng.normal(120_000, 60_000))
        volatility = rng.beta(2, 5)
        avg_bal = max(0, inflow * rng.uniform(0.05, 0.4))
        neg_days = max(0, int(rng.exponential(2.5)))
        emi_ratio = rng.beta(2, 6)
        bounce = max(0, int(rng.exponential(1.2)))
        txn_count = max(0, int(rng.normal(80, 40)))
        counterparties = max(0, int(rng.normal(18, 10)))
        pay_consistency = rng.beta(4, 2) if txn_count > 10 else None
        gst_regularity = rng.beta(7, 2) if has_gst else None
        gst_yoy = rng.normal(0.08, 0.15) if has_gst else None
        epfo_trend = rng.normal(0.03, 0.12) if rng.random() < 0.3 else None

        populated = sum(
            v is not None
            for v in [pay_consistency, gst_regularity, gst_yoy, epfo_trend]
        )
        completeness = (9 + populated) / 13  # 9 always-present fields + up to 4 optional

        row = {
            "avg_monthly_inflow": inflow,
            "inflow_volatility_coefficient": volatility,
            "avg_closing_balance": avg_bal,
            "days_with_negative_balance_90d": neg_days,
            "existing_emi_to_inflow_ratio": emi_ratio,
            "bounce_count_90d": bounce,
            "txn_count_30d": txn_count,
            "unique_counterparties_30d": counterparties,
            "payment_time_consistency_score": pay_consistency,
            "gst_filing_regularity_12mo": gst_regularity,
            "gst_turnover_yoy_growth": gst_yoy,
            "epfo_payroll_headcount_trend": epfo_trend,
            "data_completeness_pct": completeness,
            "had_bureau_record": not is_ntc,
        }

        row["repayment_success"] = _generate_outcome(row, rng)
        rows.append(row)

    df = pd.DataFrame(rows)
    print(f"Generated {n} rows | outcome rate: {df['repayment_success'].mean():.2%}")
    print(
        "DISCLOSURE: synthetic outcome label with realistic credit-weighted scoring + noise. "
        "Correlations are simulated to reflect real credit logic, not learned from real repayment history."
    )
    return df


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=2000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", type=str, default="./data/synthetic_msme_training.csv")
    args = parser.parse_args()

    df = generate(args.n, args.seed)
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.output, index=False)
    print(f"Saved -> {args.output}")
