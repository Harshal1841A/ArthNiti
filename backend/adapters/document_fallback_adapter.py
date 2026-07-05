"""ArthNiti — Document Fallback Adapter (F7).

For applicants with ZERO structured data sources. Credit officer uploads a
PDF or plain-text file. This path is explicitly async and lower-confidence.

FIXED (v1.3 audit): The upload route handler uses BackgroundTasks so this
is truly async. The adapter itself (parse_document_to_features) is still
synchronous-blocking relative to the LLM call, but it runs in a background
task from the FastAPI route.
"""

import io
import json
import re

import pdfplumber
from fastapi import UploadFile

from backend.core.feature_schema import DataSourceType, NormalizedApplicantFeatures
from backend.core.llm_client import LLMClient

EXTRACTION_PROMPT = """You are a financial data extractor for an MSME credit assessment system.

A credit officer has uploaded a document for a business applicant that has no
digital financial footprint. Extract ONLY the following fields from the document.
Return a JSON object with EXACTLY these keys and null for any field not found.
Do NOT invent or estimate values not present in the document.

Fields to extract:
- avg_monthly_inflow: average monthly revenue/cash inflow (number, INR)
- inflow_volatility_coefficient: estimate of income regularity (0=very stable, 1=very erratic) — only if document shows multiple months
- avg_closing_balance: average end-of-month bank balance (number, INR) — only from bank statements
- days_with_negative_balance_90d: days with negative balance in last 90 days (integer) — only from bank statements
- existing_emi_to_inflow_ratio: ratio of monthly EMI/loan payments to monthly inflow (0-1) — only if both are visible
- bounce_count_90d: number of returned/bounced transactions in last 90 days (integer)
- txn_count_30d: approximate number of transactions in last 30 days (integer)
- unique_counterparties_30d: approximate number of unique customers/suppliers (integer)
- gst_filing_regularity_12mo: fraction of months with GST filed on time (0-1) — only from GST documents
- gst_turnover_yoy_growth: year-on-year GST turnover growth (decimal, e.g. 0.12 = 12%)

Document text:
{document_text}

Return ONLY valid JSON, no explanation. Example:
{{"avg_monthly_inflow": 85000.0, "bounce_count_90d": 2, "txn_count_30d": 45, ...}}"""


async def parse_document_to_features(
    upload: UploadFile,
    applicant_id: str,
    llm_client: LLMClient,
) -> NormalizedApplicantFeatures:
    """Full F7 pipeline: extract text → LLM → parse JSON → validate → return features."""
    document_text = await _extract_text(upload)
    if len(document_text.strip()) < 50:
        raise ValueError(
            f"Document yielded < 50 characters of extractable text. "
            f"File type: {upload.content_type}. If this is a scanned image, "
            f"OCR is not currently supported — ask applicant to provide a "
            f"text-based PDF or typed statement."
        )

    raw_json = await _call_llm_extractor(document_text, llm_client)
    extracted = _parse_and_validate_llm_output(raw_json)

    # Consistent denominator: total features in FEATURE_ORDER
    from backend.core.scoring_engine import FEATURE_ORDER
    populated = sum(1 for v in extracted.values() if v is not None)
    completeness = populated / len(FEATURE_ORDER)

    return NormalizedApplicantFeatures(
        applicant_id=applicant_id,
        data_sources_used=[DataSourceType.DOCUMENT_FALLBACK],
        had_bureau_record=False,
        data_completeness_pct=completeness,
        **extracted,
    )


async def _extract_text(upload: UploadFile) -> str:
    """Extract raw text from uploaded file. Supports PDF and plain text."""
    content = await upload.read()

    if upload.content_type == "application/pdf" or upload.filename.endswith(".pdf"):
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            pages_text = []
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    pages_text.append(t)
        return "\n".join(pages_text)

    if upload.content_type in ("text/plain", "text/csv") or upload.filename.endswith(".txt"):
        return content.decode("utf-8", errors="replace")

    raise ValueError(
        f"Unsupported file type: {upload.content_type}. "
        f"Upload a text-based PDF or plain text file. "
        f"Scanned images are not supported in this PoC."
    )


async def _call_llm_extractor(document_text: str, llm_client: LLMClient) -> str:
    """Call primary LLM with extraction prompt. Truncate to avoid token overflow."""
    MAX_CHARS = 6000
    truncated = document_text[:MAX_CHARS]
    if len(document_text) > MAX_CHARS:
        truncated += "\n[DOCUMENT TRUNCATED AT 6000 CHARACTERS]"

    prompt = EXTRACTION_PROMPT.format(document_text=truncated)
    return await llm_client.complete(
        prompt=prompt,
        max_tokens=400,
        temperature=0.0,
    )


def _parse_and_validate_llm_output(raw: str) -> dict:
    """Parse LLM output as JSON, strip markdown fences, validate numeric ranges."""
    clean = re.sub(r"```(?:json)?", "", raw).strip()
    try:
        data = json.loads(clean)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"LLM returned non-JSON output for document extraction: {e}. "
            f"Raw output (first 200 chars): {clean[:200]}"
        )

    NUMERIC_FIELDS = [
        "avg_monthly_inflow",
        "inflow_volatility_coefficient",
        "avg_closing_balance",
        "days_with_negative_balance_90d",
        "existing_emi_to_inflow_ratio",
        "bounce_count_90d",
        "txn_count_30d",
        "unique_counterparties_30d",
        "gst_filing_regularity_12mo",
        "gst_turnover_yoy_growth",
    ]
    RATIO_FIELDS = {
        "inflow_volatility_coefficient",
        "existing_emi_to_inflow_ratio",
        "gst_filing_regularity_12mo",
    }

    validated = {}
    for field in NUMERIC_FIELDS:
        val = data.get(field)
        if val is None:
            validated[field] = None
            continue
        try:
            val = float(val)
        except (TypeError, ValueError):
            validated[field] = None
            continue
        if field in RATIO_FIELDS:
            val = max(0.0, min(1.0, val))
        elif field in ["avg_monthly_inflow", "avg_closing_balance"]:
            val = min(500000000.0, max(0.0, val))
        validated[field] = val

    return validated
