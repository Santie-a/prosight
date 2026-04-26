# Prosight

**Prosight** is an AI-powered, low-vision accessibility platform that provides intelligent document processing, vision analysis, and text-to-speech capabilities. The application helps users with visual impairments access and understand documents and images through AI technologies.

## Overview

Prosight consists of a modern React Native frontend and a powerful FastAPI backend, featuring:

- **Intelligent Document Processing**: Upload and analyze PDF documents
- **Vision Analysis**: AI-powered image understanding using Vision Language Models
- **Optical Character Recognition**: Extract text from images
- **Text-to-Speech**: Convert text to natural-sounding audio
- **Cross-Platform**: Native iOS, Android, and web support
- **Accessible Design**: Built specifically for low-vision users

## Project Structure

```
prosight/
├── apps/
│   ├── frontend/           # React Native Expo app
│   │   ├── app/            # Screens and routing
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API and data services
│   │   └── constants/      # Configuration and theme
│   │
│   └── backend/            # FastAPI REST API
│       ├── app/            # Main application code
│       │   ├── routers/    # API endpoints
│       │   ├── services/   # Business logic
│       │   └── schemas/    # Request/response models
│       ├── ml_models/      # Cached ML models
│       └── requirements.txt # Python dependencies
│
└── docs/                   # Project documentation
```

## Quick Start

### Prerequisites

- **For Backend**: Python 3.11+, PyTorch 2.4.1, ~5GB disk space for ML models
- **For Frontend**: Node.js 16+, npm/yarn, Expo CLI
- **For Local Development**: Docker and Docker Compose (optional)

### Backend Setup

```bash
cd apps/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (see configuration below)
cp .env.example .env  # if available

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000` with interactive docs at `/docs`.

### Frontend Setup

```bash
cd apps/frontend

# Install dependencies
npm install

# Start development server
npx expo start

# Press 'i' for iOS, 'a' for Android, 'w' for web, or 's' for Expo Go
```

### Docker Compose (Full Stack)

```bash
# From project root
docker-compose up
```

This will start both the backend API and the frontend development server.

## Configuration

### Backend Environment Variables

Create `apps/backend/.env`:

```env
# Server Configuration
APP_HOST=0.0.0.0
APP_PORT=8000
APP_DEBUG=False

# Model Providers
VLM_PROVIDER=moondream          # Vision Language Model provider
OCR_PROVIDER=rapidocr           # OCR provider
OCR_DEVICE=cpu                  # cpu or cuda for GPU acceleration
TTS_PROVIDER=kokoro             # Text-to-Speech provider

# Model Cache Location
HF_HOME=./ml_models/huggingface
```

### Frontend Configuration

Edit `apps/frontend/constants/config.ts` to point to your backend:

```typescript
const API_BASE_URL = 'http://localhost:8000';
```

## Features & Capabilities

### Backend Features

| Feature | Technology | Provider |
|---------|-----------|----------|
| Document Processing | PyMuPDF | PDF parsing and text extraction |
| Vision Analysis | Moondream2 (Vision Transformer) | On-demand image understanding |
| OCR | RapidOCR + ONNX | Fast, accurate text extraction |
| Text-to-Speech | Kokoro | High-quality audio generation |
| Audio Output | SoundFile | Audio file handling |

### Frontend Features

| Feature | Technology |
|---------|-----------|
| Cross-Platform UI | React Native + Expo |
| Document Management | SQLite Database |
| Navigation | Expo Router (file-based) |
| Theme Support | Light/Dark mode with custom hooks |
| Accessibility | Built-in context and hooks |

## Documentation

### Detailed Setup Guides

- **[Backend README](apps/backend/README.md)**: FastAPI setup, API endpoints, model configuration
- **[Frontend README](apps/frontend/README.md)**: React Native setup, components, hooks, development workflow

### API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Main Endpoints

#### Document Processing
- `POST /api/documents/upload` - Upload and process a PDF
- `GET /api/documents/{id}` - Retrieve document content

#### Vision Analysis
- `POST /api/vision/analyze` - Analyze an image with VLM

#### Optical Character Recognition
- `POST /api/ocr/extract` - Extract text from image

#### Text-to-Speech
- `POST /api/tts/synthesize` - Convert text to audio

#### Health Check
- `GET /api/health` - Server health status

## Development

### Tech Stack Summary

**Backend:**
- FastAPI 0.115.0 + Uvicorn
- PyTorch 2.4.1, Transformers 4.44.2
- RapidOCR 1.4.4, ONNX Runtime 1.24.3
- PyMuPDF 1.24.10

**Frontend:**
- React Native with Expo
- TypeScript
- SQLite (via Expo)

### Project Standards

- **Code Style**: TypeScript for frontend type safety, Python type hints for backend
- **Architecture**: Component-based (frontend), service-oriented (backend)
- **State Management**: React Context + Hooks (frontend), Dependency Injection (backend)

### Adding New Features

**Backend:**
1. Add route in `app/routers/`
2. Add request/response schemas in `app/schemas/`
3. Add business logic in `app/services/`
4. Document endpoints in docstrings

**Frontend:**
1. Create screen in `app/` directory
2. Create components in `components/`
3. Add custom hooks in `hooks/`
4. Add API methods to `services/api.ts`

## Docker

### Build Docker Image

```bash
docker build -t prosight-backend apps/backend/
```

### Run with Docker Compose

```bash
docker-compose up
```

Services will be available at:
- Backend API: http://localhost:8000
- Frontend (Dev): http://localhost:8081

## Testing

### Backend

```bash
cd apps/backend

# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test
pytest tests/test_documents.py -v
```

### Frontend

```bash
cd apps/frontend

# Run tests (if configured)
npm test
```

## Troubleshooting

### Backend Issues

| Issue | Solution |
|-------|----------|
| Models not downloading | Check disk space, verify `HF_HOME` permissions |
| CUDA errors | Reinstall PyTorch for CPU or ensure NVIDIA drivers are installed |
| Port 8000 in use | Change `APP_PORT` in `.env` or kill existing process |

### Frontend Issues

| Issue | Solution |
|-------|----------|
| Port 8081 in use | Clear cache with `expo start --clear` |
| iOS Simulator not starting | Install Xcode command line tools: `xcode-select --install` |
| Module not found | Run `npm install` and clear cache: `npm start -- --clear` |

## License

[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)

This project is licensed under the Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License. See the [LICENSE](LICENSE) file for details.

## Contributing

I would be grateful

## Support

For issues, questions, or feature requests, please open an issue in the repository.

## Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- Powered by [Moondream2](https://github.com/vikhyatk/moondream) for vision
- Enhanced with [RapidOCR](https://github.com/RapidAI/RapidOCR) for text extraction
- Audio by [Kokoro TTS](https://huggingface.co/hexgrad/Kokoro-82M)
