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
**MSME Financial Health Card using alternate data (GST, UPI/bank AA, EPFO) for NTC/NTB credit underwriting. Built for IDBI Innovate 2026.**

---

## Quickstart

```bash
git clone https://github.com/Harshal1841A/ArthNiti.git
cd ArthNiti
cp .env.example .env   # then fill in ARTHNITI_API_KEY, VITE_API_KEY (must match), NVIDIA_API_KEY
python backend/data/generate_synthetic_training_data.py --n 2000 --seed 42
python backend/train_model.py
uvicorn backend.main:app --reload
```

In a separate terminal, start the frontend dev server:

```bash
cd frontend && npm install && npm run dev
```

> **IMPORTANT: `ARTHNITI_API_KEY` is required, not optional, if `DEMO_MODE=true`.**  
> The backend server refuses to start if `DEMO_MODE=true` is set without configuring `ARTHNITI_API_KEY` (enforced by `backend/main.py`'s lifespan check). Both `ARTHNITI_API_KEY` on the backend and `VITE_API_KEY` on the frontend must be configured and match exactly. For full architectural details on fail-closed authentication and security boundaries, see [`docs/RISK_AND_COMPLIANCE.md`](file:///docs/RISK_AND_COMPLIANCE.md).

---

## Architecture Summary

- **Deterministic XGBoost + SHAP Scoring Core:** Real-time financial health scoring runs synchronously in single-digit milliseconds (`backend/core/scoring_engine.py`). There is **no LLM in the synchronous scoring path**.
- **Cross-Checked XAI Narrative:** An LLM (primary: NVIDIA Nemotron 3 Ultra; fallback: Google Gemma 4 31B) asynchronously drafts plain-language credit explanations after deterministic scoring completes. Every numeric claim in the narrative is automatically cross-checked against actual SHAP feature attributions before display (`backend/core/xai_narrative.py`).
- **Persona-Based Access Control:** Role boundaries across Admin, Credit Officer, and Borrower personas are enforced on every navigation by [`PersonaGuard`](file:///frontend/src/components/PersonaGuard.tsx) and [`ApplicantOwnershipGuard`](file:///frontend/src/components/PersonaGuard.tsx). A Borrower persona can only access and view their own linked dossier.
- **Honest Dashboard Failure States:** If live applicant data cannot load, the dashboard renders an honest error state (`frontend/src/pages/Dashboard.tsx`) rather than substituting fabricated placeholder data.

---

## Real vs. Stub Implementation Status

| Component | Status | Verification & Implementation Details |
| :--- | :--- | :--- |
| **Account Aggregator (AA)** | **Real** | Integrates with the Finvu sandbox following ReBIT specifications with ECDH/JWE decryption (`backend/adapters/aa_adapter.py`). |
| **XGBoost + SHAP Scoring** | **Real** | Trained XGBoost model with SHAP TreeExplainer feature attributions (`backend/core/scoring_engine.py`). |
| **XAI Narrative Generation** | **Real** | Asynchronous LLM generation with deterministic numeric cross-checking (`backend/core/xai_narrative.py`). |
| **OCEN Loan Offers** | **Real Math / Illustrative Lenders** | Real reducing-balance EMI and interest calculations (`_emi`, `_total_interest`), paired with illustrative lender identities (`backend/adapters/ocen_adapter.py`). |
| **Unified Lending Interface (ULI)** | **Spec-Compliant Stub** | Shaped to RBI ULI eligibility check specification; no public developer sandbox exists (`backend/adapters/uli_adapter.py`). |
| **Arth-Mitra Indic TTS** | **Real Synthesis** | Multilingual speech synthesis with an explicit server-side to browser fallback chain (`backend/core/arth_mitra.py`). |
| **Authentication & Access Gate** | **Real Shared-Token (Fail-Closed)** | Enforces bearer token verification on write routes and refuses startup if `DEMO_MODE=true` without a configured key (`backend/api/deps.py`, `backend/main.py`). |

---

## Testing & Verification

Run the verification suites directly from the repository root:

```bash
python scripts/test_prototype.py     # build gate — 7 checks
python -m pytest tests/ -q            # integration suite
python scripts/load_smoke_test.py     # load test
```

### Current Verified Pass Counts
- **`scripts/test_prototype.py`:** **7 / 7 checks passed** (Backend Syntax, Synthetic Dataset Generation, Feature Schema Consistency, Routing Logic, XAI Numeric Cross-Check, Data Completeness Gate, and Model AUC within target bounds).
- **`pytest tests/`:** **19 / 19 tests passed** covering API integration, authentication fail-closed rules, and data adapters.
- **`scripts/load_smoke_test.py`:** **50 / 50 requests passed** (100% pass rate under concurrent load against a running server).

---

## Known Limitations

- **Synthetic Training Data:** Synthetic-data AUC is not predictive of real-world underwriting performance. Validation against historical real-world borrower outcomes is the mandatory next project milestone.
- **Shared Demo Authentication:** The prototype uses a shared demo-scoped API key (`ARTHNITI_API_KEY`) rather than per-officer Role-Based Access Control (RBAC) tokens.
- **Sandbox Availability:** OCEN and ULI integrations are spec-compliant stubs pending official live sandbox credentials.

---

## Branding & Design System

ArthNiti uses the Midnight Ledger design token system (`noir` and `blanc` themes defined in `frontend/src/index.css`). Visual assets and logos are maintained in [`docs/branding/`](file:///docs/branding/).

---

## Links

- **Team:** Team Rocket
- **GitHub Repository:** [https://github.com/Harshal1841A/ArthNiti](https://github.com/Harshal1841A/ArthNiti)
- **Live Deployed Space:** [https://huggingface.co/spaces/NeuralHU/ArthNiti](https://huggingface.co/spaces/NeuralHU/ArthNiti)
