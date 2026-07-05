"""ArthNiti — Adapter status route.

GET /api/v1/adapters/status  → List all adapter statuses
"""

from fastapi import APIRouter

from backend.api.models import AdapterStatusItem, AdapterStatusResponse

router = APIRouter()


@router.get("/status", response_model=AdapterStatusResponse)
async def get_adapter_status():
    """Return honest status of every adapter."""
    return AdapterStatusResponse(
        adapters=[
            AdapterStatusItem(
                name="Account Aggregator (Finvu sandbox)",
                state="real",
                label="REAL, connected — ReBIT-spec FIU integration",
            ),
            AdapterStatusItem(
                name="OCEN (Lender-side stub)",
                state="stub",
                label="SPEC-COMPLIANT, mocked LSP traffic — no public sandbox",
            ),
            AdapterStatusItem(
                name="ULI (Eligibility stub)",
                state="stub",
                label="SPEC-COMPLIANT, no public sandbox — 64 lenders onboarded via RBI process",
            ),
            AdapterStatusItem(
                name="GST via AA / EPFO via AA",
                state="unconfirmed",
                label="UNCONFIRMED — verify FI-type availability against your sandbox before demo",
            ),
        ]
    )
