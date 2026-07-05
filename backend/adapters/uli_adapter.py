"""ArthNiti — ULI Adapter: spec-compliant stub, no public sandbox.

ULI (RBI Innovation Hub) has no public developer sandbox. 64 lenders are
onboarded through RBI's own process. This stub proves the adapter SHAPE
is ready; it does not connect to a real ULI endpoint.
"""

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class ULIEligibilityCheckStub(BaseModel):
    applicant_id: str
    requested_loan_product: str


class ULIEligibilityResultStub(BaseModel):
    eligible: bool
    available_data_services: list[str]
    message: str


@router.post("/uli/v1/eligibility", response_model=ULIEligibilityResultStub)
async def check_eligibility_stub(req: ULIEligibilityCheckStub):
    """Returns a MOCKED result shaped like a real ULI eligibility response.

    No network call happens — there's nothing to call yet.
    """
    return ULIEligibilityResultStub(
        eligible=True,
        available_data_services=[
            "land_records",
            "gstn",
            "credit_bureau",
            "aa_deposit",
        ],
        message="Mocked ULI stub — no public sandbox exists. Ready to connect when IDBI is onboarded.",
    )
