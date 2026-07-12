"""ArthNiti — FastAPI dependencies.

Injectable dependencies for routes: DB session, LLM client, scoring core.
"""

import os
from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.llm_client import LLMClient, get_llm_client
from backend.database.db import get_db

__all__ = [
    "get_db",
    "get_llm_client",
    "LLMClient",
    "AsyncSession",
    "verify_api_key",
    "get_scoring_core",
]

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
    expected_key = os.environ.get("ARTHNITI_API_KEY") or os.environ.get("API_KEY")
    demo_mode = os.environ.get("DEMO_MODE", "").lower() in ("true", "1", "yes")
    insecure_demo_opt_in = os.environ.get("ARTHNITI_ALLOW_INSECURE_DEMO", "").lower() in ("true", "1", "yes")

    # This fail-open path now requires an explicit, separate, loudly-named
    # opt-in (ARTHNITI_ALLOW_INSECURE_DEMO) rather than triggering implicitly
    # whenever DEMO_MODE is on and a key happens to be missing. The implicit
    # version was reachable by simply following this project's own shipped
    # .env template (which sets VITE_API_KEY but not ARTHNITI_API_KEY) —
    # verified live: a bare curl with zero auth header created a real record.
    # main.py's startup check also refuses to boot at all in that
    # configuration unless this flag is set, so this branch should only ever
    # be reached by someone who deliberately typed this exact variable name.
    if demo_mode and not expected_key and insecure_demo_opt_in:
        return "demo"

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
