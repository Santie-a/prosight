from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.vlm import VLMProvider
from app.services.tts import TTSProvider


# --- Database ---

DBSession = Annotated[Session, Depends(get_db)]


# --- Model providers ---
# These are populated during application startup in main.py lifespan.
# Routers access them via these dependency functions, never directly.

_vlm_provider: VLMProvider | None = None
_tts_provider: TTSProvider | None = None


def set_vlm_provider(provider: VLMProvider) -> None:
    global _vlm_provider
    _vlm_provider = provider


def set_tts_provider(provider: TTSProvider) -> None:
    global _tts_provider
    _tts_provider = provider


def get_vlm_provider() -> VLMProvider:
    if _vlm_provider is None:
        raise RuntimeError(
            "VLM provider has not been initialized. "
            "This is a startup configuration error."
        )
    return _vlm_provider


def get_tts_provider() -> TTSProvider:
    if _tts_provider is None:
        raise RuntimeError(
            "TTS provider has not been initialized. "
            "This is a startup configuration error."
        )
    return _tts_provider


VLMDep = Annotated[VLMProvider, Depends(get_vlm_provider)]
TTSDep = Annotated[TTSProvider, Depends(get_tts_provider)]