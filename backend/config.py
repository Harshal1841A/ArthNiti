"""ArthNiti application configuration.

All settings load from environment variables with sensible defaults for
local development. In production, every secret MUST be injected via env.

LLM primary: NVIDIA Nemotron Ultra via NVIDIA Integrate API.
LLM fallback: Google Gemma 4 31B via NVIDIA Integrate API.
"""

import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Immutable settings container."""

    # Database
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./data/arthniti.db",
    )

    # AA / Finvu sandbox
    FINVU_SANDBOX_BASE: str = os.environ.get(
        "FINVU_SANDBOX_BASE",
        "https://sandbox.finvu.in",
    )
    FIU_PRIVATE_KEY_JWK: str | None = os.environ.get("FIU_PRIVATE_KEY_JWK")

    # LLM — primary: NVIDIA Nemotron Ultra via NVIDIA Integrate API
    NVIDIA_API_KEY: str | None = os.environ.get("NVIDIA_API_KEY")
    NVIDIA_BASE_URL: str = os.environ.get(
        "NVIDIA_BASE_URL",
        "https://integrate.api.nvidia.com/v1",
    )
    NVIDIA_PRIMARY_MODEL: str = os.environ.get(
        "NVIDIA_PRIMARY_MODEL",
        "nvidia/nemotron-3-ultra-550b-a55b",
    )

    # LLM — fallback: Google Gemma 4 31B (NVIDIA Integrate API)
    # Note: This is NOT failover-redundant against an NVIDIA outage, just model-tier fallback (e.g., a context-length or rate-limit failure on the primary model).
    NVIDIA_FALLBACK_API_KEY: str | None = os.environ.get("NVIDIA_FALLBACK_API_KEY") or os.environ.get("NVIDIA_API_KEY")
    NVIDIA_FALLBACK_BASE_URL: str = os.environ.get(
        "NVIDIA_FALLBACK_BASE_URL",
        "https://integrate.api.nvidia.com/v1",
    )
    NVIDIA_FALLBACK_MODEL: str = os.environ.get(
        "NVIDIA_FALLBACK_MODEL",
        "google/gemma-4-31b-it",
    )

    # Bhashini TTS (F8 Arth-Mitra Tier 1) — optional, unconfirmed access.
    # Obtain at bhashini.gov.in. If absent, F8 uses IndicTTS then browser fallback.
    BHASHINI_API_KEY: str | None = os.environ.get("BHASHINI_API_KEY")

    # Scoring
    MODEL_PATH: str = os.environ.get(
        "MODEL_PATH",
        "./models/xgb_model.json",
    )
    USABLE_SCORE_THRESHOLD: float = float(
        os.environ.get("USABLE_SCORE_THRESHOLD", "0.30")
    )
    MIN_DATA_COMPLETENESS: float = float(
        os.environ.get("MIN_DATA_COMPLETENESS", "0.20")
    )

    # Demo mode — pre-loaded personas, mocked AA consent, instant scores
    DEMO_MODE: bool = os.environ.get("DEMO_MODE", "false").lower() == "true"

    # Frontend
    FRONTEND_URL: str = os.environ.get("FRONTEND_URL", "http://localhost:5173")


@lru_cache
def get_settings() -> Settings:
    return Settings()
