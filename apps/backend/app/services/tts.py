from abc import ABC, abstractmethod
from typing import Generator


class TTSProvider(ABC):
    """
    Abstract base class for all TTS providers.
    synthesize() returns a generator of raw audio chunks so callers
    can stream audio over WebSocket without buffering the full output.
    """

    @abstractmethod
    def synthesize(
        self,
        text: str,
        voice: str | None = None,
    ) -> Generator[bytes, None, None]:
        """
        Synthesize text to audio.

        Args:
            text:  The text to synthesize.
            voice: Override the provider's default voice.

        Yields:
            Raw WAV audio bytes in chunks.
        """
        ...

    @abstractmethod
    def is_ready(self) -> bool:
        """
        Returns True if the model is loaded and ready to serve requests.
        Used by the health endpoint.
        """
        ...


class KokoroProvider(TTSProvider):
    """
    Kokoro-82M TTS via the kokoro Python package.
    """

    def __init__(
        self,
        voice: str = "af_heart",
        sample_rate: int = 24000,
        device: str = "cpu",
    ) -> None:
        from kokoro import KPipeline

        self._default_voice = voice
        self._sample_rate = sample_rate
        self._ready = False

        self._pipeline = KPipeline(lang_code="en-us")
        self._ready = True

    def synthesize(
        self,
        text: str,
        voice: str | None = None,
    ) -> Generator[bytes, None, None]:
        import io
        import soundfile as sf

        active_voice = voice or self._default_voice

        # Kokoro yields (graphemes, phonemes, audio_array) tuples
        for _, _, audio in self._pipeline(text, voice=active_voice):
            buffer = io.BytesIO()
            sf.write(buffer, audio, self._sample_rate, format="WAV")
            buffer.seek(0)
            yield buffer.read()

    def is_ready(self) -> bool:
        return self._ready