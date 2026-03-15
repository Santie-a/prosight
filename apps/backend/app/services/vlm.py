from abc import ABC, abstractmethod
from pathlib import Path


class VLMProvider(ABC):
    """
    Abstract base class for all vision-language model providers.
    Every concrete implementation must support a single describe() call.
    Adding a new provider (e.g. MiniCPM-V, a cloud API) means
    implementing this interface and adding a branch in main._load_vlm_provider().
    """

    @abstractmethod
    def describe(
        self,
        image_bytes: bytes,
        prompt: str,
    ) -> str:
        """
        Run inference on the provided image bytes.

        Args:
            image_bytes: Raw image data (JPEG or PNG).
            prompt:       The instruction passed to the model.
                          The router is responsible for constructing
                          the appropriate prompt per detail_level.

        Returns:
            The model's text description.
        """
        ...

    @abstractmethod
    def is_ready(self) -> bool:
        """
        Returns True if the model is loaded and ready to serve requests.
        Used by the health endpoint.
        """
        ...


class MoondreamProvider(VLMProvider):
    def __init__(
        self,
        model_id: str = "vikhyatk/moondream2",
        revision: str = "2024-08-26",
        device: str = "cuda",
    ) -> None:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        self._device = device
        self._ready = False
        dtype = torch.float16 if device == "cuda" else torch.float32

        self._tokenizer = AutoTokenizer.from_pretrained(
            model_id,
            revision=revision,
            trust_remote_code=True,
        )
        self._model = AutoModelForCausalLM.from_pretrained(
            model_id,
            revision=revision,
            trust_remote_code=True,
            torch_dtype=dtype,
            device_map={"": device},
        )
        self._model.eval()
        self._ready = True

    def describe(self, image_bytes: bytes, prompt: str) -> str:
        import io
        from PIL import Image

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        enc_image = self._model.encode_image(image)
        return self._model.answer_question(enc_image, prompt, self._tokenizer)

    def is_ready(self) -> bool:
        return self._ready