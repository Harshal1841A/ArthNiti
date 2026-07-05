"""ArthNiti — Normalized Feature Schema.

The ONLY interface the Core ever sees. Adding a new data source means
writing a new adapter against this schema — never touching the Core.

CRITICAL FIX: F10 (Counterparty Reputation Ratio) has been REMOVED
entirely. The feature was built on a fundamental misunderstanding of
AA data scope (ReBIT DEPOSIT schema includes accountType for the
applicant's OWN accounts, not counterparties). Do not re-add.
"""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class DataSourceType(str, Enum):
    AA_BANK_STATEMENT = "aa_bank_statement"
    GST_RETURN = "gst_return"
    UPI_TRANSACTION_HISTORY = "upi_transaction_history"
    EPFO_PAYROLL = "epfo_payroll"
    DOCUMENT_FALLBACK = "document_fallback"


class NormalizedApplicantFeatures(BaseModel):
    """Canonical feature vector — every adapter produces this.

    Missing features are None. The Core (XGBoost) handles None natively
    via its own missing-value logic. Adapters MUST NOT invent plausible
    zeros or defaults.
    """

    applicant_id: str
    data_sources_used: list[DataSourceType]

    # Cash-flow stability (from AA bank statement adapter)
    avg_monthly_inflow: Optional[float] = None
    inflow_volatility_coefficient: Optional[float] = None  # std/mean over 6mo
    avg_closing_balance: Optional[float] = None
    days_with_negative_balance_90d: Optional[int] = None

    # Repayment-capacity proxy
    existing_emi_to_inflow_ratio: Optional[float] = None
    bounce_count_90d: Optional[int] = None

    # Transaction velocity (UPI / AA savings account)
    txn_count_30d: Optional[int] = None
    unique_counterparties_30d: Optional[int] = None

    # Behavioral signal — payment time consistency
    payment_time_consistency_score: Optional[float] = Field(
        None,
        description=(
            "0-1: how tightly incoming payments cluster into a repeating "
            "daily time window. Computed as 1 - (circular std-dev of "
            "incoming-payment timestamps, normalized to 24h)."
        ),
    )

    # Formal-data completeness
    gst_filing_regularity_12mo: Optional[float] = None
    gst_turnover_yoy_growth: Optional[float] = None
    epfo_payroll_headcount_trend: Optional[float] = None

    # Provenance
    had_bureau_record: bool
    data_completeness_pct: float = Field(
        ..., description="Fraction of schema fields that are non-None."
    )
