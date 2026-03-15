import os
from app.config import get_settings

settings = get_settings()
os.environ["HF_HOME"] = str(settings.hf_home)

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import init_db
from app.dependencies import set_tts_provider, set_vlm_provider
from app.routers import health, vision, documents, tts


logging.basicConfig(
    level=logging.DEBUG if settings.app_debug else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    logger.info("Starting up...")

    logger.info("Initializing database...")
    init_db()
    logger.info("Database ready.")

    logger.info("Loading VLM provider: %s", settings.vlm_provider)
    vlm = _load_vlm_provider()
    set_vlm_provider(vlm)
    logger.info("VLM provider ready.")

    logger.info("Loading TTS provider: %s", settings.tts_provider)
    tts = _load_tts_provider()
    set_tts_provider(tts)
    logger.info("TTS provider ready.")

    logger.info("All systems ready. Serving on %s:%s", settings.app_host, settings.app_port)

    yield

    # --- Shutdown ---
    logger.info("Shutting down...")


def _load_vlm_provider():
    from app.services.vlm import MoondreamProvider

    if settings.vlm_provider == "moondream":
        return MoondreamProvider(
            model_id=settings.vlm_model_path,
            revision=settings.vlm_model_revision,
            device=settings.vlm_device,
        )
    raise ValueError(f"Unknown VLM provider: {settings.vlm_provider}")


def _load_tts_provider():
    from app.services.tts import KokoroProvider

    if settings.tts_provider == "kokoro":
        return KokoroProvider(
            voice=settings.tts_voice,
            sample_rate=settings.tts_sample_rate,
            device=settings.tts_device,
        )
    raise ValueError(f"Unknown TTS provider: {settings.tts_provider}")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Vision App API",
        version="0.1.0",
        debug=settings.app_debug,
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    # Feature routers added here as we build them:
    app.include_router(vision.router)
    app.include_router(documents.router)
    app.include_router(tts.router)
    # app.include_router(organize.router)

    return app


app = create_app()