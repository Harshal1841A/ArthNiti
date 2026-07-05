---
title: ArthNiti
emoji: 💹
colorFrom: yellow
colorTo: green
sdk: docker
pinned: false
app_port: 7860
---

# ArthNiti

**AI/ML-Driven MSME Financial Health Card with AA/OCEN/ULI Integration**

IDBI Innovate 2026 — Track 03 (Financial Inclusion / Digital Lending / Credit Decisioning)

---

## What This Is

ArthNiti computes a multidimensional MSME Financial Health Score from alternate data (GST, UPI, AA bank statements, EPFO) for businesses that traditional bureau-based underwriting rejects. The score, its visualized strengths/risks breakdown, and a human-readable explanation are delivered through a real-time decisioning path with **no LLM in the synchronous path**.

## Architecture

```
AA Adapter (real sandbox) → Normalized Feature Schema → XGBoost + SHAP Core
OCEN Adapter (spec stub)                              → Score + Tier
ULI Adapter (spec stub)                               → XAI Narrative (LLM, async)
Document Fallback (LLM, async)                        → Arth-Mitra TTS
```

## Honest Integration Status

| Ecosystem | Status |
|---|---|
| **Account Aggregator (AA)** | **REAL** — Finvu sandbox, ReBIT-spec FIU integration |
| **OCEN** | Spec-compliant stub, mocked LSP traffic |
| **ULI** | Spec-compliant stub, no public sandbox |
| **GST/EPFO via AA** | Unconfirmed — verify FI-type availability in your sandbox |

## Quick Start

### 1. Install dependencies

```bash
cd arthniti
pip install -r requirements.txt
```

### 2. Generate synthetic training data

```bash
python backend/data/generate_synthetic_training_data.py --n 2000 --seed 42
```

### 3. Train the model

```bash
python backend/train_model.py
```

### 4. Run the build-critical test suite

```bash
python scripts/test_prototype.py
```

**This is a build failure if AUC is outside 0.68–0.85.** Do not proceed if this fails.

### 5. Run the backend

```bash
uvicorn backend.main:app --reload --port 8000
```

### 6. Run the frontend (separate terminal)

```bash
cd frontend
npm install
npm run dev
```

### 7. Or use Docker

```bash
docker-compose up --build
```

## Environment Variables

```bash
DATABASE_URL=sqlite+aiosqlite:///./data/arthniti.db
NVIDIA_API_KEY=your_nvidia_key           # Primary: NVIDIA Nemotron Ultra
NVIDIA_FALLBACK_API_KEY=your_gemma_key   # Fallback: Google Gemma 4 31B (Model-tier fallback)
BHASHINI_API_KEY=your_bhashini_key       # Optional — TTS fallback chain exists
FIU_PRIVATE_KEY_JWK=your_fiu_private_key # For AA JWE decryption
```

## Key Corrections from Brutal Audit (v1.4)

1. **Synthetic data generator FIXED** — labels now reflect REAL credit logic (weighted sum of features: bounce = -0.35, volatility = -0.25, GST regularity = +0.30, etc.) with controlled noise. AUC target: **0.72–0.78**. Below 0.68 = build failure. Above 0.85 = leakage flag.
2. **F10 (Counterparty Reputation Ratio) REMOVED** — built on a fundamental misunderstanding of AA data scope. ReBIT DEPOSIT schema includes `accountType` for the applicant's own accounts, not counterparties.
3. **Cross-check regex FIXED** — now handles negative SHAP values, decimals, and percentages correctly.
4. **Document upload TRULY ASYNC** — uses FastAPI `BackgroundTasks` with a status polling endpoint.
5. **F9 routing FIXED** — WATCH/HIGH_RISK routes to human officer review, not absurd document re-upload.
6. **Async SQLAlchemy** — all routes use `async def` with `AsyncSession`, no event loop blocking.
7. **LLM client interface DEFINED** — wraps OpenAI SDK for NVIDIA Nemotron Ultra primary + Google Gemma fallback.
8. **All 14 route handlers IMPLEMENTED** — none are stubs.
9. **SHAP shape guard** — handles binary classification return shape differences across versions.
10. **Minimum data completeness guard** — rejects scoring when `data_completeness_pct < 20%`.

## Project Structure

```
arthniti/
├── backend/
│   ├── core/           # Scoring engine, XAI, routing, TTS
│   ├── adapters/       # AA, OCEN, ULI, document fallback
│   ├── api/routes/     # 14 FastAPI route handlers
│   ├── database/       # Async SQLAlchemy models
│   ├── data/           # Synthetic data generator
│   ├── main.py         # FastAPI entry point
│   └── train_model.py  # XGBoost training script
├── frontend/           # React 18 + Vite + Tailwind
├── scripts/            # FIU key generation
├── docker-compose.yml
└── requirements.txt
```

## License

Hackathon project — for demonstration purposes.
