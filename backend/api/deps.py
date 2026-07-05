"""ArthNiti — FastAPI dependencies.

Injectable dependencies for routes: DB session, LLM client, scoring core.
"""

from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.llm_client import LLMClient, get_llm_client
from backend.database.db import get_db

security = HTTPBearer()

def verify_api_key(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Simple shared API key for hackathon prototype (e.g. Bearer DEMO_SECRET_KEY_123)"""
    if credentials.credentials != "DEMO_SECRET_KEY_123":
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
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
