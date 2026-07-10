"""ArthNiti — FastAPI application entry point.

Initializes database, scoring core, and registers all routes.
"""

from contextlib import asynccontextmanager

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from backend.config import get_settings
from backend.core.scoring_engine import ScoringCore
from backend.database.db import init_db
from backend.limiter import limiter
from backend.api.routes import (
    adapters,
    applicants,
    arth_mitra,
    consent,
    coverage,
    decision_trail,
    documents,
    offers,
    reviews,
    routing as routing_routes,
    scores,
    xai,
)
from backend.adapters.ocen_adapter import router as ocen_router
from backend.adapters.uli_adapter import router as uli_router
from backend.api.routes import demo

_settings = get_settings()

# Rate limiter: 60 requests per minute per IP


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables, load scoring model. Shutdown: cleanup."""
    await init_db()

    if _settings.DEMO_MODE:
        import logging
        logging.warning("=" * 60)
        logging.warning("WARNING: DEMO_MODE is enabled. Auto-seeding synthetic MSME personas...")
        logging.warning("DEMO_MODE gates /api/v1/demo/* for persona seeding. Real AA sandbox is still hit.")
        logging.warning("=" * 60)
        print("=" * 60)
        print("WARNING: DEMO_MODE is enabled. Auto-seeding synthetic MSME personas...")
        print("DEMO_MODE gates /api/v1/demo/* for persona seeding. Real AA sandbox is still hit.")
        print("=" * 60)
        try:
            from backend.database.db import _AsyncSessionLocal as async_session_maker
            from backend.api.routes.demo import seed_demo_personas_db
            async with async_session_maker() as db_session:
                await seed_demo_personas_db(db_session)
            logging.info("Successfully auto-seeded demo personas into database on startup!")
            print("Successfully auto-seeded demo personas into database on startup!")
        except Exception as e:
            logging.exception("Failed to auto-seed demo personas on startup: %s", e)
            print(f"Failed to auto-seed demo personas on startup: {e}")

    # BUG-30 FIX: Ensure scoring model exists. Run train_model.py if model not present.
    model_path = Path(_settings.MODEL_PATH)
    if not model_path.exists():
        import logging
        logging.warning("Model not found at %s. Running train_model.py on startup...", _settings.MODEL_PATH)
        try:
            from backend.train_model import main as train_model_main
            train_model_main()
            logging.info("Model successfully trained and saved on startup!")
        except Exception as e:
            logging.exception("Failed to auto-train model on startup: %s", e)

    try:
        app.state.scoring_core = ScoringCore(_settings.MODEL_PATH)
    except FileNotFoundError:
        import logging
        logging.warning(
            f"Model not found at {_settings.MODEL_PATH}. "
            f"Run `python backend/train_model.py` before scoring."
        )
        app.state.scoring_core = None

    yield
    # Shutdown cleanup (if any)


app = FastAPI(
    title="ArthNiti",
    description="AI/ML-Driven MSME Financial Health Card with AA/OCEN/ULI Integration",
    version="1.4.0",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# CORS — wildcard origin disables credentials (cookie-based auth); Bearer token is unaffected.
_cors_origins = ["*"] if _settings.FRONTEND_URL == "*" else [_settings.FRONTEND_URL]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=(_settings.FRONTEND_URL != "*"),
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
)


# Global exception handler to prevent stack trace leaks
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import logging
    logging.exception("Unhandled exception")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error."},
    )


# Register all routes
app.include_router(applicants.router, prefix="/api/v1/applicants", tags=["Applicants"])
app.include_router(consent.router, prefix="/api/v1/consent", tags=["Consent"])
app.include_router(adapters.router, prefix="/api/v1/adapters", tags=["Adapters"])
app.include_router(scores.router, prefix="/api/v1/score", tags=["Scores"])
app.include_router(xai.router, prefix="/api/v1/xai", tags=["XAI"])
app.include_router(routing_routes.router, prefix="/api/v1/routing", tags=["Routing"])
app.include_router(decision_trail.router, prefix="/api/v1/decision-trail", tags=["Decision Trail"])
app.include_router(arth_mitra.router, prefix="/api/v1/arth-mitra", tags=["Arth-Mitra"])
app.include_router(coverage.router, prefix="/api/v1/coverage-stats", tags=["Coverage"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(reviews.router, prefix="/api/v1/reviews", tags=["Reviews"])
app.include_router(ocen_router, prefix="/api/v1/ocen", tags=["OCEN"])
app.include_router(uli_router, prefix="/api/v1/uli", tags=["ULI"])
app.include_router(demo.router, prefix="/api/v1/demo", tags=["Demo"])
app.include_router(offers.router, prefix="/api/v1/offers", tags=["Offers"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.4.0"}


# ──────────────────────────────────────────────────────────────────────────────
# Static frontend — must be registered LAST so API routes take priority.
# Serves the pre-built React bundle; the catch-all returns index.html for
# all client-side routes (React Router handles navigation client-side).
# ──────────────────────────────────────────────────────────────────────────────
_DIST = Path(__file__).parent.parent / "frontend" / "dist"

if _DIST.is_dir():
    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        """Serve static assets directly; fall back to index.html for SPA routes.

        Cache strategy:
        - Hashed asset files (JS/CSS in /assets/) → Cache-Control: immutable, 1 year
          Their filenames change when content changes so it is safe to cache forever.
        - index.html and everything else → Cache-Control: no-cache
          Must always be re-validated so the browser picks up new asset hashes.
        """
        candidate = (_DIST / full_path).resolve()
        dist_resolved = _DIST.resolve()
        if candidate.is_relative_to(dist_resolved) and candidate.is_file():
            # Hashed assets: safe to cache for 1 year (immutable)
            if full_path.startswith("assets/"):
                return FileResponse(
                    candidate,
                    headers={"Cache-Control": "public, max-age=31536000, immutable"},
                )
            return FileResponse(candidate)
        # SPA fallback: always re-validate so new deploys are picked up
        return FileResponse(
            dist_resolved / "index.html",
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
        )
