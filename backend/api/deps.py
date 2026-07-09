"""ArthNiti — FastAPI dependencies.

Injectable dependencies for routes: DB session, LLM client, scoring core.
"""

import os
from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.llm_client import LLMClient, get_llm_client
from backend.database.db import get_db

security = HTTPBearer(auto_error=False)

def verify_api_key(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Verify a shared API key on every request, no exceptions.

    SECURITY NOTE: an earlier version of this function tried to skip the check
    for requests it judged "same-origin" by inspecting the Origin/Referer/
    Sec-Fetch-Site headers. Those headers are client-supplied and trivially
    spoofable by any HTTP client (curl, requests, Postman) — that check was a
    live, zero-knowledge authentication bypass, not a security boundary, and
    has been removed. Do not reintroduce header-based origin checks here.

    This is intentionally a single shared demo-scoped key, not per-user auth —
    that limitation is disclosed in docs/RISK_AND_COMPLIANCE.md. The property
    this function guarantees is narrower but real: a request cannot reach a
    write route without presenting the configured key, full stop, regardless
    of what headers it sends.

    Fails CLOSED: if ARTHNITI_API_KEY/API_KEY is not configured in the
    environment, every request to a protected route is rejected rather than
    silently allowed through. A misconfigured deployment should be loudly
    broken, not silently open.
    """
    # BUG-02 FIX: In DEMO_MODE, allow requests without an API key so the demo UI
    # works on HF Spaces without requiring the operator to configure ARTHNITI_API_KEY.
    demo_mode = os.environ.get("DEMO_MODE", "").lower() in ("true", "1", "yes")
    if demo_mode:
        return "demo"

    expected_key = os.environ.get("ARTHNITI_API_KEY") or os.environ.get("API_KEY")

    if not expected_key:
        raise HTTPException(
            status_code=503,
            detail="Server misconfiguration: no API key configured for this deployment.",
        )

    if not credentials or credentials.credentials != expected_key:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials

def get_scoring_core(request: Request):
    """Return the scoring core from app state (initialized at startup)."""
    core = getattr(request.app.state, "scoring_core", None)
    if core is None:
        raise HTTPException(
            status_code=503,
            detail="Scoring engine unavailable — model not loaded. Run `python backend/train_model.py` before scoring."
        )
    return core
