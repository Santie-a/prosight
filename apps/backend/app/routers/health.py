import logging

from fastapi import APIRouter

from app.schemas.health import HealthResponse, ProviderStatus
from app.dependencies import get_vlm_provider, get_tts_provider, get_ocr_provider

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    vlm_status = _check_provider(get_vlm_provider)
    tts_status = _check_provider(get_tts_provider)
    ocr_status = _check_provider(get_ocr_provider)

    all_ready = vlm_status.ready and tts_status.ready and ocr_status.ready

    return HealthResponse(
        status="ready" if all_ready else "degraded",
        providers={
            "vlm": vlm_status,
            "tts": tts_status,
            "ocr": ocr_status,
        },
    )


def _check_provider(getter) -> ProviderStatus:
    try:
        provider = getter()
        ready = provider.is_ready()
        return ProviderStatus(ready=ready, error=None)
    except RuntimeError as e:
        logger.warning("Provider not initialized: %s", e)
        return ProviderStatus(ready=False, error=str(e))
    except Exception as e:
        logger.error("Provider health check failed: %s", e)
        return ProviderStatus(ready=False, error=str(e))