"""ArthNiti — FastAPI application entry point.

Initializes database, scoring core, and registers all routes.
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

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
    """Startup lifecycle manager."""
    _demo_mode = os.environ.get("DEMO_MODE", "").lower() in ("true", "1", "yes")
    _has_key = bool(os.environ.get("ARTHNITI_API_KEY") or os.environ.get("API_KEY"))
    _insecure_opt_in = os.environ.get("ARTHNITI_ALLOW_INSECURE_DEMO", "").lower() in ("true", "1", "yes")
    if _demo_mode and not _has_key and not _insecure_opt_in:
        raise RuntimeError(
            "\n\n"
            "REFUSING TO START: DEMO_MODE=true but no ARTHNITI_API_KEY is configured.\n"
            "This combination silently disables authentication on all write routes\n"
            "(see backend/api/deps.py). This is not a warning — the server will not\n"
            "start until you either:\n"
            "  1) set ARTHNITI_API_KEY to a real value (recommended, matches\n"
            "     VITE_API_KEY on the frontend), or\n"
            "  2) explicitly set ARTHNITI_ALLOW_INSECURE_DEMO=true if you understand\n"
            "     the risk and want the old fail-open behavior for local testing only.\n"
        )

    # Step 1: Table creation is fast (DDL only when tables don't exist)
    await init_db()

    # Step 1.5: Seed demo personas synchronously before serving requests (~15ms)
    # SQLite / StaticPool does not support background writes overlapping with
    # incoming API requests or test suites.
    if _settings.DEMO_MODE:
        logging.warning("DEMO_MODE: seeding synthetic MSME personas...")
        try:
            from backend.database.db import _AsyncSessionLocal as _session_maker
            from backend.api.routes.demo import seed_demo_personas_db
            async with _session_maker() as db_session:
                await seed_demo_personas_db(db_session)
            logging.info("Demo personas seeded successfully.")
        except Exception as exc:
            logging.exception("Seed failed: %s", exc)

    # Step 2: Start model load/train as a background task so uvicorn can
    # immediately start accepting HTTP connections.
    app.state.scoring_core = None  # 503 until model is ready

    async def _background_startup():
        """Run model load without blocking the HTTP accept loop."""

        # 2b: Train model if missing (CPU-bound → thread so event loop stays free)
        model_path = Path(_settings.MODEL_PATH)
        if not model_path.exists():
            logging.warning("Model not found at %s — training in background thread...", _settings.MODEL_PATH)
            try:
                from backend.train_model import main as train_model_main
                await asyncio.to_thread(train_model_main)
                logging.info("Model trained and saved.")
            except Exception as exc:
                logging.exception("Background model training failed: %s", exc)

        # 2c: Load the XGBoost model (disk I/O + unpickling → thread)
        try:
            core = await asyncio.to_thread(ScoringCore, _settings.MODEL_PATH)
            app.state.scoring_core = core
            logging.info("ScoringCore loaded — scoring endpoint now available.")
        except FileNotFoundError:
            logging.warning("Model file not found after training attempt. Scoring unavailable.")

    asyncio.create_task(_background_startup())

    yield
    # Shutdown: nothing to clean up for aiosqlite / XGBoost


app = FastAPI(
    title="ArthNiti",
    description="AI/ML-Driven MSME Financial Health Card with AA/OCEN/ULI Integration",
    version="1.4.0",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
# Register SlowAPI as ASGI middleware so per-route @limiter.limit decorators
# are evaluated for EVERY incoming request — not just routes that explicitly
# added the decorator. Without this line, slowapi is effectively disabled.
app.add_middleware(SlowAPIMiddleware)


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


# Static frontend SPA & asset serving
_DIST = Path(__file__).parent.parent / "frontend" / "dist"
if not _DIST.is_dir():
    _DIST = Path(__file__).parent / "static"

if _DIST.is_dir():
    _ASSETS = _DIST / "assets"
    if _ASSETS.is_dir():
        from starlette.staticfiles import StaticFiles as _SF
        from starlette.responses import Response as _R
        from starlette.types import Scope, Receive, Send

        class _ImmutableStaticFiles(_SF):
            """StaticFiles that forces Cache-Control: immutable on every response."""
            async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
                async def _send_with_cache(message):
                    if message["type"] == "http.response.start":
                        raw: list = message.get("headers", [])
                        filtered = [(k, v) for k, v in raw if k.lower() != b"cache-control"]
                        filtered.append((b"cache-control", b"public, max-age=31536000, immutable"))
                        message = {**message, "headers": filtered}
                    await send(message)
                await super().__call__(scope, receive, _send_with_cache)

        app.mount("/assets", _ImmutableStaticFiles(directory=str(_ASSETS)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        candidate = (_DIST / full_path).resolve()
        dist_resolved = _DIST.resolve()
        if candidate.is_relative_to(dist_resolved) and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(
            dist_resolved / "index.html",
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
        )
