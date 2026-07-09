"""ArthNiti — Tiered Review Routing (F9).

FIXED (v1.3 audit): WATCH / HIGH_RISK applicants are routed to HUMAN
OFFICER REVIEW (review_queue table), NOT to the document fallback path.
The document fallback path (F7) is exclusively for applicants with ZERO
structured data. Routing a scored applicant back to PDF upload was absurd.

STRONG / ADEQUATE  -> straight-through
WATCH / HIGH_RISK  -> enhanced review (human officer, not document fallback)
"""

from backend.config import get_settings

_settings = get_settings()


def route_decision(tier: str) -> dict:
    """Route purely on the Core's existing Risk Tier output.

    No new model, no new endpoint logic beyond this function.
    """
    if tier in ("STRONG", "ADEQUATE"):
        return {
            "routing": "STRAIGHT_THROUGH",
            "next_step": "show_score_immediately",
            "requires_review": False,
        }
    if tier == "HIGH_RISK":
        # BUG-07 FIX: HIGH_RISK must also require human review before adverse action.
        # Automatically rejecting without a review queue entry violates adverse action
        # notice requirements — the officer must confirm the decision.
        return {
            "routing": "ENHANCED_REVIEW",
            "next_step": "route_to_human_officer_for_adverse_action",
            "requires_review": True,
        }
    # WATCH tier
    return {
        "routing": "ENHANCED_REVIEW",
        "next_step": "route_to_human_officer",
        "requires_review": True,
    }
