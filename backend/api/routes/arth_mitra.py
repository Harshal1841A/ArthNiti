import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_db, verify_api_key
from backend.api.models import ArthMitraSpeakRequest, ArthMitraSpeakResponse
from backend.config import get_settings
from backend.core.arth_mitra import TTSFallbackToBrowser, speak_narrative, get_pre_generated_narrative
from backend.database.models import XAINarrative

router = APIRouter()
_settings = get_settings()
logger = logging.getLogger(__name__)


@router.post("/{xai_id}/speak")
async def speak_xai_narrative(
    xai_id: str,
    req: ArthMitraSpeakRequest,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(verify_api_key),
):
    """Synthesize speech for a cross-checked XAI narrative."""
    xai = await db.get(XAINarrative, xai_id)
    if not xai:
        raise HTTPException(status_code=404, detail="XAI narrative not found")

    # Demo mode: use pre-generated narrative if demo_persona_id is provided
    narrative_text = xai.narrative
    if req.demo_persona_id and _settings.DEMO_MODE:
        pre_gen = get_pre_generated_narrative(req.demo_persona_id, req.language)
        if pre_gen:
            narrative_text = pre_gen

    try:
        audio_bytes = await speak_narrative(
            narrative=narrative_text,
            cross_check_passed=xai.cross_check_passed,
            language=req.language,
            pre_generated_text=narrative_text if (req.demo_persona_id and _settings.DEMO_MODE) else None,
        )
        # BUG-A6 FIX: IndicTTS returns audio/mpeg (MP3), not audio/wav.
        # Detect the actual format from the magic bytes so the browser can
        # decode the stream correctly regardless of which TTS tier responded.
        if audio_bytes[:3] == b"ID3" or audio_bytes[:2] == b"\xff\xfb":
            detected_mime = "audio/mpeg"
        elif audio_bytes[:4] == b"RIFF":
            detected_mime = "audio/wav"
        elif audio_bytes[:4] == b"OggS":
            detected_mime = "audio/ogg"
        else:
            detected_mime = "audio/mpeg"  # IndicTTS default

        return StreamingResponse(
            iter([audio_bytes]),
            media_type=detected_mime,
            headers={"Content-Disposition": f"inline; filename=arth-mitra-{xai_id}.{detected_mime.split('/')[-1]}"},
        )
    except TTSFallbackToBrowser as e:
        return ArthMitraSpeakResponse(
            fallback_message=str(e),
            narrative_text=narrative_text,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("TTS synthesis failed for xai_id=%s", xai_id)
        raise HTTPException(status_code=502, detail="Text-to-speech service unavailable. Please retry.")
