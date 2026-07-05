"""ArthNiti — OCEN Adapter: spec-compliant loan offer generation.

Previously a mocked stub. Now generates tiered loan offers based on the
applicant's Financial Health Score. Still spec-compliant Lender-side stubs
for the actual OCEN protocol, but the offer generation is real enough for demo.
"""

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class LoanOffer(BaseModel):
    lender_name: str
    lender_type: str  # BANK | COOP | NBFC
    interest_rate_annual: float
    tenure_months: int
    max_amount: float
    processing_fee_pct: float
    emi: int
    total_interest: int
    disbursement_days: int
    min_score_required: int
    features: list[str]


class OCENLoanApplicationStub(BaseModel):
    lsp_id: str
    borrower_ref: str
    requested_amount: float
    loan_product: str = "MSME_WORKING_CAPITAL"
    alt_data_consent_ref: str | None = None


class OCENLoanApplicationResponse(BaseModel):
    application_id: str
    status: str = "RECEIVED"
    message: str = "Mocked OCEN stub — no real LSP connected."


@router.post("/ocen/v1/loan-application", response_model=OCENLoanApplicationResponse)
async def receive_loan_application(payload: OCENLoanApplicationStub):
    """MOCKED ENDPOINT. Shaped to Lender-side OCEN interaction."""
    from backend.database.models import generate_id
    return OCENLoanApplicationResponse(
        application_id=generate_id("OCEN"),
        status="RECEIVED",
        message="Mocked OCEN stub — no real LSP connected.",
    )


def _emi(principal: float, annual_rate: float, months: int) -> int:
    """Standard reducing-balance EMI formula."""
    if principal <= 0 or months <= 0 or annual_rate <= 0:
        return 0
    r = annual_rate / 12 / 100
    emi = principal * r * ((1 + r) ** months) / (((1 + r) ** months) - 1)
    return int(round(emi))


def _total_interest(principal: float, emi: int, months: int) -> int:
    return int(round(emi * months - principal))


def generate_offers_for_score(score: int, tier: str, amount_requested: float = 500000.0) -> list[dict[str, Any]]:
    """Generate realistic loan offers based on score tier.

    Tier logic:
        STRONG    (≥75) → 3 offers (bank, coop, nbfc) with best rates
        ADEQUATE  (50-74) → 3 offers with slightly higher rates
        WATCH     (25-49) → 2 offers (coop, nbfc) with risk pricing
        HIGH_RISK (<25) → 1 offer (nbfc only) with high rates
    """
    offers: list[dict[str, Any]] = []

    if tier == "STRONG":
        offers = [
            {
                "lender_name": "Partner Co-op Bank",
                "lender_type": "COOP",
                "interest_rate_annual": 10.8,
                "tenure_months": 24,
                "max_amount": amount_requested,
                "processing_fee_pct": 0.8,
                "disbursement_days": 2,
                "min_score_required": 65,
                "features": ["Same-day approval", "No collateral up to ₹10L", "Overdraft facility"],
            },
            {
                "lender_name": "Partner National Bank",
                "lender_type": "BANK",
                "interest_rate_annual": 11.5,
                "tenure_months": 24,
                "max_amount": amount_requested,
                "processing_fee_pct": 1.0,
                "disbursement_days": 3,
                "min_score_required": 70,
                "features": ["Government-backed trust", "Priority sector lending", "Digital disbursement"],
            },
            {
                "lender_name": "Partner NBFC",
                "lender_type": "NBFC",
                "interest_rate_annual": 12.8,
                "tenure_months": 18,
                "max_amount": amount_requested,
                "processing_fee_pct": 1.5,
                "disbursement_days": 1,
                "min_score_required": 60,
                "features": ["Instant disbursement", "24-hour turnaround", "Top-up facility"],
            },
        ]
    elif tier == "ADEQUATE":
        offers = [
            {
                "lender_name": "Partner Co-op Bank",
                "lender_type": "COOP",
                "interest_rate_annual": 11.5,
                "tenure_months": 24,
                "max_amount": amount_requested,
                "processing_fee_pct": 1.2,
                "disbursement_days": 3,
                "min_score_required": 55,
                "features": ["Same-day approval", "No collateral up to ₹6L", "Flexible repayment"],
            },
            {
                "lender_name": "Partner National Bank",
                "lender_type": "BANK",
                "interest_rate_annual": 12.5,
                "tenure_months": 24,
                "max_amount": amount_requested,
                "processing_fee_pct": 1.5,
                "disbursement_days": 5,
                "min_score_required": 60,
                "features": ["Government-backed trust", "Priority sector lending", "Digital disbursement"],
            },
            {
                "lender_name": "Partner NBFC",
                "lender_type": "NBFC",
                "interest_rate_annual": 13.2,
                "tenure_months": 18,
                "max_amount": amount_requested,
                "processing_fee_pct": 2.0,
                "disbursement_days": 1,
                "min_score_required": 50,
                "features": ["Instant disbursement", "24-hour turnaround", "Minimal documentation"],
            },
        ]
    elif tier == "WATCH":
        offers = [
            {
                "lender_name": "Partner Co-op Bank",
                "lender_type": "COOP",
                "interest_rate_annual": 13.5,
                "tenure_months": 18,
                "max_amount": amount_requested * 0.6,
                "processing_fee_pct": 2.0,
                "disbursement_days": 7,
                "min_score_required": 40,
                "features": ["Collateral required", "Weekly review", "Flexible repayment"],
            },
            {
                "lender_name": "Partner NBFC",
                "lender_type": "NBFC",
                "interest_rate_annual": 15.0,
                "tenure_months": 12,
                "max_amount": amount_requested * 0.6,
                "processing_fee_pct": 2.5,
                "disbursement_days": 2,
                "min_score_required": 35,
                "features": ["Quick turnaround", "Higher interest for risk", "Weekly monitoring"],
            },
        ]
    elif tier == "HIGH_RISK":
        offers = [
            {
                "lender_name": "Partner NBFC",
                "lender_type": "NBFC",
                "interest_rate_annual": 17.0,
                "tenure_months": 12,
                "max_amount": amount_requested * 0.2,
                "processing_fee_pct": 3.0,
                "disbursement_days": 2,
                "min_score_required": 20,
                "features": ["High risk pricing", "Collateral mandatory", "Weekly monitoring"],
            },
        ]

    # Compute EMI and total interest for each offer
    for o in offers:
        p = o["max_amount"]
        r = o["interest_rate_annual"]
        n = o["tenure_months"]
        o["emi"] = _emi(p, r, n)
        o["total_interest"] = _total_interest(p, o["emi"], n)

    return offers
