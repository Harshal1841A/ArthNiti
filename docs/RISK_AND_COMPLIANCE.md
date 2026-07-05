# Risk and Compliance Statement

*Version: Prototype v1.4*

This document outlines the risk management, compliance boundaries, and data minimization practices implemented in the ArthNiti v1.4 prototype. It is not an exhaustive legal or security audit, but rather an honest accounting of how we currently handle privacy, explainability, and risk routing.

## 1. Consent Lifecycle
- **AA Consent Request:** The platform requests explicit consent via the Account Aggregator (AA) framework (Finvu Sandbox). Consent status is tracked in `ConsentRecord.status`.
- **Revocation:** If an applicant revokes consent, their AA data fetching is immediately halted. Current prototype handles `REVOKED` states gracefully by blocking new data ingestion.
- **Data Retention:** Decrypted Financial Information (FI) payloads are **never logged**. Once normalized into the feature vector (`NormalizedFeatures`), the raw JSON bank statements and transaction-level details are discarded from memory. 
- *Note:* The `aa_adapter.py` explicitly processes and maps raw data without persisting PII or raw transaction logs to the database.

## 2. Human-in-the-Loop (HITL) Routing
ArthNiti does not rely solely on automated decision-making. The `routing.py` module strictly enforces manual underwriting for riskier profiles:
- **STRONG / ADEQUATE:** Eligible for `STRAIGHT_THROUGH` processing.
- **WATCH / HIGH_RISK:** Immediately routed to `ENHANCED_REVIEW`. A human credit officer must review the dossier, SHAP narrative, and raw features to issue a final "approved" or "rejected" decision.

## 3. Model Governance & Explainability
- **Training Gate:** The core model (`scoring_engine.py`) requires an AUC between 0.68 and 0.85 on our evaluation sets. If AUC exceeds 0.85, the build fails to prevent data leakage or overfitting, ensuring honest generalization.
- **Explainability (XAI):** We use SHAP (SHapley Additive exPlanations) to provide feature-level attribution for every score. 
- **Fact-Checked Narratives:** The LLM generates a human-readable explanation from the SHAP values. Crucially, `xai_narrative.py` includes a deterministic cross-check (`cross_check_narrative`) to ensure the LLM does not hallucinate numbers or cite factors absent from the SHAP payload.

## 4. Current Prototype Limitations (Out of Scope)
The following are **not** implemented in this v1.4 prototype and would be required for a production-grade system:
- **Comprehensive DPDP Audit:** Data retention schedules and right-to-be-forgotten deletion workflows are stubbed.
- **Penetration Testing:** The application has not undergone formal external security testing.
- **Production IAM:** The current system uses a simplified shared API key for demonstration purposes. Production would require role-based access control (RBAC) via OAuth2/JWTs for individual credit officers.
- **Live LSP Connectivity:** Loan offers are currently illustrative stubs to demonstrate the OCEN protocol flow.
