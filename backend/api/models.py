"""ArthNiti — Pydantic API models (request/response schemas).

All models enforce the contracts between frontend and backend.
"""

from typing import List, Optional

from pydantic import BaseModel, Field

from backend.core.feature_schema import DataSourceType


class ApplicantCreateRequest(BaseModel):
    business_name: str = Field(..., min_length=1)
    has_bureau_record: bool
    preferred_language: str = "en"


class ApplicantResponse(BaseModel):
    id: str
    business_name: str
    has_bureau_record: bool
    is_synthetic: bool
    preferred_language: str
    created_at: Optional[str]


class ConsentRequestPayload(BaseModel):
    applicant_id: str
    fi_types: List[str]
    purpose: str
    purpose_code: str


class ConsentStatusResponse(BaseModel):
    consent_handle: str
    status: str
    aa_provider: str


class ConsentListItem(BaseModel):
    consent_handle: str
    status: str
    aa_provider: str
    created_at: str


class ScoreResponse(BaseModel):
    score_id: str
    applicant_id: str
    score: int
    tier: str
    contributing_factors: List[dict]
    inference_ms: int
    data_completeness_pct: float
    is_synthetic_applicant: bool


class XAINarrativeResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    xai_id: str
    score_id: str
    narrative: str
    model_used: str
    cross_check_passed: bool
    unsupported_claims: List[str] = []


class RoutingResponse(BaseModel):
    score_id: str
    routing: str  # STRAIGHT_THROUGH | ENHANCED_REVIEW
    next_step: str
    requires_review: bool


class AdapterCoverageResponse(BaseModel):
    total_applicants: int
    applicants_without_bureau_record: int
    applicants_without_bureau_record_with_usable_score: int
    coverage_improvement_pct: float


class DecisionTrailStage(BaseModel):
    stage: str
    status: str  # complete | pending
    detail: str
    timestamp: Optional[str] = None


class DecisionTrailResponse(BaseModel):
    applicant_id: str
    stages: List[DecisionTrailStage]


class ArthMitraSpeakRequest(BaseModel):
    language: str
    demo_persona_id: Optional[str] = None


class ArthMitraSpeakResponse(BaseModel):
    audio_url: Optional[str] = None
    fallback_message: Optional[str] = None
    narrative_text: Optional[str] = None


class DocumentUploadStatusResponse(BaseModel):
    upload_id: str
    status: str  # processing | complete | failed
    data_completeness_pct: Optional[float] = None
    error_message: Optional[str] = None


class AdapterStatusItem(BaseModel):
    name: str
    state: str  # real | stub | unconfirmed
    label: str


class AdapterStatusResponse(BaseModel):
    adapters: List[AdapterStatusItem]


class ReviewQueueItem(BaseModel):
    review_id: str
    applicant_id: str
    score_id: str
    status: str
    assigned_officer: Optional[str] = None
    notes: Optional[str] = None
