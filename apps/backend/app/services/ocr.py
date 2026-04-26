from abc import ABC, abstractmethod


class OCRProvider(ABC):
    """
    Abstract base class for all OCR providers.
    Every concrete implementation must support a single extract_text() call.
    Adding a new provider means implementing this interface and adding a branch
    in main._load_ocr_provider().
    """

    @abstractmethod
    def extract_text(
        self,
        image_bytes: bytes,
    ) -> str:
        """
        Extract text from the provided image bytes.

        Args:
            image_bytes: Raw image data (JPEG or PNG).

        Returns:
            The extracted text as a single string.
        """
        ...

    @abstractmethod
    def is_ready(self) -> bool:
        """
        Returns True if the model is loaded and ready to serve requests.
        Used by the health endpoint.
        """
        ...


class RapidOCRProvider(OCRProvider):
    """
    OCR provider using rapidocr-onnxruntime.
    Fast, lightweight text extraction without requiring a language model.
    """

    def __init__(self, device: str = "cpu") -> None:
        try:
            from rapidocr_onnxruntime import RapidOCR
        except ImportError:
            raise ImportError(
                "rapidocr_onnxruntime is not installed. "
                "Install it with: pip install rapidocr-onnxruntime"
            )

        self._device = device
        self._ready = False

        # Initialize RapidOCR with specified device
        # RapidOCR handles CPU/GPU automatically via ONNX Runtime config
        self._ocr = RapidOCR()
        self._ready = True

    def extract_text(self, image_bytes: bytes) -> str:
        """
        Extract text from image using RapidOCR.

        Args:
            image_bytes: Raw image data (JPEG or PNG).

        Returns:
            Extracted text as a single concatenated string.
        """
        import io
        from PIL import Image

        # Load image from bytes
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Run OCR detection and recognition
        # RapidOCR returns: (result, elapsed_time)
        # result is a list of tuples: (bbox, text, confidence)
        result, _ = self._ocr(image)

        if not result:
            return ""

        # Extract and concatenate all text
        # result is list of (bbox, text, confidence) tuples
        extracted_text = "\n".join([text for _, text, _ in result])

        return extracted_text

    def is_ready(self) -> bool:
        return self._ready
