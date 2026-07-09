# ──────────────────────────────────────────────────────────────────────────────
# Stage 1 — Build React frontend
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /build

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

# VITE_API_KEY can be passed at build time if needed for external deployment:
# docker build --build-arg VITE_API_KEY=<key> .
# For same-origin deployments (like HF Spaces), no API key is required or baked into the JS bundle.
ARG VITE_API_KEY
ENV VITE_API_KEY=$VITE_API_KEY

RUN npm run build

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2 — Python runtime: API + static frontend served from one process
# ──────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim
WORKDIR /app

# Install system deps and Python packages in a single layer, then clean up
COPY requirements.txt .
RUN apt-get update && apt-get install -y --no-install-recommends gcc libffi-dev \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get purge -y --auto-remove gcc libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Application source
COPY backend/ ./backend/
COPY models/  ./models/
COPY data/    ./data/

# BUG-30 FIX: Ensure model exists at build time. Runs train_model.py (which auto-generates data if needed).
RUN python backend/train_model.py || true

# Pre-built React bundle from Stage 1
COPY --from=frontend-builder /build/dist ./frontend/dist

# SQLite data directory — writable by HF Spaces user 1000
RUN mkdir -p /app/data && chown -R 1000:1000 /app

# HF Spaces runs containers as non-root user 1000
USER 1000

# HF Spaces hard-requires port 7860
EXPOSE 7860

ENV DEMO_MODE=true
ENV DATABASE_URL=sqlite+aiosqlite:////app/data/arthniti.db
ENV MODEL_PATH=/app/models/xgb_model.json
ENV FRONTEND_URL=*

# BUG-28 NOTE: HF Spaces runs on ephemeral storage — /app/data is NOT persisted
# across container restarts. Every restart wipes the SQLite database and re-seeds
# demo personas. For production use, mount a persistent volume at /app/data or
# switch to a hosted Postgres instance and update DATABASE_URL accordingly.
#
# BUG-02 FIX: DEMO_MODE=true now bypasses verify_api_key entirely, so
# ARTHNITI_API_KEY is not required for demo deployments. Setting it here
# as empty string documents the intent; real deployments should override this
# with a strong secret via the HF Spaces "Secrets" settings panel.
ENV ARTHNITI_API_KEY=

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
