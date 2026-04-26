from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- Server ---
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_env: str = "development"
    app_debug: bool = True

    # --- Storage ---
    uploads_dir: Path = Path("./uploads")
    ml_models_dir: Path = Path("./ml_models")
    hf_home: str = "./ml_models/huggingface"

    # --- VLM ---
    vlm_provider: str = "moondream"
    vlm_model_path: str = "vikhyatk/moondream2"
    vlm_model_revision: str = "2025-06-21"
    vlm_device: str = "cuda"

    # --- TTS ---
    tts_provider: str = "kokoro"
    tts_voice: str = "af_heart"
    tts_sample_rate: int = 24000
    tts_device: str = "cpu"

    # --- OCR ---
    ocr_provider: str = "rapidocr"
    ocr_device: str = "cpu"

    # --- CORS ---
    cors_origins: list[str] = [
        "http://localhost:8081",
        "http://localhost:19006",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()