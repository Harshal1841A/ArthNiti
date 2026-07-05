"""ArthNiti — Integration Test Suite (Task 7).

Tests the live FastAPI application via TestClient. Covers:
- Demo persona endpoints
- Health check
- Applicant creation (auth-gated)
- Score routing correctness
- XAI endpoint existence

Run: python -m pytest tests/test_api_integration.py -v
"""

import pytest
from fastapi.testclient import TestClient

# Use a real in-memory SQLite DB for tests
import os
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("DEMO_MODE", "true")
os.environ.setdefault("API_KEY", "DEMO_SECRET_KEY_123")
os.environ.setdefault("NVIDIA_API_KEY", "test-key")

from backend.main import app  # noqa: E402 — env must be set first

DEMO_KEY = "Bearer DEMO_SECRET_KEY_123"


@pytest.fixture(scope="module")
def client():
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


# ─────────────────────────────────────────
# Health / root
# ─────────────────────────────────────────

def test_health_check(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") in ("ok", "healthy")


# ─────────────────────────────────────────
# Demo persona endpoints (no auth required)
# ─────────────────────────────────────────

def test_list_demo_personas(client):
    resp = client.get("/api/v1/demo/personas")
    assert resp.status_code == 200
    personas = resp.json()
    assert isinstance(personas, list)
    assert len(personas) == 5, f"Expected 5 personas, got {len(personas)}"
    ids = [p["id"] for p in personas]
    assert "APP-RAMESH" in ids
    assert "APP-PRIYA" in ids
    assert "APP-VIKRAM" in ids
    assert "APP-ANITA" in ids
    assert "APP-SURESH" in ids


def test_get_ramesh_persona(client):
    resp = client.get("/api/v1/demo/personas/APP-RAMESH")
    assert resp.status_code == 200
    data = resp.json()
    assert data["applicant"]["id"] == "APP-RAMESH"
    assert data["score_result"]["tier"] == "ADEQUATE"
    assert data["routing"]["routing"] == "STRAIGHT_THROUGH"
    assert data["score_result"]["inference_ms"] == 12


def test_get_priya_persona(client):
    resp = client.get("/api/v1/demo/personas/APP-PRIYA")
    assert resp.status_code == 200
    data = resp.json()
    assert data["score_result"]["tier"] == "STRONG"
    assert data["routing"]["routing"] == "STRAIGHT_THROUGH"
    assert data["routing"]["requires_review"] is False


def test_vikram_watch_tier_routes_to_enhanced_review(client):
    """WATCH tier persona must route to ENHANCED_REVIEW, not STRAIGHT_THROUGH."""
    resp = client.get("/api/v1/demo/personas/APP-VIKRAM")
    assert resp.status_code == 200
    data = resp.json()
    assert data["score_result"]["tier"] == "WATCH"
    assert data["routing"]["routing"] == "ENHANCED_REVIEW"
    assert data["routing"]["requires_review"] is True


def test_anita_high_risk_tier_routes_to_reject(client):
    """HIGH_RISK persona must route to REJECT, not ENHANCED_REVIEW."""
    resp = client.get("/api/v1/demo/personas/APP-ANITA")
    assert resp.status_code == 200
    data = resp.json()
    assert data["score_result"]["tier"] == "HIGH_RISK"
    assert data["routing"]["routing"] == "REJECT"
    assert data["routing"]["requires_review"] is False


def test_missing_persona_returns_404(client):
    resp = client.get("/api/v1/demo/personas/APP-DOES-NOT-EXIST")
    assert resp.status_code == 404


# ─────────────────────────────────────────
# Auth enforcement
# ─────────────────────────────────────────

def test_create_applicant_requires_auth(client):
    """POST /applicants must reject unauthenticated requests."""
    resp = client.post("/api/v1/applicants", json={
        "business_name": "Test Corp",
        "has_bureau_record": False,
        "preferred_language": "en",
    })
    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"


def test_create_applicant_with_valid_auth(client):
    resp = client.post(
        "/api/v1/applicants",
        json={
            "business_name": "Integration Test Corp",
            "has_bureau_record": False,
            "preferred_language": "en",
        },
        headers={"Authorization": DEMO_KEY},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["business_name"] == "Integration Test Corp"
    assert "id" in data


def test_create_applicant_with_wrong_key(client):
    resp = client.post(
        "/api/v1/applicants",
        json={"business_name": "Bad Actor", "has_bureau_record": False},
        headers={"Authorization": "Bearer WRONG_KEY"},
    )
    # HTTPBearer returns 401 for bad token, 403 for missing header
    assert resp.status_code in (401, 403)


# ─────────────────────────────────────────
# Score routing — deterministic via routing.py
# ─────────────────────────────────────────

def test_routing_endpoint_strong():
    from backend.core.routing import route_decision
    r = route_decision("STRONG")
    assert r["routing"] == "STRAIGHT_THROUGH"
    assert r["requires_review"] is False


def test_routing_endpoint_adequate():
    from backend.core.routing import route_decision
    r = route_decision("ADEQUATE")
    assert r["routing"] == "STRAIGHT_THROUGH"
    assert r["requires_review"] is False


def test_routing_endpoint_watch():
    from backend.core.routing import route_decision
    r = route_decision("WATCH")
    assert r["routing"] == "ENHANCED_REVIEW"
    assert r["requires_review"] is True


def test_routing_endpoint_high_risk():
    from backend.core.routing import route_decision
    r = route_decision("HIGH_RISK")
    assert r["routing"] == "REJECT"
    assert r["requires_review"] is False


# ─────────────────────────────────────────
# XAI narrative cross-check — deterministic
# ─────────────────────────────────────────

def test_xai_cross_check_passes_for_truthful_narrative():
    from backend.core.xai_narrative import cross_check_narrative
    score_result = {
        "score": 72,
        "contributing_factors": [
            {"feature": "avg_monthly_inflow", "shap_value": 0.1423},
        ],
    }
    narrative = "The score is 72. avg_monthly_inflow contributed 0.1423 SHAP."
    result = cross_check_narrative(narrative, score_result)
    assert result["passed"] is True


def test_xai_cross_check_fails_for_hallucinated_number():
    from backend.core.xai_narrative import cross_check_narrative
    score_result = {
        "score": 72,
        "contributing_factors": [
            {"feature": "avg_monthly_inflow", "shap_value": 0.1423},
        ],
    }
    narrative = "The score is 72. The applicant has 500 employees and earns 999 lakhs."
    result = cross_check_narrative(narrative, score_result)
    assert result["passed"] is False
    assert len(result["unsupported_claims"]) > 0
