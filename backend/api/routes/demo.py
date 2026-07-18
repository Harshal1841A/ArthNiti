from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.api.deps import get_db
from backend.api.models import ConsentStatusResponse, ScoreResponse
from backend.config import get_settings
from backend.data.demo_personas import ALIAS_MAP, DEMO_PERSONAS, get_persona_by_id, list_persona_summaries
from backend.database.models import AdapterFetchLog, Applicant, ConsentRecord, NormalizedFeatures, ReviewQueue, Score, XAINarrative
from backend.adapters.ocen_adapter import generate_offers_for_score
from backend.limiter import limiter
import asyncio
import json
from datetime import datetime, timedelta, timezone

router = APIRouter()
_settings = get_settings()
_seed_lock = asyncio.Lock()

# NOTE ON AUTH IN THIS FILE: every route below is gated by DEMO_MODE, not by
# verify_api_key like the real /api/v1/applicants, /consent, /score routes.
# This is intentional, not an oversight — this namespace only ever reads or
# writes clearly-labeled synthetic persona data and never calls the real
# Finvu or NVIDIA APIs, so the blast radius of leaving it key-free is low.
# Do not "fix" this by scattering verify_api_key onto individual routes here
# without also reconsidering whether DEMO_MODE should be disabled entirely
# on the public deployment instead.





# Realistic default synthetic features used when seeding a non-persona applicant
_SYNTHETIC_DEFAULT_FEATURES = {
    "avg_monthly_inflow": 95000.0,
    "inflow_volatility_coefficient": 0.41,
    "avg_closing_balance": 22000.0,
    "days_with_negative_balance_90d": 0,
    "existing_emi_to_inflow_ratio": 0.22,
    "bounce_count_90d": 0,
    "txn_count_30d": 68,
    "unique_counterparties_30d": 15,
    "payment_time_consistency_score": 0.85,
    "gst_filing_regularity_12mo": 0.90,
    "gst_turnover_yoy_growth": 0.06,
    "epfo_payroll_headcount_trend": None,
    "data_completeness_pct": 0.846,
    "had_bureau_record": False,
    "data_sources_used": ["aa_bank_statement", "gst_return"],
}


@router.post("/fetch/{applicant_id}")
@limiter.limit("30/minute")
async def demo_fetch_applicant(
    applicant_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Seed realistic synthetic NormalizedFeatures for any synthetic applicant.

    Used by the frontend 'Fetch AA Telemetry' button when the applicant is
    synthetic but not one of the named demo personas. Writes a NormalizedFeatures
    row so the standard /v1/score/{id} endpoint can run the XGBoost model.
    """
    if not _settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="DEMO_MODE required")

    target_id = ALIAS_MAP.get(applicant_id, applicant_id)
    applicant = await db.get(Applicant, target_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    if not applicant.is_synthetic:
        raise HTTPException(status_code=400, detail="This endpoint is only for synthetic applicants")

    # Idempotent — skip if features already exist
    result = await db.execute(
        select(NormalizedFeatures)
        .where(NormalizedFeatures.applicant_id == target_id)
        .order_by(NormalizedFeatures.computed_at.desc())
        .limit(1)
    )
    existing_nf = result.scalar_one_or_none()
    if existing_nf:
        return {
            "applicant_id": target_id,
            "features_id": existing_nf.id,
            "data_completeness_pct": existing_nf.data_completeness_pct,
            "already_exists": True,
        }

    feat = {**_SYNTHETIC_DEFAULT_FEATURES, "had_bureau_record": applicant.has_bureau_record}
    nf = NormalizedFeatures(
        applicant_id=target_id,
        data_sources_used=json.dumps(feat["data_sources_used"]),
        feature_vector_json=json.dumps({
            "applicant_id": target_id,
            **{k: v for k, v in feat.items() if k != "data_sources_used"},
            "data_sources_used": feat["data_sources_used"],
        }),
        data_completeness_pct=feat["data_completeness_pct"],
    )
    db.add(nf)

    # Also log the mocked fetch so the decision trail shows DATA_FETCHED
    fetch_log = AdapterFetchLog(
        applicant_id=target_id,
        adapter_type="aa_demo",
        is_mocked=True,
        fetch_status="SUCCESS",
        fields_populated_count=13,
    )
    db.add(fetch_log)
    await db.commit()
    await db.refresh(nf)

    return {
        "applicant_id": target_id,
        "features_id": nf.id,
        "data_completeness_pct": feat["data_completeness_pct"],
        "already_exists": False,
    }


async def seed_demo_personas_db(db: AsyncSession) -> int:
    """Core database seeding logic for demo personas and review queue items."""
    if not _settings.DEMO_MODE:
        return 0

    async with _seed_lock:

        # BUG-B7 FIX: Fast-path must also verify ReviewQueue rows exist for WATCH/HIGH_RISK
        # personas. Previously only Score existence was checked — a partial DB wipe could
        # leave scores intact but review queue empty, and this fast-path would return early
        # silently, leaving the underwriting queue always empty.
        persona_ids = [p["applicant"]["id"] for p in DEMO_PERSONAS]
        watch_high_risk_ids = [
            p["applicant"]["id"] for p in DEMO_PERSONAS
            if p["score_result"]["tier"] in ("WATCH", "HIGH_RISK") or p.get("routing", {}).get("requires_review")
        ]
        scores_res = await db.execute(
            select(func.count(func.distinct(Score.applicant_id))).where(Score.applicant_id.in_(persona_ids))
        )
        if scores_res.scalar() == len(DEMO_PERSONAS):
            # Verify review queue completeness too
            rq_res = await db.execute(
                select(func.count(func.distinct(ReviewQueue.applicant_id))).where(ReviewQueue.applicant_id.in_(watch_high_risk_ids))
            )
            if rq_res.scalar() >= len(watch_high_risk_ids):
                return len(DEMO_PERSONAS)

        for persona in DEMO_PERSONAS:
            app = persona["applicant"]
            feat = persona["features"]
            sc = persona["score_result"]

            # Upsert applicant
            existing = await db.get(Applicant, app["id"])
            if not existing:
                applicant = Applicant(
                    id=app["id"],
                    business_name=app["business_name"],
                    has_bureau_record=app["has_bureau_record"],
                    is_synthetic=app["is_synthetic"],
                    preferred_language=app["preferred_language"],
                )
                db.add(applicant)
                await db.commit()
                await db.refresh(applicant)

            # Upsert features
            result = await db.execute(
                select(NormalizedFeatures)
                .where(NormalizedFeatures.applicant_id == app["id"])
                .order_by(NormalizedFeatures.computed_at.desc())
                .limit(1)
            )
            nf = result.scalar_one_or_none()
            if not nf:
                nf = NormalizedFeatures(
                    applicant_id=app["id"],
                    data_sources_used=json.dumps([ds.value for ds in feat["data_sources_used"]]),
                    feature_vector_json=json.dumps({
                        "applicant_id": app["id"],
                        "data_sources_used": [ds.value for ds in feat["data_sources_used"]],
                        "avg_monthly_inflow": feat["avg_monthly_inflow"],
                        "inflow_volatility_coefficient": feat["inflow_volatility_coefficient"],
                        "avg_closing_balance": feat["avg_closing_balance"],
                        "days_with_negative_balance_90d": feat["days_with_negative_balance_90d"],
                        "existing_emi_to_inflow_ratio": feat["existing_emi_to_inflow_ratio"],
                        "bounce_count_90d": feat["bounce_count_90d"],
                        "txn_count_30d": feat["txn_count_30d"],
                        "unique_counterparties_30d": feat["unique_counterparties_30d"],
                        "payment_time_consistency_score": feat["payment_time_consistency_score"],
                        "gst_filing_regularity_12mo": feat["gst_filing_regularity_12mo"],
                        "gst_turnover_yoy_growth": feat["gst_turnover_yoy_growth"],
                        "epfo_payroll_headcount_trend": feat["epfo_payroll_headcount_trend"],
                        "had_bureau_record": feat["had_bureau_record"],
                        "data_completeness_pct": feat["data_completeness_pct"],
                    }),
                    data_completeness_pct=feat["data_completeness_pct"],
                )
                db.add(nf)
                await db.commit()
                await db.refresh(nf)

            # Upsert score
            result = await db.execute(
                select(Score).where(Score.applicant_id == app["id"]).order_by(Score.computed_at.desc()).limit(1)
            )
            score = result.scalar_one_or_none()
            if not score:
                score = Score(
                    applicant_id=app["id"],
                    normalized_features_id=nf.id,
                    score=sc["score"],
                    tier=sc["tier"],
                    contributing_factors_json=json.dumps(sc["contributing_factors"]),
                    inference_ms=sc["inference_ms"],
                    model_version=sc["model_version"],
                )
                db.add(score)
                await db.commit()
                await db.refresh(score)

            # Upsert XAI, AdapterFetchLog, ReviewQueue in one flush — avoids 3 serial commits per persona
            needs_commit = False

            result = await db.execute(
                select(XAINarrative).where(XAINarrative.score_id == score.id).limit(1)
            )
            if not result.scalar_one_or_none():
                db.add(XAINarrative(
                    score_id=score.id,
                    narrative=persona["xai_narrative"]["en"],
                    cross_check_passed=True,
                    unsupported_claims="[]",
                    model_used="demo_pre_generated",
                    generation_ms=0,
                ))
                needs_commit = True

            result = await db.execute(
                select(AdapterFetchLog).where(AdapterFetchLog.applicant_id == app["id"]).limit(1)
            )
            if not result.scalar_one_or_none():
                db.add(AdapterFetchLog(
                    applicant_id=app["id"],
                    adapter_type="aa_demo",
                    is_mocked=True,
                    fetch_status="SUCCESS",
                    fields_populated_count=13,
                ))
                needs_commit = True

            if sc["tier"] in ("WATCH", "HIGH_RISK") or persona.get("routing", {}).get("requires_review"):
                result = await db.execute(
                    select(ReviewQueue).where(ReviewQueue.applicant_id == app["id"]).limit(1)
                )
                if not result.scalar_one_or_none():
                    db.add(ReviewQueue(
                        applicant_id=app["id"],
                        score_id=score.id,
                        status="pending" if sc["tier"] == "WATCH" else "in_review",
                        notes=f"Auto-flagged by F9 Routing: {sc['tier']} risk profile.",
                    ))
                    needs_commit = True

            # Single commit for XAI + fetch log + review queue instead of 3 separate round-trips
            if needs_commit:
                await db.commit()

        return len(DEMO_PERSONAS)


@router.post("/seed")
@limiter.limit("10/minute")
async def seed_demo_data(request: Request, db: AsyncSession = Depends(get_db)):
    """Seed all 5 demo personas into the database."""
    if not _settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="DEMO_MODE must be enabled to seed demo data.")
    count = await seed_demo_personas_db(db)
    return {"seeded": count}


@router.get("/personas")
@limiter.limit("60/minute")
async def list_personas(request: Request):
    return list_persona_summaries()


@router.get("/personas/{persona_id}")
@limiter.limit("60/minute")
async def get_persona(persona_id: str, request: Request):
    persona = get_persona_by_id(persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    return persona


@router.post("/consent/{applicant_id}", response_model=ConsentStatusResponse)
@limiter.limit("60/minute")
async def demo_consent(
    applicant_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Instant ACTIVE consent in demo mode — bypasses real AA sandbox."""
    if not _settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="DEMO_MODE required")

    target_id = ALIAS_MAP.get(applicant_id, applicant_id)
    applicant = await db.get(Applicant, target_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    # Check if consent already exists
    result = await db.execute(
        select(ConsentRecord).where(ConsentRecord.applicant_id == target_id)
            .order_by(ConsentRecord.created_at.desc()).limit(1)
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.status = "ACTIVE"
        await db.commit()
        return ConsentStatusResponse(
            consent_handle=existing.consent_handle,
            status="ACTIVE",
            aa_provider="finvu_sandbox_demo",
        )

    consent_handle = f"DEMO-{target_id}-CONSENT"
    now = datetime.now(timezone.utc)
    record = ConsentRecord(
        applicant_id=target_id,
        aa_provider="finvu_sandbox_demo",
        consent_handle=consent_handle,
        fi_types_requested=json.dumps(["DEPOSIT"]),
        purpose="Demo mode pre-loaded data",
        purpose_code="101",
        status="ACTIVE",
        # BUG-23 FIX: These three NOT NULL columns were absent, causing IntegrityError
        # on every demo_consent call. A demo consent covers 180 days backward, expires in 7.
        data_range_from=now - timedelta(days=180),
        data_range_to=now,
        consent_expiry=now + timedelta(days=7),
    )
    db.add(record)
    await db.commit()

    return ConsentStatusResponse(
        consent_handle=consent_handle,
        status="ACTIVE",
        aa_provider="finvu_sandbox_demo",
    )


@router.post("/score/{applicant_id}", response_model=ScoreResponse)
@limiter.limit("30/minute")
async def demo_score(
    applicant_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Return pre-computed score for a demo persona."""
    if not _settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="DEMO_MODE required")

    target_id = ALIAS_MAP.get(applicant_id, applicant_id)
    persona = get_persona_by_id(target_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")

    # Return the pre-computed score result, but wrapped in the same response model
    sc = persona["score_result"]
    # Serialize features — convert DataSourceType enums to plain strings
    feat = persona["features"]
    features_serialized = {
        k: ([v.value if hasattr(v, "value") else v for v in val] if isinstance(val, list) else val)
        for k, val in feat.items()
    }
    return ScoreResponse(
        score_id=f"DEMO-SCORE-{target_id}",
        applicant_id=target_id,
        score=sc["score"],
        tier=sc["tier"],
        contributing_factors=sc["contributing_factors"],
        inference_ms=sc["inference_ms"],
        data_completeness_pct=persona["features"]["data_completeness_pct"],
        is_synthetic_applicant=True,
        features=features_serialized,
    )


@router.get("/offers/{applicant_id}")
@limiter.limit("60/minute")
async def demo_offers(
    applicant_id: str,
    request: Request,
):
    """Return pre-computed loan offers for a demo persona."""
    if not _settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="DEMO_MODE required")

    target_id = ALIAS_MAP.get(applicant_id, applicant_id)
    persona = get_persona_by_id(target_id)
    if not persona:
        offers = generate_offers_for_score(65, "ADEQUATE", amount_requested=500000.0)
        return {
            "applicant_id": target_id,
            "score": 65,
            "tier": "ADEQUATE",
            "offers": offers,
        }

    return {
        "applicant_id": target_id,
        "score": persona["score_result"]["score"],
        "tier": persona["score_result"]["tier"],
        "offers": persona["loan_offers"],
    }
