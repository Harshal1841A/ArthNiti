"""ArthNiti database models — async SQLAlchemy, strict DAG, no FK cycles.

Every table references strictly downstream. No back-references anywhere.

FIXED (v1.4):
- onupdate uses func.now() instead of unreliable lambda
- Removed contradictory back_populates on Score/XAINarrative (docstring said no back-references)
- fields_populated_count explicitly nullable for FAILED logs
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Boolean,
    func,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def generate_id(prefix: str) -> str:
    # BUG-01 FIX: use .hex (no hyphens) and take 12 chars for ~281 trillion unique IDs per prefix.
    # Old: str(uuid4())[:8] sliced a hyphenated string giving only 16M unique values — collision-prone.
    return f"{prefix}-{uuid.uuid4().hex[:12].upper()}"


# ---------------------------------------------------------------------------
# 1. Applicants (root)
# ---------------------------------------------------------------------------
class Applicant(Base):
    __tablename__ = "applicants"

    id = Column(String, primary_key=True, default=lambda: generate_id("APP"))
    business_name = Column(String, nullable=False)
    has_bureau_record = Column(Boolean, nullable=False)
    is_synthetic = Column(Boolean, nullable=False, default=True)
    preferred_language = Column(String, default="en")
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


# ---------------------------------------------------------------------------
# 2. Consent records (AA only)
# ---------------------------------------------------------------------------
class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id = Column(String, primary_key=True, default=lambda: generate_id("CON"))
    applicant_id = Column(
        String, ForeignKey("applicants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    aa_provider = Column(String, nullable=False)
    consent_handle = Column(String, nullable=False, unique=True)
    fi_types_requested = Column(Text, nullable=False)  # JSON array
    purpose = Column(String, nullable=False)
    purpose_code = Column(String, nullable=False)
    status = Column(String, nullable=False, default="PENDING")
    data_range_from = Column(DateTime(timezone=True), nullable=False)
    data_range_to = Column(DateTime(timezone=True), nullable=False)
    consent_expiry = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


# ---------------------------------------------------------------------------
# 3. Adapter fetch logs (audit trail)
# ---------------------------------------------------------------------------
class AdapterFetchLog(Base):
    __tablename__ = "adapter_fetch_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    applicant_id = Column(
        String, ForeignKey("applicants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    adapter_type = Column(String, nullable=False)
    consent_record_id = Column(
        String, ForeignKey("consent_records.id", ondelete="SET NULL")
    )
    is_mocked = Column(Boolean, nullable=False)
    fetch_status = Column(String, nullable=False)  # SUCCESS | FAILED | PARTIAL
    fields_populated_count = Column(Integer, nullable=True)
    fetched_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


# ---------------------------------------------------------------------------
# 4. Normalized features (append-only)
# ---------------------------------------------------------------------------
class NormalizedFeatures(Base):
    __tablename__ = "normalized_features"

    id = Column(String, primary_key=True, default=lambda: generate_id("FEAT"))
    applicant_id = Column(
        String, ForeignKey("applicants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    data_sources_used = Column(Text, nullable=False)  # JSON array
    feature_vector_json = Column(Text, nullable=False)
    data_completeness_pct = Column(Float, nullable=False)
    computed_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


# ---------------------------------------------------------------------------
# 5. Scores (one per scoring run)
# ---------------------------------------------------------------------------
class Score(Base):
    __tablename__ = "scores"

    id = Column(String, primary_key=True, default=lambda: generate_id("SCORE"))
    applicant_id = Column(
        String, ForeignKey("applicants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    normalized_features_id = Column(
        String, ForeignKey("normalized_features.id", ondelete="CASCADE"), nullable=False
    )
    score = Column(Integer, nullable=False)
    tier = Column(String, nullable=False)
    contributing_factors_json = Column(Text, nullable=False)
    inference_ms = Column(Integer)
    model_version = Column(String, nullable=False)
    computed_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    __table_args__ = (
        CheckConstraint("score >= 0 AND score <= 100", name="ck_score_range"),
    )


# ---------------------------------------------------------------------------
# 6. XAI narratives (never references back to score)
# ---------------------------------------------------------------------------
class XAINarrative(Base):
    __tablename__ = "xai_narratives"

    id = Column(String, primary_key=True, default=lambda: generate_id("XAI"))
    score_id = Column(
        String, ForeignKey("scores.id", ondelete="CASCADE"), nullable=False, index=True
    )
    narrative = Column(Text, nullable=False)
    model_used = Column(String, nullable=False)
    cross_check_passed = Column(Boolean, nullable=False)
    unsupported_claims = Column(Text)  # JSON array
    generation_ms = Column(Integer)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


# ---------------------------------------------------------------------------
# 7. Stub interaction logs (OCEN / ULI)
# ---------------------------------------------------------------------------
class StubInteractionLog(Base):
    __tablename__ = "stub_interaction_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    adapter_type = Column(String, nullable=False)  # 'ocen_stub' | 'uli_stub'
    applicant_id = Column(
        String, ForeignKey("applicants.id", ondelete="SET NULL"), index=True
    )
    payload_summary = Column(Text)
    occurred_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


# ---------------------------------------------------------------------------
# 8. Document uploads (F7 — async processing)
# ---------------------------------------------------------------------------
class DocumentUpload(Base):
    __tablename__ = "document_uploads"

    id = Column(String, primary_key=True, default=lambda: generate_id("DOC"))
    applicant_id = Column(
        String, ForeignKey("applicants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filename = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    status = Column(
        String,
        nullable=False,
        default="processing",
    )
    data_completeness_pct = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)


# ---------------------------------------------------------------------------
# 9. Review queue (F9 — WATCH/HIGH_RISK human review)
# ---------------------------------------------------------------------------
class ReviewQueue(Base):
    """Human review queue for WATCH / HIGH_RISK applicants.

    NOT the document fallback path. F9 routes structured-data applicants
    with risky scores to human officer review, not to re-uploading PDFs.
    """

    __tablename__ = "review_queue"

    id = Column(String, primary_key=True, default=lambda: generate_id("REV"))
    applicant_id = Column(
        String, ForeignKey("applicants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    score_id = Column(
        String, ForeignKey("scores.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status = Column(
        String, nullable=False, default="pending"
    )  # pending | in_review | approved | rejected
    assigned_officer = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
