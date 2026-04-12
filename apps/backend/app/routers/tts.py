import logging

from fastapi import APIRouter, HTTPException
from starlette.responses import StreamingResponse

from app.dependencies import get_tts_provider
from app.schemas.tts import SynthesizeRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/tts", tags=["tts"])


@router.post("/synthesize")
async def synthesize_text(request: SynthesizeRequest):
    """
    Synthesize text to audio and return as a WAV file.
    
    Args:
        request: JSON body with 'text' (required) and optional 'voice'
        
    Returns:
        StreamingResponse with audio/wav mimetype
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    tts = get_tts_provider()
    logger.info("Synthesizing ad-hoc text | length=%d", len(request.text))
    
    async def audio_generator():
        try:
            for wav_segment in tts.synthesize(request.text, voice=request.voice):
                yield wav_segment
        except Exception as e:
            logger.error("TTS synthesis failed: %s", e)
            raise
    
    return StreamingResponse(
        audio_generator(),
        media_type="audio/wav",
        headers={"Content-Disposition": "attachment; filename=audio.wav"}
    )

