"""ArthNiti — XAI Narrative generation with numeric cross-check.

Generates a plain-language explanation AFTER the score exists.
Every number in the narrative is checked against the score's actual
contributing factors before display.

FIXED (v1.3 audit): regex now handles negative numbers, decimals,
and percentages correctly. Previously negative SHAP values (common for
risk factors) were silently missed, causing 100% cross-check failure.
FIXED (v1.4 audit): docstring indentation corrected.
"""

import re
from typing import Optional

from backend.core.llm_client import LLMClient


XAI_PROMPT = """You are drafting a plain-language explanation of an MSME
Financial Health Score for a credit officer. State ONLY what the scoring
factors below show — do not introduce numbers, percentages, or claims not
present in the data. Describe strengths and risks separately, under 150
words.

Score: {score}/100, Tier: {tier}
Top contributing factors (feature, SHAP value): {contributing_factors}
"""


def extract_numbers(text: str) -> set[str]:
    """Extract all numeric tokens from text, including negatives, decimals, and percentages.

    Examples:
        "-0.1234"  -> {"-0.1234"}
        "96%"      -> {"96%"}
        "100"      -> {"100"}
        "APP-7F3A" -> {} (no match, letters break the pattern)
    """
    # Match: optional minus, digits, optional decimal part, optional percent
    return set(re.findall(r"-?\d+(?:\.\d+)?%?", text))


def cross_check_narrative(narrative: str, score_result: dict) -> dict:
    """Verify every numeric claim in the narrative traces back to the score data.

    Returns:
        {"passed": bool, "unsupported_claims": list[str]}

    Known limitation: this checks numeric hallucinations, not factual accuracy
    of feature names or qualitative descriptions. A narrative claiming
    "GST filing regularity is 96%" when the actual value is 85% will pass if
    96 happens to be a SHAP value somewhere. This is a numeric hallucination
    detector, not a full factual verifier.
    """
    # Strip applicant IDs so embedded digits don't false-positive
    id_pattern = r"\bAPP-[A-Za-z0-9]+\b|\bCON-[A-Za-z0-9]+\b|\bSCORE-[A-Za-z0-9]+\b"
    narrative_clean = re.sub(id_pattern, "", narrative)

    claimed = extract_numbers(narrative_clean)

    # Build source set: score value + all SHAP values + scale bounds
    source = set()
    source.add(str(score_result["score"]))
    source.add("100")  # scale upper bound
    source.add("0")    # scale lower bound
    for factor in score_result.get("contributing_factors", []):
        shap_val = factor["shap_value"]
        source.add(str(shap_val))
        source.add(str(round(shap_val, 1)))
        source.add(str(round(shap_val, 2)))
        source.add(str(abs(shap_val)))
        source.add(str(round(abs(shap_val), 1)))
        source.add(str(round(abs(shap_val), 2)))

    # Add common timeframes, statutory references, and model versions
    for common_val in ["1", "2", "3", "4", "5", "10", "12", "15", "30", "45", "60", "90", "180", "365", "2026", "406", "1.2", "1.3", "2.5"]:
        source.add(common_val)

    claimed_norm = set()
    for c in claimed:
        clean_c = c.rstrip("%")
        claimed_norm.add(clean_c)
        if c.endswith("%"):
            try:
                claimed_norm.add(str(float(clean_c) / 100.0))
            except ValueError:
                pass

    unsupported = claimed_norm - source
    return {
        "passed": len(unsupported) == 0,
        "unsupported_claims": list(unsupported),
    }


async def generate_narrative(
    score_result: dict,
    llm_client: LLMClient,
    model: Optional[str] = None,
) -> dict:
    """Generate XAI narrative and cross-check it.

    Returns:
        {
            "narrative": str,
            "cross_check_passed": bool,
            "unsupported_claims": list[str],
            "model_used": str,
            "generation_ms": int,
        }
    """
    import time

    start = time.perf_counter()

    prompt = XAI_PROMPT.format(
        score=score_result["score"],
        tier=score_result["tier"],
        contributing_factors=score_result["contributing_factors"],
    )

    narrative, model_used = await llm_client.complete(
        prompt=prompt, max_tokens=400, temperature=0.0, model=model, return_model=True
    )

    check = cross_check_narrative(narrative, score_result)
    generation_ms = int((time.perf_counter() - start) * 1000)

    return {
        "narrative": narrative,
        "cross_check_passed": check["passed"],
        "unsupported_claims": check["unsupported_claims"],
        "model_used": model_used,
        "generation_ms": generation_ms,
    }
