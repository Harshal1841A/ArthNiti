"""ArthNiti — Arth-Mitra TTS layer (F8).

Speaks the ALREADY cross-checked narrative in the applicant's selected
language. Never generates its own text. Never runs before cross-check passes.

FIXED (v1.3 audit): Bhashini access is treated as UNCONFIRMED.
The fallback chain (IndicTTS → browser) is the MANDATORY path, not backup.
Do not claim Bhashini in the pitch without a verified working key.
"""

import base64
import logging

import httpx

from backend.config import get_settings
from backend.core.llm_client import LLMClient  # noqa: F401 — may be used for future extensions

_settings = get_settings()

logger = logging.getLogger(__name__)


class TTSFallbackToBrowser(Exception):
    """Raised when all server-side TTS tiers fail.

    Frontend catches this and uses window.speechSynthesis.
    """

    pass


async def speak_narrative(
    narrative: str, cross_check_passed: bool, language: str, pre_generated_text: str | None = None
) -> bytes:
    """Synthesize speech for a cross-checked narrative.

    If pre_generated_text is provided, use it directly (demo mode fast-path).
    Raises:
        ValueError: if cross_check_passed is False.
        TTSFallbackToBrowser: if all TTS backends fail.
    """
    if not cross_check_passed:
        raise ValueError(
            "Refusing to synthesize speech for a narrative that failed "
            "numeric cross-check — same gate as the UI display logic."
        )
    text = pre_generated_text if pre_generated_text else narrative
    return await _tts_with_fallback(text, language)


# Pre-generated demo narratives for hackathon demo mode
_PRE_GENERATED_NARRATIVES = {
    "APP-RAMESH": {
        "en": "Ramesh's Financial Health Score is 72 (ADEQUATE). His monthly income is stable at ₹1.42L with consistent payment timing. GST filing regularity at 60% is a moderate strength, though there is room for improvement. One bounce in the last 90 days is a minor risk factor. Overall, his cash-flow profile supports straight-through approval for working-capital credit.",
        "hi": "Ramesh ji, aapka financial health score 72 hai. Ye ADEQUATE tier hai. Aapki monthly income stable hai, aur payment timing bhi consistent hai. GST filing 60% hai — theek hai par aur behtar ho sakta hai. 90 din mein ek bounce dikha hai — chhoti si chinta. Cash flow overall theek hai, working capital loan ke liye sidha approval mil sakta hai.",
    },
    "APP-PRIYA": {
        "en": "Priya's Financial Health Score is 85 (STRONG). Her business demonstrates exceptional financial discipline: 95% GST filing regularity, zero bounces, strong closing balance buffer at ₹92K, and a growing payroll trend of 8% YoY. Monthly inflow of ₹3.85L is highly stable. This is a textbook creditworthy profile with straight-through approval eligibility.",
        "hi": "Priya ji, aapka score 85 hai — ye STRONG tier hai. Aapka business bahut disciplined hai: GST filing 95% hai, zero bounces, closing balance ₹92K strong hai, aur payroll 8% badh raha hai. Monthly income ₹3.85L stable hai. Ye bilkul best credit profile hai — sidha approval eligible hai.",
    },
    "APP-MOHAMMED": {
        "en": "Mohammed's Financial Health Score is 45 (WATCH). His income is highly volatile at 65% coefficient, with 4 days of negative balance and 3 bounces in the last 90 days. GST filing has dropped to 45% and turnover declined 3% YoY. Transaction velocity is the only positive signal. Enhanced human review is required before any credit decision.",
        "hi": "Mohammed sahab, aapka score 45 hai — ye WATCH tier hai. Aapki income bahut unstable hai (65% volatility), 90 din mein 4 din negative balance, aur 3 bounces hain. GST filing 45% ho gayi hai, aur turnover bhi 3% ghat raha hai. Transaction count achha hai bas. Human officer review zaroori hai. Collateral maangna chahiye, ya loan ₹3L tak limit karna chahiye.",
    },
    "APP-LAKSHMI": {
        "en": "Lakshmi's Financial Health Score is 28 (HIGH RISK). This profile exhibits severe credit stress: 5 bounces in 90 days, 7 days of negative balance, and an EMI-to-income ratio of 55% which is critically high. Income volatility is extreme at 78%, and GST compliance has deteriorated to 25%. This applicant is currently over-leveraged and requires immediate human officer review.",
        "hi": "Lakshmi ji, aapka score 28 hai — ye HIGH RISK tier hai. Aapka profile bahut stressed hai: 90 din mein 5 bounces, 7 din negative balance, aur EMI-to-income 55% hai jo bahut zyada hai. Income volatility 78% hai, aur GST compliance 25% tak ghat gayi hai. Aap over-leveraged hain. Human officer review zaroori hai. Loan decline karna chahiye, ya bahut kam amount aur strict collateral ke saath.",
    },
    "APP-SURESH": {
        "en": "Suresh's Financial Health Score is 61 (ADEQUATE). He runs a solid electronics retail business with ₹2.15L monthly inflow and good GST compliance at 80%. Closing balance of ₹42K provides a decent buffer. The main risk factor is income volatility at 45%, which suggests seasonal demand fluctuations. One bounce is within acceptable limits. Straight-through approval is recommended.",
        "hi": "Suresh ji, aapka score 61 hai — ye ADEQUATE tier hai. Aapka electronics retail business solid hai, monthly income ₹2.15L hai, aur GST compliance 80% achhi hai. Closing balance ₹42K hai jo safety buffer hai. Main risk volatility 45% hai — seasonal demand lagta hai. Ek bounce acceptable hai. Sidha approval recommended hai, par credit officer ko seasonal pattern monitor karna chahiye.",
    },
}


def get_pre_generated_narrative(persona_id: str, language: str) -> str | None:
    """Return pre-generated narrative for a demo persona, or None."""
    persona = _PRE_GENERATED_NARRATIVES.get(persona_id)
    if not persona:
        return None
    return persona.get(language, persona.get("en"))


async def _tts_with_fallback(text: str, language: str) -> bytes:
    """Server-side TTS with fallback chain.

    Tier 1: Bhashini (best coverage, requires approval — UNCONFIRMED).
    Tier 2: IndicTTS (IIT Madras, open access, 13 languages).
    Tier 3: TTSFallbackToBrowser → frontend uses browser chatter bot (window.speechSynthesis).
    """
    try:
        return await _bhashini_tts(text, language)
    except Exception as e:
        logger.warning(f"Bhashini TTS unavailable ({e}) — trying IndicTTS")

    try:
        return await _indic_tts(text, language)
    except Exception as e:
        logger.warning(f"IndicTTS unavailable ({e}) — signalling browser chatter bot fallback")

    raise TTSFallbackToBrowser(
        f"All server-side TTS backends unavailable for language '{language}'. "
        "Frontend will use browser chatter bot (window.speechSynthesis)."
    )


async def _bhashini_tts(text: str, language: str) -> bytes:
    """Bhashini Vakyansh TTS API.

    UNCONFIRMED: verify at bhashini.gov.in before relying on this.
    If BHASHINI_API_KEY is not set, this raises immediately.
    """
    api_key = _settings.BHASHINI_API_KEY
    if not api_key:
        raise EnvironmentError("BHASHINI_API_KEY not set")

    payload = {
        "pipelineTasks": [
            {
                "taskType": "tts",
                "config": {
                    "language": {"sourceLanguage": language},
                    "gender": "female",
                },
            }
        ],
        "inputData": {"input": [{"source": text}]},
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            "https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
            json=payload,
            headers={
                "Authorization": api_key,
                "Content-Type": "application/json",
            },
        )
        resp.raise_for_status()
        audio_b64 = resp.json()["pipelineResponse"][0]["audio"][0]["audioContent"]
        return base64.b64decode(audio_b64)


async def _indic_tts(text: str, language: str) -> bytes:
    """IndicTTS — IIT Madras open-access TTS, no API key required.

    Language code map (different from Bhashini codes).
    """
    LANG_MAP = {
        "hi": "hindi",
        "mr": "marathi",
        "ta": "tamil",
        "te": "telugu",
        "kn": "kannada",
        "bn": "bengali",
        "gu": "gujarati",
        "pa": "punjabi",
        "en": "english",
    }
    indic_lang = LANG_MAP.get(language, "hindi")

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            "https://ttsfree.iitm.ac.in/tts/synthesize",
            json={"text": text, "lang": indic_lang, "gender": "female"},
        )
        resp.raise_for_status()
        return resp.content
