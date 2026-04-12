# Vision App Backend API Documentation

**Version**: 0.1.0  
**Base URL**: `http://localhost:8000`  
**Environment**: Development (interactive docs at `/docs` and `/redoc`)

---

## Table of Contents

1. [Overview](#overview)
2. [Health Check](#health-check)
3. [Vision (Image Analysis)](#vision-image-analysis)
4. [Documents (PDF Management)](#documents-pdf-management)
5. [Text-to-Speech (TTS)](#text-to-speech-tts)
6. [Data Schemas](#data-schemas)
7. [Error Handling](#error-handling)
8. [CORS Configuration](#cors-configuration)

---

## Overview

The Vision App API provides three main services:

| Service | Purpose | Type |
|---------|---------|------|
| **Vision** | Image description using AI (Moondream2) | REST |
| **Documents** | Stateless PDF processing and parsing | REST |
| **TTS** | Text-to-speech synthesis | REST |

> **MVP Note**: This is a simplified, stateless API designed for early development. All document data is processed and returned in-response—nothing is persisted on the server. The frontend is responsible for caching/storage of document data if needed.

### Base URL
```
http://localhost:8000
```

### API Prefix
All endpoints are prefixed with `/api/v1`

### Interactive Documentation
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## Health Check

### GET `/api/v1/health`

Health check endpoint that returns the readiness status of all providers.

**Description**: Returns overall API health status and status of each provider (VLM and TTS).

**Request**:
```bash
GET /api/v1/health
```

**Response** (200 OK):
```json
{
  "status": "ready",
  "providers": {
    "vlm": {
      "ready": true,
      "error": null
    },
    "tts": {
      "ready": true,
      "error": null
    }
  }
}
```

**Status Values**:
- `"ready"` - All providers initialized and ready
- `"degraded"` - At least one provider has issues

**Provider Fields**:
- `ready` (boolean) - Whether the provider is initialized
- `error` (string|null) - Error message if provider failed

---

## Vision (Image Analysis)

### POST `/api/v1/vision/describe`

Analyze an image and generate a description using the Moondream2 vision model.

**Request**:
```
POST /api/v1/vision/describe
Content-Type: multipart/form-data

Parameters:
  - image (file, required): JPEG or PNG image file (max 10 MB)
  - detail_level (string, optional): "brief" | "detailed" | "navigation"
    Default: "detailed"
```

**Detail Levels**:
| Level | Purpose | Use Case |
|-------|---------|----------|
| `brief` | 1-2 sentence summary | Quick overview |
| `detailed` | Comprehensive description with subjects, positions, colors, text | General image understanding |
| `navigation` | Focus on obstacles, pathways, people, signage | Accessibility, wayfinding |

**Response** (200 OK):
```json
{
  "description": "A person standing in a park with trees in the background",
  "detail_level": "detailed",
  "processing_ms": 1250
}
```

**Error Responses**:
| Code | Reason |
|------|--------|
| 413 | Image exceeds 10 MB limit |
| 415 | Unsupported format (only JPEG/PNG) |
| 422 | Invalid detail_level parameter |
| 500 | Processing failed |

**cURL Example**:
```bash
curl -X POST http://localhost:8000/api/v1/vision/describe \
  -F "image=@photo.jpg" \
  -F "detail_level=detailed"
```

**JavaScript Example**:
```javascript
const formData = new FormData();
formData.append('image', imageFile);
formData.append('detail_level', 'detailed');

const response = await fetch('http://localhost:8000/api/v1/vision/describe', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.description);
```

---

## Documents (PDF Processing)

### POST `/api/v1/documents/process`

Process a PDF file and extract text chunks and document structure.

**Important**: This endpoint processes documents **statelessly**. No data is stored on the server. The frontend stores the results.

**Request**:
```
POST /api/v1/documents/process
Content-Type: multipart/form-data

Parameters:
  - file (file, required): PDF file (max 50 MB)
```

**Response** (200 OK):
Gets both chunks and sections in one response (all processing done server-side, storage on client-side).

**Error Responses**:
| Code | Reason |
|------|--------|
| 400 | Empty file |
| 413 | Exceeds 50 MB |
| 415 | Not a PDF |
| 422 | Parsing failed |

**cURL Example**:
```bash
curl -X POST http://localhost:8000/api/v1/documents/process -F "file=@doc.pdf"
```

---

## Documents (PDF Management)

### POST `/api/v1/documents/upload`

Upload and parse a PDF document into chunks and sections.

**Request**:
```
POST /api/v1/documents/upload
Content-Type: multipart/form-data

Parameters:
  - file (file, required): PDF file (max 50 MB)
```

**Response** (201 Created):
```json
{
  "document_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "research-paper",
  "page_count": 42,
  "chunk_count": 156,
  "section_count": 8
}
```

**Error Responses**:
| Code | Reason |
|------|--------|
| 413 | File exceeds 50 MB limit |
| 415 | Unsupported format (only PDF) |
| 422 | PDF parsing failed |
| 500 | File save or database error |

**JavaScript Example**:
```javascript
const formData = new FormData();
formData.append('file', pdfFile);

const response = await fetch('http://localhost:8000/api/v1/documents/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
const documentId = result.document_id;
console.log(`Uploaded: ${result.title} (${result.chunk_count} chunks)`);
```

---

### GET `/api/v1/documents/{document_id}/sections`

Retrieve all navigable sections from a parsed document.

**Request**:
```
GET /api/v1/documents/{document_id}/sections
```

**Path Parameters**:
- `document_id` (string, required): UUID of the document

**Response** (200 OK):
```json
{
  "document_id": "550e8400-e29b-41d4-a716-446655440000",
  "sections": [
    {
      "id": "section-001",
      "index": 0,
      "title": "Introduction",
      "level": 1,
      "start_chunk_index": 0
    },
    {
      "id": "section-002",
      "index": 1,
      "title": "Methodology",
      "level": 1,
      "start_chunk_index": 8
    },
    {
      "id": "section-003",
      "index": 2,
      "title": "Data Collection",
      "level": 2,
      "start_chunk_index": 12
    }
  ]
}
```

**Section Object**:
- `id` (string): Unique identifier for the section
- `index` (integer): Sequential index
- `title` (string): Section heading
- `level` (integer): Hierarchy level (1 = top-level, 2+ = nested)
- `start_chunk_index` (integer): Index of first chunk in section

**Error Responses**:
| Code | Reason |
|------|--------|
| 404 | Document not found |

**JavaScript Example**:
```javascript
const response = await fetch(
  'http://localhost:8000/api/v1/documents/550e8400-e29b-41d4-a716-446655440000/sections'
);

const result = await response.json();
result.sections.forEach(section => {
  console.log(`${section.level === 1 ? '# ' : '## '}${section.title}`);
});
```

---

### GET `/api/v1/documents/{document_id}/chunks`

Retrieve paginated text chunks from a parsed document.

**Request**:
```
GET /api/v1/documents/{document_id}/chunks?offset=0&limit=50
```

**Path Parameters**:
- `document_id` (string, required): UUID of the document

**Query Parameters**:
- `offset` (integer, optional): Starting chunk index. Default: 0
- `limit` (integer, optional): Maximum chunks to return. Default: 50

**Response** (200 OK):
```json
{
  "document_id": "550e8400-e29b-41d4-a716-446655440000",
  "total": 156,
  "chunks": [
    {
      "id": "chunk-001",
      "index": 0,
      "page_number": 1,
      "text": "This is the first chunk of text from the document..."
    },
    {
      "id": "chunk-002",
      "index": 1,
      "page_number": 1,
      "text": "This is the second chunk of text..."
    }
  ]
}
```

**Chunk Object**:
- `id` (string): Unique identifier
- `index` (integer): Sequential index in document
- `page_number` (integer): Original page number in PDF
- `text` (string): Extracted text content

**Error Responses**:
| Code | Reason |
|------|--------|
| 404 | Document not found |

**Pagination Example**:
```javascript
// Load all chunks in batches
let allChunks = [];
let offset = 0;
const limit = 50;

while (true) {
  const response = await fetch(
    `http://localhost:8000/api/v1/documents/${documentId}/chunks?offset=${offset}&limit=${limit}`
  );
  
  const result = await response.json();
  allChunks = allChunks.concat(result.chunks);
  
  if (allChunks.length >= result.total) break;
  offset += limit;
}
```

---

## Text-to-Speech (TTS)

### POST `/api/v1/tts/synthesize`

Synthesize text to speech and receive audio as a WAV file stream.

**Perfect for**: One-off synthesis of image descriptions or short text.

**Request**:
```
POST /api/v1/tts/synthesize
Content-Type: application/json

{
  "text": "This is the image description to synthesize",
  "voice": "af_heart"  // optional, defaults to af_heart
}
```

**Request Body**:
- `text` (string, required): Text to synthesize (1-10,000 characters)
- `voice` (string, optional): Voice name. Default: "af_heart"

**Response** (200 OK):
```
Content-Type: audio/wav
Content-Disposition: attachment; filename=audio.wav

[Binary WAV audio data]
```

**Error Responses**:
| Code | Reason |
|------|--------|
| 400 | Empty or whitespace-only text |
| 500 | Synthesis failed |

**cURL Example**:
```bash
curl -X POST http://localhost:8000/api/v1/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world"}' \
  -o audio.wav
```

**JavaScript Example (Download)**:
```javascript
const response = await fetch('http://localhost:8000/api/v1/tts/synthesize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Hello world' })
});

const blob = await response.blob();
const url = URL.createObjectURL(blob);

// Play audio
const audio = new Audio(url);
audio.play();

// Or download
const a = document.createElement('a');
a.href = url;
a.download = 'audio.wav';
a.click();
```

---

### WebSocket `/api/v1/tts/stream-text`

Stream text-to-speech synthesis in real-time via WebSocket.

**Perfect for**: Real-time audio streaming of image descriptions with progress feedback.

**Connection**:
```
ws://localhost:8000/api/v1/tts/stream-text
```

**Protocol**:
1. Client connects
2. Client sends JSON message with text
3. Server sends stream metadata
4. Server sends binary audio frames (64 KB chunks)
5. Server sends completion message
6. Connection closes

**Message Flow**:

**Client → Server (Initial Message)**:
```json
{
  "text": "Description of the image here"
}
```

**Server → Client (Stream Start)**:
```json
{
  "type": "stream_start",
  "text": "Description of the image here"
}
```

**Server → Client (Audio Frames - Binary)**:
```
[64 KB WAV audio data chunk 1]
[64 KB WAV audio data chunk 2]
...
```

**Server → Client (Stream Complete)**:
```json
{
  "type": "stream_complete"
}
```

**Error Response (on invalid input)**:
```json
{
  "type": "error",
  "code": "invalid_text",
  "message": "Text field is required and must not be empty"
}
```

**Possible Error Codes**:
- `"invalid_json"` - Message is not valid JSON
- `"invalid_text"` - Text field missing or empty
- `"synthesis_failed"` - TTS synthesis error

**JavaScript Example**:
```javascript
const socket = new WebSocket('ws://localhost:8000/api/v1/tts/stream-text');

socket.onopen = () => {
  console.log('Connected to TTS stream');
  socket.send(JSON.stringify({
    text: 'This is the image description'
  }));
};

let audioBuffer = [];

socket.onmessage = (event) => {
  if (event.data instanceof Blob) {
    // Binary audio frame
    audioBuffer.push(event.data);
  } else {
    // Text message
    const msg = JSON.parse(event.data);
    
    if (msg.type === 'stream_start') {
      console.log('Synthesis started');
      audioBuffer = [];
    } else if (msg.type === 'stream_complete') {
      console.log('Synthesis complete, received', audioBuffer.length, 'frames');
      
      // Combine all frames into single blob
      const fullAudio = new Blob(audioBuffer, { type: 'audio/wav' });
      const url = URL.createObjectURL(fullAudio);
      
      // Play or download
      const audio = new Audio(url);
      audio.play();
    } else if (msg.type === 'error') {
      console.error(`Error: ${msg.code} - ${msg.message}`);
    }
  }
};

socket.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

---

### WebSocket `/api/v1/tts/stream/{document_id}`

Stream text-to-speech synthesis of document chunks with playback controls.

**Perfect for**: Document audiobook experience with pause, resume, navigation.

**Connection**:
```
ws://localhost:8000/api/v1/tts/stream/{document_id}?chunk_index=0
```

**Query Parameters**:
- `chunk_index` (integer, optional): Starting chunk index. Default: 0

**Client Actions**:

**Action: play**
```json
{ "action": "play" }
```
Start or resume synthesis from current chunk.

**Action: pause**
```json
{ "action": "pause" }
```
Pause synthesis without moving position.

**Action: resume**
```json
{ "action": "resume" }
```
Resume synthesis from current position.

**Action: next**
```json
{ "action": "next" }
```
Move to next chunk and start synthesis.

**Action: previous**
```json
{ "action": "previous" }
```
Move to previous chunk and start synthesis (minimum chunk 0).

**Action: jump_to_section**
```json
{
  "action": "jump_to_section",
  "section_id": "section-002"
}
```
Jump to a specific section and start synthesis.

---

**Server Messages**:

**chunk_info** - Metadata about current chunk being synthesized:
```json
{
  "type": "chunk_info",
  "chunk_index": 5,
  "page_number": 2,
  "total_chunks": 156,
  "text": "Text content of the chunk being synthesized..."
}
```

**Binary Audio Frames**:
```
[64 KB WAV audio data chunk 1]
[64 KB WAV audio data chunk 2]
...
```

**chunk_complete** - Current chunk synthesis finished:
```json
{
  "type": "chunk_complete",
  "chunk_index": 5
}
```

**end_of_document** - Reached last chunk:
```json
{
  "type": "end_of_document"
}
```

**error** - Error occurred:
```json
{
  "type": "error",
  "code": "not_found",
  "message": "Document not found."
}
```

**Possible Error Codes**:
- `"not_found"` - Document doesn't exist
- `"empty_document"` - Document has no chunks
- `"invalid_message"` - Message not valid JSON
- `"missing_field"` - Required field in message
- `"unknown_action"` - Invalid action value
- `"tts_failed"` - Synthesis error
- `"internal_error"` - Unexpected server error

**JavaScript Example**:
```javascript
const socket = new WebSocket(
  'ws://localhost:8000/api/v1/tts/stream/550e8400-e29b-41d4-a716-446655440000?chunk_index=0'
);

let audioBuffer = [];

socket.onopen = () => {
  console.log('Connected');
  socket.send(JSON.stringify({ action: 'play' }));
};

socket.onmessage = (event) => {
  if (event.data instanceof Blob) {
    // Binary audio frame
    audioBuffer.push(event.data);
  } else {
    // Text message
    const msg = JSON.parse(event.data);
    
    if (msg.type === 'chunk_info') {
      console.log(`Playing chunk ${msg.chunk_index}/${msg.total_chunks - 1} (page ${msg.page_number})`);
      console.log(`Text: ${msg.text.substring(0, 60)}...`);
      audioBuffer = [];
    } else if (msg.type === 'chunk_complete') {
      console.log(`Chunk ${msg.chunk_index} complete`);
      
      // Play audio
      const fullAudio = new Blob(audioBuffer, { type: 'audio/wav' });
      const audio = new Audio(URL.createObjectURL(fullAudio));
      audio.play();
      
      // Auto-play next chunk
      // socket.send(JSON.stringify({ action: 'next' }));
    } else if (msg.type === 'end_of_document') {
      console.log('End of document reached');
      socket.close();
    } else if (msg.type === 'error') {
      console.error(`Error: ${msg.code} - ${msg.message}`);
    }
  }
};

// UI Controls
document.getElementById('pauseBtn').onclick = () => {
  socket.send(JSON.stringify({ action: 'pause' }));
};

document.getElementById('resumeBtn').onclick = () => {
  socket.send(JSON.stringify({ action: 'resume' }));
};

document.getElementById('nextBtn').onclick = () => {
  socket.send(JSON.stringify({ action: 'next' }));
};

document.getElementById('prevBtn').onclick = () => {
  socket.send(JSON.stringify({ action: 'previous' }));
};
```

---

## Data Schemas

### Image Description Response
```typescript
{
  description: string;      // Generated description
  detail_level: string;     // "brief" | "detailed" | "navigation"
  processing_ms: number;    // Processing time in milliseconds
}
```

### Document Upload Response
```typescript
{
  document_id: string;      // UUID
  title: string;            // Filename
  page_count: number;
  chunk_count: number;
  section_count: number;
}
```

### Section
```typescript
{
  id: string;               // Unique identifier
  index: number;            // Sequential index
  title: string;            // Section heading
  level: number;            // 1 = top-level, 2+ = nested
  start_chunk_index: number;// First chunk in section
}
```

### Chunk
```typescript
{
  id: string;               // Unique identifier
  index: number;            // Sequential index
  page_number: number;      // Original PDF page
  text: string;             // Extracted text
}
```

### Health Status
```typescript
{
  status: "ready" | "degraded";
  providers: {
    vlm: {
      ready: boolean;
      error: string | null;
    };
    tts: {
      ready: boolean;
      error: string | null;
    };
  };
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | OK | Successful request |
| 201 | Created | Resource created (upload) |
| 400 | Bad Request | Invalid input (empty text) |
| 404 | Not Found | Document/resource doesn't exist |
| 413 | Payload Too Large | File exceeds size limit |
| 415 | Unsupported Media Type | Wrong file format |
| 422 | Unprocessable Entity | Invalid parameter value |
| 500 | Internal Server Error | Processing failed |

### Error Response Format (HTTP)
```json
{
  "detail": "Error message describing the issue"
}
```

### Error Response Format (WebSocket)
```json
{
  "type": "error",
  "code": "error_code",
  "message": "Detailed error message"
}
```

### Handling Errors in Frontend

```javascript
// HTTP Error Handling
async function safeRequest(url, options = {}) {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.json();
    console.error(`Error ${response.status}:`, error.detail);
    throw new Error(error.detail);
  }
  
  return response;
}

// WebSocket Error Handling
socket.onmessage = (event) => {
  try {
    const msg = JSON.parse(event.data);
    
    if (msg.type === 'error') {
      switch(msg.code) {
        case 'not_found':
          alert('Document not found');
          break;
        case 'invalid_text':
          alert('Please provide valid text');
          break;
        case 'synthesis_failed':
          alert('Audio synthesis failed, trying again...');
          break;
        default:
          alert(`Error: ${msg.message}`);
      }
    }
  } catch (e) {
    console.error('Message parsing error:', e);
  }
};
```

---

## CORS Configuration

The API is configured to accept requests from:
- `http://localhost:8081`
- `http://localhost:19006`

**Configuration**:
- **Allow Credentials**: Yes
- **Allow Methods**: All
- **Allow Headers**: All

### Example: Fetch with Credentials
```javascript
const response = await fetch('http://localhost:8000/api/v1/documents/upload', {
  method: 'POST',
  body: formData,
  credentials: 'include'  // Include cookies if needed
});
```

---

## Quick Integration Checklist

- [ ] Health check endpoint at app start
- [ ] Image upload with vision/describe for descriptions
- [ ] PDF upload with documents/upload
- [ ] Document structure retrieval (sections & chunks)
- [ ] REST TTS endpoint for quick audio (POST /synthesize)
- [ ] WebSocket TTS for document streaming
- [ ] Error handling for all endpoints
- [ ] Retry logic for failed requests
- [ ] Audio playback capabilities (HTML5 Audio)

---

## Development Tips

1. **Test Endpoints with Swagger UI**: http://localhost:8000/docs
2. **Monitor WebSocket traffic**: Browser DevTools → Network → WS
3. **Use ReDoc for detailed schema reference**: http://localhost:8000/redoc
4. **Start with health check**: Verify all providers are ready before proceeding
5. **Handle WebSocket reconnection**: Implement exponential backoff retry logic
6. **Buffer audio frames**: Combine binary frames in correct order before playback
7. **Set text limits**: Validate input before sending (1-10,000 chars for TTS)

---

## API Changelog

### v0.1.0 (Initial Release)
- ✅ Vision endpoint for image description
- ✅ Document upload and parsing
- ✅ REST TTS endpoint for ad-hoc text synthesis
- ✅ WebSocket TTS for real-time streaming
- ✅ Document-based TTS with playback controls
- ✅ Health check endpoint
