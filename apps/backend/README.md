# Prosight Backend

FastAPI-based backend for the Prosight low-vision accessibility application. Provides APIs for document processing, PDF analysis, vision-based features, and text-to-speech functionality.

## Features

- **Document Processing**: PDF upload and parsing with text extraction (in-memory, stateless)
- **Vision Analysis**: Vision Language Model (VLM) integration for image analysis with on-demand inference
- **Text-to-Speech (TTS)**: Convert text to audio using high-quality TTS models
- **Optical Character Recognition (OCR)**: RapidOCR-powered text extraction from images with ONNX Runtime acceleration
- **File Storage**: Efficient temporary file handling

## Tech Stack

- **Framework**: FastAPI 0.115.0
- **Server**: Uvicorn 0.30.6
- **ML Models**:
  - Vision: Moondream2 (via Transformers 4.44.2)
  - OCR: RapidOCR 1.4.4 (via ONNX Runtime 1.24.3)
  - TTS: Kokoro 0.9.4
  - Acceleration: HuggingFace Accelerate 0.34.2, ONNX Runtime 1.24.3
- **PDF Processing**: PyMuPDF 1.24.10
- **Audio**: SoundFile 0.12.1
- **Images**: Pillow 10.4.0, OpenCV 4.13.0
- **Async**: aiofiles 24.1.0
- **Config**: Pydantic Settings 2.4.0

## Requirements

- Python >= 3.11
- PyTorch 2.4.1 (GPU recommended for vision models)
- Sufficient disk space for ML models (~5GB+)

## Installation

1. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

   > **Note**: PyTorch is included in `requirements.txt`. For GPU support, you may need to reinstall:
   ```bash
   pip install torch==2.4.1 --index-url https://download.pytorch.org/whl/cu121
   ```

3. **Download ML Models** (optional, will auto-download on first use):
   - HuggingFace models will cache in `ml_models/huggingface/` directory
   - Set `HF_HOME` environment variable to customize model cache location

## Environment Variables

Create a `.env` file in the `apps/backend/` directory:

```env
# Server
APP_HOST=0.0.0.0
APP_PORT=8000
APP_DEBUG=False

# VLM Provider (moondream, or other supported models)
VLM_PROVIDER=moondream

# OCR Provider (rapidocr, or other supported providers)
OCR_PROVIDER=rapidocr
OCR_DEVICE=cpu  # or cuda for GPU acceleration

# TTS Provider (kokoro, or other supported providers)
TTS_PROVIDER=kokoro

# HuggingFace Model Cache
HF_HOME=./ml_models/huggingface
```

## Running the Server

```bash
# Development (with auto-reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at `http://localhost:8000`

### API Documentation

- **Interactive Docs**: http://localhost:8000/docs (Swagger UI)
- **Alternative Docs**: http://localhost:8000/redoc (ReDoc)

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Configuration management
│   ├── dependencies.py      # Dependency injection and provider access
│   ├── routers/             # API route groups
│   │   ├── documents.py     # PDF upload, parsing, storage
│   │   ├── health.py        # Health check endpoints
│   │   ├── organize.py      # Document organization
│   │   ├── tts.py           # Text-to-speech endpoints
│   │   └── vision.py        # Vision analysis endpoints
│   ├── schemas/             # Pydantic request/response models
│   │   ├── documents.py
│   │   ├── health.py
│   │   ├── tts.py
│   │   └── vision.py
│   └── services/            # Business logic
│       ├── pdf.py           # PDF processing
│       ├── tts.py           # TTS service
│       └── vlm.py           # Vision model service
├── ml_models/               # Cached ML models (auto-populated)
├── tests/                   # Unit and integration tests
├── requirements.txt         # Python dependencies
└── pyproject.toml          # Project configuration
```

## Testing

Run tests with pytest:

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest test_documents_process.py -v
```

## Docker

Build and run the backend in Docker:

```bash
docker build -t prosight-backend .
docker run -p 8000:8000 prosight-backend
```

## Development

Install development dependencies and tools:

```bash
pip install -r requirements.txt

# Format code
ruff format app/

# Lint
ruff check app/

# Type checking
mypy app/
```

## API Examples

See `API_DOCUMENTATION.md` and `API_QUICK_REFERENCE.md` in the project root for detailed endpoint documentation.

## Notes

- **Stateless Architecture**: This API is fully stateless. All requests return complete inference results without persisting data to a database. Clients are responsible for any caching or storage needs.
- **Model Downloads**: ML models are cached in `ml_models/huggingface/`. This directory can be large (5GB+).
- **GPU Memory**: Vision and TTS models benefit significantly from GPU acceleration. Ensure sufficient GPU memory or use CPU fallback.
- **Async Operations**: The API is fully async for efficient concurrent request handling.
- **CORS**: CORS middleware is configured for frontend integration.

## License

See main project LICENSE file.
