"""ArthNiti — Pre-loaded demo personas for hackathon demo mode.

Five complete MSME profiles with scores, SHAP breakdowns, narratives,
routing decisions, and loan offers. All data is synthetic and labeled.
"""

from typing import Any

from backend.core.feature_schema import DataSourceType


# ──────────────────────────────────────────────────────────────────────────
# Personas
# ──────────────────────────────────────────────────────────────────────────

RAMESH = {
    "applicant": {
        "id": "APP-RAMESH",
        "business_name": "Ramesh General Store",
        "city": "Indore",
        "industry": "Kirana / Retail",
        "has_bureau_record": False,
        "is_synthetic": True,
        "preferred_language": "hi",
    },
    "features": {
        "avg_monthly_inflow": 142000.0,
        "inflow_volatility_coefficient": 0.32,
        "avg_closing_balance": 28500.0,
        "days_with_negative_balance_90d": 1,
        "existing_emi_to_inflow_ratio": 0.18,
        "bounce_count_90d": 1,
        "txn_count_30d": 94,
        "unique_counterparties_30d": 22,
        "payment_time_consistency_score": 0.78,
        "gst_filing_regularity_12mo": 0.60,
        "gst_turnover_yoy_growth": 0.04,
        "epfo_payroll_headcount_trend": None,
        "data_completeness_pct": 0.923,
        "had_bureau_record": False,
        "data_sources_used": [DataSourceType.AA_BANK_STATEMENT, DataSourceType.GST_RETURN],
    },
    "score_result": {
        "score": 72,
        "tier": "ADEQUATE",
        "contributing_factors": [
            {"feature": "avg_monthly_inflow", "shap_value": 0.1423},
            {"feature": "payment_time_consistency_score", "shap_value": 0.0891},
            {"feature": "gst_filing_regularity_12mo", "shap_value": 0.0654},
            {"feature": "bounce_count_90d", "shap_value": -0.0472},
            {"feature": "inflow_volatility_coefficient", "shap_value": -0.0318},
        ],
        "inference_ms": 12,
        "model_version": "xgb_model",
    },
    "routing": {
        "routing": "STRAIGHT_THROUGH",
        "next_step": "show_score_immediately",
        "requires_review": False,
    },
    "xai_narrative": {
        "en": "Ramesh's Financial Health Score is 72 (ADEQUATE). His monthly income is stable at ₹1.42L with consistent payment timing. GST filing regularity at 60% is a moderate strength, though there is room for improvement. One bounce in the last 90 days is a minor risk factor. Overall, his cash-flow profile supports straight-through approval for working-capital credit.",
        "hi": "Ramesh ji, aapka financial health score 72 hai. Ye ADEQUATE tier hai. Aapki monthly income stable hai, aur payment timing bhi consistent hai. GST filing 60% hai — theek hai par aur behtar ho sakta hai. 90 din mein ek bounce dikha hai — chhoti si chinta. Cash flow overall theek hai, working capital loan ke liye sidha approval mil sakta hai.",
    },
    "loan_offers": [
        {
            "lender_name": "Partner Co-op Bank",
            "lender_type": "COOP",
            "interest_rate_annual": 10.8,
            "tenure_months": 24,
            "max_amount": 500000.0,
            "processing_fee_pct": 1.0,
            "emi": 23247,
            "total_interest": 57928,
            "disbursement_days": 3,
            "min_score_required": 65,
            "features": ["Same-day approval", "No collateral up to ₹5L", "Flexible repayment"],
        },
        {
            "lender_name": "Partner National Bank",
            "lender_type": "BANK",
            "interest_rate_annual": 11.5,
            "tenure_months": 24,
            "max_amount": 500000.0,
            "processing_fee_pct": 1.5,
            "emi": 23438,
            "total_interest": 62512,
            "disbursement_days": 5,
            "min_score_required": 70,
            "features": ["Government-backed trust", "Priority sector lending", "Digital disbursement"],
        },
        {
            "lender_name": "Partner NBFC",
            "lender_type": "NBFC",
            "interest_rate_annual": 13.2,
            "tenure_months": 18,
            "max_amount": 500000.0,
            "processing_fee_pct": 2.0,
            "emi": 30642,
            "total_interest": 51556,
            "disbursement_days": 1,
            "min_score_required": 60,
            "features": ["Instant disbursement", "24-hour turnaround", "Minimal documentation"],
        },
    ],
    "decision_trail": [
        {"stage": "consent_requested", "status": "complete", "detail": "AA consent APPROVED by applicant", "timestamp": "2024-06-30T09:15:00+05:30"},
        {"stage": "data_fetched", "status": "complete", "detail": "AA DEPOSIT data normalized (12 features)", "timestamp": "2024-06-30T09:15:03+05:30"},
        {"stage": "scored", "status": "complete", "detail": "XGBoost inference 12ms — Score 72 ADEQUATE", "timestamp": "2024-06-30T09:15:03+05:30"},
        {"stage": "xai_generated", "status": "complete", "detail": "Narrative cross-check PASSED", "timestamp": "2024-06-30T09:15:04+05:30"},
        {"stage": "offers_generated", "status": "complete", "detail": "3 OCEN loan offers received", "timestamp": "2024-06-30T09:15:05+05:30"},
        {"stage": "decision", "status": "complete", "detail": "STRAIGHT_THROUGH — Funds in 48 hours", "timestamp": "2024-06-30T09:15:05+05:30"},
    ],
}

PRIYA = {
    "applicant": {
        "id": "APP-PRIYA",
        "business_name": "Priya Textiles",
        "city": "Surat",
        "industry": "Textile Manufacturing",
        "has_bureau_record": True,
        "is_synthetic": True,
        "preferred_language": "hi",
    },
    "features": {
        "avg_monthly_inflow": 385000.0,
        "inflow_volatility_coefficient": 0.18,
        "avg_closing_balance": 92000.0,
        "days_with_negative_balance_90d": 0,
        "existing_emi_to_inflow_ratio": 0.12,
        "bounce_count_90d": 0,
        "txn_count_30d": 156,
        "unique_counterparties_30d": 38,
        "payment_time_consistency_score": 0.91,
        "gst_filing_regularity_12mo": 0.95,
        "gst_turnover_yoy_growth": 0.14,
        "epfo_payroll_headcount_trend": 0.08,
        "data_completeness_pct": 1.0,
        "had_bureau_record": True,
        "data_sources_used": [DataSourceType.AA_BANK_STATEMENT, DataSourceType.GST_RETURN, DataSourceType.EPFO_PAYROLL],
    },
    "score_result": {
        "score": 85,
        "tier": "STRONG",
        "contributing_factors": [
            {"feature": "gst_filing_regularity_12mo", "shap_value": 0.1784},
            {"feature": "avg_closing_balance", "shap_value": 0.1342},
            {"feature": "epfo_payroll_headcount_trend", "shap_value": 0.0987},
            {"feature": "payment_time_consistency_score", "shap_value": 0.0876},
            {"feature": "avg_monthly_inflow", "shap_value": 0.0654},
        ],
        "inference_ms": 11,
        "model_version": "xgb_model",
    },
    "routing": {
        "routing": "STRAIGHT_THROUGH",
        "next_step": "show_score_immediately",
        "requires_review": False,
    },
    "xai_narrative": {
        "en": "Priya's Financial Health Score is 85 (STRONG). Her business demonstrates exceptional financial discipline: 95% GST filing regularity, zero bounces, strong closing balance buffer at ₹92K, and a growing payroll trend of 8% YoY. Monthly inflow of ₹3.85L is highly stable. This is a textbook creditworthy profile with straight-through approval eligibility.",
        "hi": "Priya ji, aapka score 85 hai — ye STRONG tier hai. Aapka business bahut disciplined hai: GST filing 95% hai, zero bounces, closing balance ₹92K strong hai, aur payroll 8% badh raha hai. Monthly income ₹3.85L stable hai. Ye bilkul best credit profile hai — sidha approval eligible hai.",
    },
    "loan_offers": [
        {
            "lender_name": "Partner Co-op Bank",
            "lender_type": "COOP",
            "interest_rate_annual": 10.8,
            "tenure_months": 24,
            "max_amount": 1000000.0,
            "processing_fee_pct": 0.8,
            "emi": 46494,
            "total_interest": 115856,
            "disbursement_days": 2,
            "min_score_required": 65,
            "features": ["Same-day approval", "No collateral up to ₹10L", "Overdraft facility"],
        },
        {
            "lender_name": "Partner National Bank",
            "lender_type": "BANK",
            "interest_rate_annual": 11.5,
            "tenure_months": 24,
            "max_amount": 1000000.0,
            "processing_fee_pct": 1.0,
            "emi": 46875,
            "total_interest": 125000,
            "disbursement_days": 3,
            "min_score_required": 70,
            "features": ["Government-backed trust", "Priority sector lending", "Digital disbursement"],
        },
        {
            "lender_name": "Partner NBFC",
            "lender_type": "NBFC",
            "interest_rate_annual": 12.8,
            "tenure_months": 18,
            "max_amount": 1000000.0,
            "processing_fee_pct": 1.5,
            "emi": 61284,
            "total_interest": 103112,
            "disbursement_days": 1,
            "min_score_required": 60,
            "features": ["Instant disbursement", "24-hour turnaround", "Top-up facility"],
        },
    ],
    "decision_trail": [
        {"stage": "consent_requested", "status": "complete", "detail": "AA consent APPROVED by applicant", "timestamp": "2024-06-30T10:22:00+05:30"},
        {"stage": "data_fetched", "status": "complete", "detail": "AA + GST + EPFO data normalized (13 features)", "timestamp": "2024-06-30T10:22:03+05:30"},
        {"stage": "scored", "status": "complete", "detail": "XGBoost inference 11ms — Score 85 STRONG", "timestamp": "2024-06-30T10:22:03+05:30"},
        {"stage": "xai_generated", "status": "complete", "detail": "Narrative cross-check PASSED", "timestamp": "2024-06-30T10:22:04+05:30"},
        {"stage": "offers_generated", "status": "complete", "detail": "3 OCEN loan offers received (best rates)", "timestamp": "2024-06-30T10:22:05+05:30"},
        {"stage": "decision", "status": "complete", "detail": "STRAIGHT_THROUGH — Funds in 24 hours", "timestamp": "2024-06-30T10:22:05+05:30"},
    ],
}

VIKRAM = {
    "applicant": {
        "id": "APP-VIKRAM",
        "business_name": "Vikram Auto Parts",
        "city": "Hyderabad",
        "industry": "Auto Parts Wholesale",
        "has_bureau_record": True,
        "is_synthetic": True,
        "preferred_language": "hi",
    },
    "features": {
        "avg_monthly_inflow": 89000.0,
        "inflow_volatility_coefficient": 0.65,
        "avg_closing_balance": 8200.0,
        "days_with_negative_balance_90d": 4,
        "existing_emi_to_inflow_ratio": 0.38,
        "bounce_count_90d": 3,
        "txn_count_30d": 67,
        "unique_counterparties_30d": 14,
        "payment_time_consistency_score": 0.42,
        "gst_filing_regularity_12mo": 0.45,
        "gst_turnover_yoy_growth": -0.03,
        "epfo_payroll_headcount_trend": None,
        "data_completeness_pct": 0.923,
        "had_bureau_record": True,
        "data_sources_used": [DataSourceType.AA_BANK_STATEMENT, DataSourceType.GST_RETURN],
    },
    "score_result": {
        "score": 45,
        "tier": "WATCH",
        "contributing_factors": [
            {"feature": "txn_count_30d", "shap_value": 0.0342},
            {"feature": "inflow_volatility_coefficient", "shap_value": -0.1567},
            {"feature": "days_with_negative_balance_90d", "shap_value": -0.0984},
            {"feature": "bounce_count_90d", "shap_value": -0.0873},
            {"feature": "payment_time_consistency_score", "shap_value": -0.0456},
        ],
        "inference_ms": 13,
        "model_version": "xgb_model",
    },
    "routing": {
        "routing": "ENHANCED_REVIEW",
        "next_step": "route_to_human_officer",
        "requires_review": True,
    },
    "xai_narrative": {
        "en": "Vikram's Financial Health Score is 45 (WATCH). His income is highly volatile at 65% coefficient, with 4 days of negative balance and 3 bounces in the last 90 days. GST filing has dropped to 45% and turnover declined 3% YoY. Transaction velocity is the only positive signal. Enhanced human review is required before any credit decision. Recommend requesting additional collateral or reducing exposure to ₹3L.",
        "hi": "Vikram sahab, aapka score 45 hai — ye WATCH tier hai. Aapki income bahut unstable hai (65% volatility), 90 din mein 4 din negative balance, aur 3 bounces hain. GST filing 45% ho gayi hai, aur turnover bhi 3% ghat raha hai. Transaction count achha hai bas. Human officer review zaroori hai. Collateral maangna chahiye, ya loan ₹3L tak limit karna chahiye.",
    },
    "loan_offers": [
        {
            "lender_name": "Partner Co-op Bank",
            "lender_type": "COOP",
            "interest_rate_annual": 13.5,
            "tenure_months": 18,
            "max_amount": 300000.0,
            "processing_fee_pct": 2.0,
            "emi": 18490,
            "total_interest": 32820,
            "disbursement_days": 7,
            "min_score_required": 40,
            "features": ["Collateral required", "Weekly review", "Flexible repayment"],
        },
        {
            "lender_name": "Partner NBFC",
            "lender_type": "NBFC",
            "interest_rate_annual": 15.0,
            "tenure_months": 12,
            "max_amount": 300000.0,
            "processing_fee_pct": 2.5,
            "emi": 27048,
            "total_interest": 24576,
            "disbursement_days": 2,
            "min_score_required": 35,
            "features": ["Quick turnaround", "Higher interest for risk", "Weekly monitoring"],
        },
    ],
    "decision_trail": [
        {"stage": "consent_requested", "status": "complete", "detail": "AA consent APPROVED by applicant", "timestamp": "2024-06-30T11:05:00+05:30"},
        {"stage": "data_fetched", "status": "complete", "detail": "AA + GST data normalized (12 features)", "timestamp": "2024-06-30T11:05:03+05:30"},
        {"stage": "scored", "status": "complete", "detail": "XGBoost inference 13ms — Score 45 WATCH", "timestamp": "2024-06-30T11:05:03+05:30"},
        {"stage": "xai_generated", "status": "complete", "detail": "Narrative cross-check PASSED", "timestamp": "2024-06-30T11:05:04+05:30"},
        {"stage": "offers_generated", "status": "complete", "detail": "2 OCEN loan offers (restricted)", "timestamp": "2024-06-30T11:05:05+05:30"},
        {"stage": "decision", "status": "pending", "detail": "ENHANCED_REVIEW — Routed to human officer", "timestamp": "2024-06-30T11:05:05+05:30"},
    ],
}

ANITA = {
    "applicant": {
        "id": "APP-ANITA",
        "business_name": "Anita Catering Services",
        "city": "Chennai",
        "industry": "Food & Hospitality",
        "has_bureau_record": False,
        "is_synthetic": True,
        "preferred_language": "hi",
    },
    "features": {
        "avg_monthly_inflow": 34000.0,
        "inflow_volatility_coefficient": 0.78,
        "avg_closing_balance": 1200.0,
        "days_with_negative_balance_90d": 7,
        "existing_emi_to_inflow_ratio": 0.55,
        "bounce_count_90d": 5,
        "txn_count_30d": 34,
        "unique_counterparties_30d": 8,
        "payment_time_consistency_score": 0.28,
        "gst_filing_regularity_12mo": 0.25,
        "gst_turnover_yoy_growth": -0.12,
        "epfo_payroll_headcount_trend": None,
        "data_completeness_pct": 0.923,
        "had_bureau_record": False,
        "data_sources_used": [DataSourceType.AA_BANK_STATEMENT, DataSourceType.GST_RETURN],
    },
    "score_result": {
        "score": 28,
        "tier": "HIGH_RISK",
        "contributing_factors": [
            {"feature": "bounce_count_90d", "shap_value": -0.1876},
            {"feature": "days_with_negative_balance_90d", "shap_value": -0.1423},
            {"feature": "existing_emi_to_inflow_ratio", "shap_value": -0.0987},
            {"feature": "inflow_volatility_coefficient", "shap_value": -0.0765},
            {"feature": "gst_filing_regularity_12mo", "shap_value": -0.0543},
        ],
        "inference_ms": 14,
        "model_version": "xgb_model",
    },
    "routing": {
        "routing": "REJECT",
        "next_step": "issue_adverse_action_notice",
        "requires_review": False,
    },
    "xai_narrative": {
        "en": "Anita's Financial Health Score is 28 (HIGH RISK). This profile exhibits severe credit stress: 5 bounces in 90 days, 7 days of negative balance, and an EMI-to-income ratio of 55% which is critically high. Income volatility is extreme at 78%, and GST compliance has deteriorated to 25%. This applicant is currently over-leveraged and requires immediate human officer review. Credit should be declined or significantly reduced with strict collateral requirements.",
        "hi": "Anita ji, aapka score 28 hai — ye HIGH RISK tier hai. Aapka profile bahut stressed hai: 90 din mein 5 bounces, 7 din negative balance, aur EMI-to-income 55% hai jo bahut zyada hai. Income volatility 78% hai, aur GST compliance 25% tak ghat gayi hai. Aap over-leveraged hain. Human officer review zaroori hai. Loan decline karna chahiye, ya bahut kam amount aur strict collateral ke saath.",
    },
    "loan_offers": [
        {
            "lender_name": "Partner NBFC",
            "lender_type": "NBFC",
            "interest_rate_annual": 17.0,
            "tenure_months": 12,
            "max_amount": 100000.0,
            "processing_fee_pct": 3.0,
            "emi": 9127,
            "total_interest": 9524,
            "disbursement_days": 2,
            "min_score_required": 20,
            "features": ["High risk pricing", "Collateral mandatory", "Weekly monitoring"],
        },
    ],
    "decision_trail": [
        {"stage": "consent_requested", "status": "complete", "detail": "AA consent APPROVED by applicant", "timestamp": "2024-06-30T12:40:00+05:30"},
        {"stage": "data_fetched", "status": "complete", "detail": "AA + GST data normalized (12 features)", "timestamp": "2024-06-30T12:40:03+05:30"},
        {"stage": "scored", "status": "complete", "detail": "XGBoost inference 14ms — Score 28 HIGH_RISK", "timestamp": "2024-06-30T12:40:03+05:30"},
        {"stage": "xai_generated", "status": "complete", "detail": "Narrative cross-check PASSED (with risk flags)", "timestamp": "2024-06-30T12:40:04+05:30"},
        {"stage": "offers_generated", "status": "complete", "detail": "1 restricted NBFC offer (₹1L max)", "timestamp": "2024-06-30T12:40:05+05:30"},
        {"stage": "decision", "status": "complete", "detail": "REJECT — Adverse Action Notice Issued", "timestamp": "2024-06-30T12:40:05+05:30"},
    ],
}

SURESH = {
    "applicant": {
        "id": "APP-SURESH",
        "business_name": "Suresh Electronics",
        "city": "Delhi",
        "industry": "Electronics Retail",
        "has_bureau_record": False,
        "is_synthetic": True,
        "preferred_language": "hi",
    },
    "features": {
        "avg_monthly_inflow": 215000.0,
        "inflow_volatility_coefficient": 0.45,
        "avg_closing_balance": 42000.0,
        "days_with_negative_balance_90d": 2,
        "existing_emi_to_inflow_ratio": 0.22,
        "bounce_count_90d": 1,
        "txn_count_30d": 112,
        "unique_counterparties_30d": 28,
        "payment_time_consistency_score": 0.71,
        "gst_filing_regularity_12mo": 0.80,
        "gst_turnover_yoy_growth": 0.09,
        "epfo_payroll_headcount_trend": None,
        "data_completeness_pct": 0.923,
        "had_bureau_record": False,
        "data_sources_used": [DataSourceType.AA_BANK_STATEMENT, DataSourceType.GST_RETURN],
    },
    "score_result": {
        "score": 61,
        "tier": "ADEQUATE",
        "contributing_factors": [
            {"feature": "avg_monthly_inflow", "shap_value": 0.1156},
            {"feature": "gst_filing_regularity_12mo", "shap_value": 0.0892},
            {"feature": "avg_closing_balance", "shap_value": 0.0723},
            {"feature": "inflow_volatility_coefficient", "shap_value": -0.0678},
            {"feature": "bounce_count_90d", "shap_value": -0.0321},
        ],
        "inference_ms": 12,
        "model_version": "xgb_model",
    },
    "routing": {
        "routing": "STRAIGHT_THROUGH",
        "next_step": "show_score_immediately",
        "requires_review": False,
    },
    "xai_narrative": {
        "en": "Suresh's Financial Health Score is 61 (ADEQUATE). He runs a solid electronics retail business with ₹2.15L monthly inflow and good GST compliance at 80%. Closing balance of ₹42K provides a decent buffer. The main risk factor is income volatility at 45%, which suggests seasonal demand fluctuations. One bounce is within acceptable limits. Straight-through approval is recommended, but the credit officer should monitor seasonal patterns.",
        "hi": "Suresh ji, aapka score 61 hai — ye ADEQUATE tier hai. Aapka electronics retail business solid hai, monthly income ₹2.15L hai, aur GST compliance 80% achhi hai. Closing balance ₹42K hai jo safety buffer hai. Main risk volatility 45% hai — seasonal demand lagta hai. Ek bounce acceptable hai. Sidha approval recommended hai, par credit officer ko seasonal pattern monitor karna chahiye.",
    },
    "loan_offers": [
        {
            "lender_name": "Partner Co-op Bank",
            "lender_type": "COOP",
            "interest_rate_annual": 11.5,
            "tenure_months": 24,
            "max_amount": 600000.0,
            "processing_fee_pct": 1.2,
            "emi": 28142,
            "total_interest": 75408,
            "disbursement_days": 3,
            "min_score_required": 55,
            "features": ["Same-day approval", "No collateral up to ₹6L", "Flexible repayment"],
        },
        {
            "lender_name": "Partner National Bank",
            "lender_type": "BANK",
            "interest_rate_annual": 12.5,
            "tenure_months": 24,
            "max_amount": 600000.0,
            "processing_fee_pct": 1.5,
            "emi": 28368,
            "total_interest": 80832,
            "disbursement_days": 5,
            "min_score_required": 60,
            "features": ["Government-backed trust", "Priority sector lending", "Digital disbursement"],
        },
        {
            "lender_name": "Partner NBFC",
            "lender_type": "NBFC",
            "interest_rate_annual": 13.2,
            "tenure_months": 18,
            "max_amount": 600000.0,
            "processing_fee_pct": 2.0,
            "emi": 36770,
            "total_interest": 61860,
            "disbursement_days": 1,
            "min_score_required": 50,
            "features": ["Instant disbursement", "24-hour turnaround", "Top-up facility"],
        },
    ],
    "decision_trail": [
        {"stage": "consent_requested", "status": "complete", "detail": "AA consent APPROVED by applicant", "timestamp": "2024-06-30T13:10:00+05:30"},
        {"stage": "data_fetched", "status": "complete", "detail": "AA + GST data normalized (12 features)", "timestamp": "2024-06-30T13:10:03+05:30"},
        {"stage": "scored", "status": "complete", "detail": "XGBoost inference 12ms — Score 61 ADEQUATE", "timestamp": "2024-06-30T13:10:03+05:30"},
        {"stage": "xai_generated", "status": "complete", "detail": "Narrative cross-check PASSED", "timestamp": "2024-06-30T13:10:04+05:30"},
        {"stage": "offers_generated", "status": "complete", "detail": "3 OCEN loan offers received", "timestamp": "2024-06-30T13:10:05+05:30"},
        {"stage": "decision", "status": "complete", "detail": "STRAIGHT_THROUGH — Funds in 48 hours", "timestamp": "2024-06-30T13:10:05+05:30"},
    ],
}

DEMO_PERSONAS: list[dict[str, Any]] = [RAMESH, PRIYA, VIKRAM, ANITA, SURESH]

ALIAS_MAP: dict[str, str] = {
    "DEMO-P1": "APP-RAMESH",
    "DEMO-P2": "APP-PRIYA",
    "DEMO-P3": "APP-VIKRAM",
    "DEMO-P4": "APP-ANITA",
    "DEMO-P5": "APP-SURESH",
}


def get_persona_by_id(persona_id: str) -> dict[str, Any] | None:
    target_id = ALIAS_MAP.get(persona_id, persona_id)
    for p in DEMO_PERSONAS:
        if p["applicant"]["id"] == target_id:
            return p
    return None


def list_persona_summaries() -> list[dict[str, Any]]:
    """Return lightweight summaries for the dashboard."""
    return [
        {
            "id": p["applicant"]["id"],
            "business_name": p["applicant"]["business_name"],
            "city": p["applicant"]["city"],
            "industry": p["applicant"]["industry"],
            "score": p["score_result"]["score"],
            "tier": p["score_result"]["tier"],
            "has_bureau_record": p["applicant"]["has_bureau_record"],
            "is_synthetic": p["applicant"]["is_synthetic"],
        }
        for p in DEMO_PERSONAS
    ]
