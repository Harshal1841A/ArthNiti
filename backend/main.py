"""ArthNiti — FastAPI application entry point.

Initializes database, scoring core, and registers all routes.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
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
    """Startup: create tables, then yield immediately so HTTP is ready within ~100ms.

    Heavy work (DB seeding, model load) is offloaded to background asyncio tasks so
    the first request is not blocked. The scoring core becomes available within
    1-2 seconds on a warm container; graceful 503 is returned until then.
    """
    # Step 1: Table creation is fast (DDL only when tables don't exist)
    await init_db()

    # Step 2: Start seeding + model load as background tasks so uvicorn can
    # immediately start accepting HTTP connections. Previously these ran serially
    # here, blocking the event loop for 3-8 seconds on every cold start.
    app.state.scoring_core = None  # 503 until model is ready

    async def _background_startup():
        """Run seed + model load without blocking the HTTP accept loop."""
        # 2a: Seed demo personas (async DB writes)
        if _settings.DEMO_MODE:
            logging.warning("DEMO_MODE: seeding synthetic MSME personas in background...")
            try:
                from backend.database.db import _AsyncSessionLocal as _session_maker
                from backend.api.routes.demo import seed_demo_personas_db
                async with _session_maker() as db_session:
                    await seed_demo_personas_db(db_session)
                logging.info("Demo personas seeded successfully.")
            except Exception as exc:
                logging.exception("Background seed failed: %s", exc)

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
#
# /assets/* → StaticFiles mount (bypasses Python event loop entirely; served
#             directly by Starlette's file handler with immutable cache headers)
# everything else → SPA fallback (returns index.html for React Router routes)
# ──────────────────────────────────────────────────────────────────────────────
_DIST = Path(__file__).parent.parent / "frontend" / "dist"

if _DIST.is_dir():
    _ASSETS = _DIST / "assets"
    if _ASSETS.is_dir():
        # Mount /assets as a true static directory — this bypasses the async
        # event loop for every JS/CSS/font request, which is the single biggest
        # latency win for asset serving vs the previous FileResponse catch-all.
        # Starlette's StaticFiles sets ETags automatically; we add immutable
        # Cache-Control via a tiny wrapper so hashed filenames cache forever.
        from starlette.staticfiles import StaticFiles as _SF
        from starlette.responses import Response as _R
        from starlette.types import Scope, Receive, Send

        class _ImmutableStaticFiles(_SF):
            """StaticFiles that forces Cache-Control: immutable on every response."""
            async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
                async def _send_with_cache(message):
                    if message["type"] == "http.response.start":
                        headers = dict(message.get("headers", []))
                        headers[b"cache-control"] = b"public, max-age=31536000, immutable"
                        message = {**message, "headers": list(headers.items())}
                    await send(message)
                await super().__call__(scope, receive, _send_with_cache)

        app.mount("/assets", _ImmutableStaticFiles(directory=str(_ASSETS)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        """Serve static root files or fall back to index.html for SPA routes.

        /assets/* is already handled by the StaticFiles mount above.
        This handler covers: favicon.ico, robots.txt, and all React Router paths.
        """
        candidate = (_DIST / full_path).resolve()
        dist_resolved = _DIST.resolve()
        if candidate.is_relative_to(dist_resolved) and candidate.is_file():
            return FileResponse(candidate)
        # SPA fallback: must-revalidate so new deploys are picked up immediately
        return FileResponse(
            dist_resolved / "index.html",
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
        )
