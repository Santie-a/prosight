import io
import textwrap
import re
import numpy as np
import soundfile as sf
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
        
        active_voice = voice or self._default_voice
        cleaned_text = clean_text(text)
        
        # Forzamos la separación en bloques de máximo 800 caracteres
        # textwrap respetará los espacios para no cortar palabras a la mitad
        text_chunks = textwrap.wrap(cleaned_text, width=800)

        all_audio_arrays = []

        # Procesamos cada bloque
        for chunk in text_chunks:
            # Kokoro yield: (graphemes, phonemes, audio_array)
            for _, _, audio in self._pipeline(chunk, voice=active_voice):
                if audio is not None:
                    all_audio_arrays.append(audio)

        if not all_audio_arrays:
            return

        # Unimos todos los fragmentos numéricos en un solo bloque continuo
        combined_audio = np.concatenate(all_audio_arrays)

        # Generamos un ÚNICO archivo WAV válido
        buffer = io.BytesIO()
        sf.write(buffer, combined_audio, self._sample_rate, format="WAV")
        buffer.seek(0)

        # Hacemos yield en pedazos para no saturar la memoria en la respuesta HTTP
        chunk_size = 8192
        while True:
            data = buffer.read(chunk_size)
            if not data:
                break
            yield data

    def is_ready(self) -> bool:
        return self._ready


def clean_text(text: str) -> str:
    """
    Cleans the text by ensuring punctuation has proper spacing 
    so the TTS generates the correct pauses.
    """
    if not text:
        return ""

    # 1. Normalize line breaks: convert them to spaces to prevent
    # words at the end of a line from merging with the next one.
    text = text.replace("\n", " ").replace("\r", " ").replace("\t", " ")

    # 2. Fix stuck punctuation: "Hello.World" -> "Hello. World"
    # Matches a punctuation mark followed immediately by a character (non-whitespace).
    text = re.sub(r'([.!?,;:])(?=[^\s])', r'\1 ', text)

    # 3. Remove multiple spaces resulting from the previous steps.
    # This keeps a single space between words but ensures they exist.
    words = text.split()
    cleaned = " ".join(words)
    
    # 4. Optional: For even more pronounced pauses after sentences, 
    # you can uncomment the following line to add an extra space after terminal punctuation.
    # cleaned = re.sub(r'([.!?]) ', r'\1  ', cleaned)

    return cleaned