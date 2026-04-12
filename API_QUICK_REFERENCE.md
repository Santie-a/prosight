# Vision App API - Quick Reference

**Base URL**: http://localhost:8000  
**API Prefix**: /api/v1  
**Interactive Docs**: http://localhost:8000/docs

> **MVP**: Simplified stateless API. Documents processed in-response, not persisted on server.

---

## Endpoints Overview

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check
| `/vision/describe` | POST | Image analysis
| `/documents/process` | POST | PDF parsing (stateless)
| `/tts/synthesize` | POST | Text-to-speech

---

## Common Tasks

### 1. Describe an Image
```javascript
const formData = new FormData();
formData.append('image', imageFile);
formData.append('detail_level', 'detailed');

fetch('http://localhost:8000/api/v1/vision/describe', {
  method: 'POST',
  body: formData
})
.then(r => r.json())
.then(({ description }) => console.log(description));
```

### 2. Process a PDF
```javascript
const formData = new FormData();
formData.append('file', pdfFile);

fetch('http://localhost:8000/api/v1/documents/process', {
  method: 'POST',
  body: formData
})
.then(r => r.json())
.then(({ chunks, sections, title }) => {
  // Store on frontend (localStorage, state, etc.)
  localStorage.setItem('document', JSON.stringify({ chunks, sections, title }));
  
  // Display sections as table of contents
  sections.forEach(s => {
    console.log(`${'  '.repeat(s.level - 1)}${s.title}`);
  });
});
```

### 3. Text to Speech
```javascript
fetch('http://localhost:8000/api/v1/tts/synthesize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Hello world' })
})
.then(r => r.blob())
.then(blob => {
  const audio = new Audio(URL.createObjectURL(blob));
  audio.play();
  
  // Or download:
  // const url = URL.createObjectURL(blob);
  // const a = document.createElement('a');
  // a.href = url; a.download = 'audio.wav'; a.click();
});
```

### 4. Image → Description → Audio (Complete Flow)
```javascript
async function imageToAudio(imageFile) {
  // Step 1: Describe image
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('detail_level', 'detailed');
  
  const descRes = await fetch('http://localhost:8000/api/v1/vision/describe', {
    method: 'POST',
    body: formData
  });
  const { description } = await descRes.json();
  
  // Step 2: Synthesize to audio
  const audioRes = await fetch('http://localhost:8000/api/v1/tts/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: description })
  });
  
  const blob = await audioRes.blob();
  const audio = new Audio(URL.createObjectURL(blob));
  audio.play();
  
  return { description, audio: blob };
}
```

---

## API Details

### POST `/api/v1/vision/describe`

**Request:**
```json
Content-Type: multipart/form-data

image: <file>
detail_level: "brief" | "detailed" | "navigation"
```

**Response (200):**
```json
{
  "description": "A dog sitting on a blue couch...",
  "detail_level": "detailed",
  "processing_ms": 1250
}
```

**Errors:**
- 413: Image > 10MB
- 415: Must be JPEG/PNG

---

### POST `/api/v1/documents/process`

**Request:**
```json
Content-Type: multipart/form-data

file: <PDF file>
```

**Response (200):**
```json
{
  "title": "research-paper",
  "page_count": 42,
  "chunk_count": 156,
  "section_count": 8,
  "chunks": [
    {
      "index": 0,
      "page_number": 1,
      "text": "First chunk of text..."
    }
  ],
  "sections": [
    {
      "index": 0,
      "title": "Introduction",
      "level": 1,
      "start_chunk_index": 0
    }
  ]
}
```

**Key Points:**
- Takes PDF in request, returns all chunks + sections in response
- **No database storage** — processes, returns, deletes
- Frontend must store `chunks` and `sections` if needed
- Re-upload to get fresh parsing

**Errors:**
- 400: Empty file
- 413: File > 50MB
- 415: Not a PDF
- 422: Parse failed

---

### POST `/api/v1/tts/synthesize`

**Request:**
```json
{
  "text": "Text to synthesize",
  "voice": "af_heart"  // optional
}
```

**Response (200):**
```
Content-Type: audio/wav
[Binary WAV audio data]
```

**Errors:**
- 400: Empty text
- 500: Synthesis failed

---

### GET `/api/v1/health`

**Response (200):**
```json
{
  "status": "ready",
  "providers": {
    "vlm": { "ready": true, "error": null },
    "tts": { "ready": true, "error": null }
  }
}
```

---

## Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Success |
| 400 | Bad Request | Invalid input |
| 413 | Payload Too Large | File size exceeded |
| 415 | Unsupported Media Type | Wrong file type |
| 422 | Unprocessable Entity | Validation failed |
| 500 | Internal Server Error | Processing failed |

---

## Size Limits

| Resource | Limit |
|----------|-------|
| Image | 10 MB |
| PDF | 50 MB |
| TTS Text | 10,000 chars |

---

## Frontend Storage Strategy

Since backend doesn't persist documents:

1. **Receive** chunks + sections from `/documents/process`
2. **Store in:**
   - **Memory**: Simplest, lost on page refresh
   - **localStorage**: Survives refresh (limited space)
   - **IndexedDB**: For production, best for large docs
3. **Re-fetch** if needed, or implement: `GET /documents/{local_id}` on your frontend

**localStorage Example:**
```javascript
// Save
const doc = { chunks, sections, title };
localStorage.setItem('currentDoc', JSON.stringify(doc));

// Load
const doc = JSON.parse(localStorage.getItem('currentDoc'));
```

---

## cURL Examples

### Health Check
```bash
curl http://localhost:8000/api/v1/health
```

### Describe Image
```bash
curl -X POST http://localhost:8000/api/v1/vision/describe \
  -F "image=@photo.jpg" \
  -F "detail_level=detailed"
```

### Process PDF
```bash
curl -X POST http://localhost:8000/api/v1/documents/process \
  -F "file=@document.pdf" | jq .
```

### Synthesize Text
```bash
curl -X POST http://localhost:8000/api/v1/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world"}' \
  -o audio.wav
```

---

## Error Handling

```javascript
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error('API Error:', err.message);
    throw err;
  }
}

// Usage
try {
  const data = await apiCall('http://localhost:8000/api/v1/health');
  console.log(data);
} catch (err) {
  // Handle error
}
```

---

## Interactive Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Full Docs**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

---

## CORS Configuration

Auto-enabled origins:
- http://localhost:8081
- http://localhost:19006

---

## Providers

- **Vision**: Moondream2 (CUDA-optimized)
- **TTS**: Kokoro-82M (CPU, af_heart voice)
- **Database**: SQLite (for future use)
# Vision App API - Quick Reference

**Base URL**: http://localhost:8000  
**API Prefix**: /api/v1  
**Interactive Docs**: http://localhost:8000/docs

> **MVP Status**: Simplified stateless API. Documents are processed and returned in-response—not persisted on the server.

---

## Endpoints

### Health & Status
```
GET /health
→ Check if all providers are ready
```

### Vision (Image Analysis)
```
POST /vision/describe
→ Analyze image → Get description
   Parameters: image (file), detail_level (brief|detailed|navigation)
   Response: {description, detail_level, processing_ms}
```

### Documents (PDF Processing)
```
POST /documents/process
→ Parse PDF → Return chunks & sections (no storage)
   Parameter: file (PDF, max 50MB)
   Response: {title, page_count, chunk_count, section_count, chunks: [...], sections: [...]}
```

### Text-to-Speech (TTS)
```
POST /tts/synthesize
→ Text → Audio file (WAV)
   Body: {text, voice?}
   Response: audio/wav stream
```

---

## Endpoint Summary
WS /tts/stream-text
→ Text → Real-time audio stream
   Client sends: {text}
   Server sends: stream_start → binary frames → stream_complete
   
WS /tts/stream/{document_id}
→ Audiobook with playback controls
   URL param: document_id, query: chunk_index?
   Client sends: {action: "play"|"pause"|"resume"|"next"|"previous"|"jump_to_section"}
   Server sends: chunk_info → binary frames → chunk_complete
```

---

## Common Tasks

### 1. Upload and Describe an Image
```javascript
// Step 1: Upload image
const formData = new FormData();
formData.append('image', imageFile);
formData.append('detail_level', 'detailed');

const response = await fetch('http://localhost:8000/api/v1/vision/describe', {
  method: 'POST',
  body: formData
});

const { description } = await response.json();
console.log(description);
```

### 2. Upload PDF and Get Sections
```javascript
// Step 1: Upload PDF
const formData = new FormData();
formData.append('file', pdfFile);

const uploadRes = await fetch('http://localhost:8000/api/v1/documents/upload', {
  method: 'POST',
  body: formData
});

const { document_id } = await uploadRes.json();

// Step 2: Get sections (table of contents)
const sectionsRes = await fetch(
  `http://localhost:8000/api/v1/documents/${document_id}/sections`
);

const { sections } = await sectionsRes.json();
sections.forEach(s => console.log(`${'  '.repeat(s.level - 1)}${s.title}`));
```

### 3. Convert Image Description to Audio (Quick)
```javascript
// Describe image
const descRes = await fetch('http://localhost:8000/api/v1/vision/describe', {
  method: 'POST',
  body: formData
});
const { description } = await descRes.json();

// Synthesize to audio
const audioRes = await fetch('http://localhost:8000/api/v1/tts/synthesize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: description })
});

const blob = await audioRes.blob();
const audio = new Audio(URL.createObjectURL(blob));
audio.play();
```

### 4. Stream Audio Description via WebSocket (Real-time)
```javascript
const description = "A dog sitting on a blue couch in a bright room";
const socket = new WebSocket('ws://localhost:8000/api/v1/tts/stream-text');

let frames = [];

socket.onopen = () => {
  socket.send(JSON.stringify({ text: description }));
};

socket.onmessage = (event) => {
  if (event.data instanceof Blob) {
    frames.push(event.data);
  } else {
    const msg = JSON.parse(event.data);
    
    if (msg.type === 'stream_start') {
      console.log('Starting stream...');
    } else if (msg.type === 'stream_complete') {
      const audio = new Blob(frames, { type: 'audio/wav' });
      new Audio(URL.createObjectURL(audio)).play();
    } else if (msg.type === 'error') {
      console.error(msg.message);
    }
  }
};
```

### 5. Play Document as Audiobook (with Controls)
```javascript
const documentId = "550e8400-e29b-41d4-a716-446655440000";
const socket = new WebSocket(
  `ws://localhost:8000/api/v1/tts/stream/${documentId}?chunk_index=0`
);

let frames = [];
let currentChunk = 0;

socket.onopen = () => {
  socket.send(JSON.stringify({ action: 'play' }));
};

socket.onmessage = (event) => {
  if (event.data instanceof Blob) {
    frames.push(event.data);
  } else {
    const msg = JSON.parse(event.data);
    
    if (msg.type === 'chunk_info') {
      currentChunk = msg.chunk_index;
      console.log(`Playing: ${msg.text.substring(0, 60)}...`);
    } else if (msg.type === 'chunk_complete') {
      // Play audio
      const audio = new Blob(frames, { type: 'audio/wav' });
      new Audio(URL.createObjectURL(audio)).play();
      frames = [];
    }
  }
};

// Controls
function play() { socket.send(JSON.stringify({ action: 'play' })); }
function pause() { socket.send(JSON.stringify({ action: 'pause' })); }
function next() { socket.send(JSON.stringify({ action: 'next' })); }
function prev() { socket.send(JSON.stringify({ action: 'previous' })); }
function jump(sectionId) { 
  socket.send(JSON.stringify({ action: 'jump_to_section', section_id: sectionId })); 
}
```

---

## Status Codes Quick Reference

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Request successful |
| 201 | Created | Resource created (upload) |
| 400 | Bad Request | Invalid input |
| 404 | Not Found | Resource doesn't exist |
| 413 | Too Large | File exceeds limit |
| 415 | Wrong Format | File type not supported |
| 422 | Invalid Data | Parameter validation failed |
| 500 | Server Error | Processing failed |

---

## Error Handling Template

```javascript
async function apiCall(url, options = {}) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Request failed');
    }
    
    return response;
  } catch (error) {
    console.error('API Error:', error.message);
    // Show error UI to user
    throw error;
  }
}

// WebSocket errors
socket.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  
  if (msg.type === 'error') {
    console.error(`[${msg.code}] ${msg.message}`);
    // Handle specific error types
    if (msg.code === 'not_found') {
      // Show 404 error
    } else if (msg.code === 'synthesis_failed') {
      // Show retry button
    }
  }
};
```

---

## Size Limits

| Resource | Limit | Note |
|----------|-------|------|
| Image | 10 MB | JPEG/PNG only |
| PDF | 50 MB | Text extraction |
| Text (TTS) | 10,000 chars | Per request |

---

## Configuration

### CORS Origins (Auto-enabled)
- http://localhost:8081
- http://localhost:19006

### Providers
- **Vision**: Moondream2 (CUDA-optimized)
- **TTS**: Kokoro-82M (CPU optimized, af_heart voice)
- **Database**: SQLite (auto-initialized)

---

## Testing

### Using cURL

```bash
# Health check
curl http://localhost:8000/api/v1/health

# Upload image and get description
curl -X POST http://localhost:8000/api/v1/vision/describe \
  -F "image=@photo.jpg" \
  -F "detail_level=detailed"

# Upload PDF
curl -X POST http://localhost:8000/api/v1/documents/upload \
  -F "file=@document.pdf"

# Synthesize text
curl -X POST http://localhost:8000/api/v1/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world"}' \
  -o audio.wav
```

### Using JavaScript
```javascript
// Check health
fetch('http://localhost:8000/api/v1/health')
  .then(r => r.json())
  .then(console.log);

// List all endpoints (Swagger)
// Open: http://localhost:8000/docs
```

---

## Troubleshooting

### "Provider not ready"
→ Check health endpoint, wait for model loading

### "File too large"
→ Reduce file size (images <10MB, PDFs <50MB)

### "WebSocket connection refused"
→ Ensure ws:// (not http://), check port 8000 open

### "Audio playback stuttering"
→ Collect all binary frames before playing

### "Synthesis taking too long"
→ Check server logs, verify GPU/CPU availability

---

## Integration Flow Example

```
Frontend                                Backend

1. Check Health
   GET /health ─────────────────────→ {"status": "ready"}
                ←─────────────────────

2. Upload Image
   POST /vision/describe ─────────→ {"description": "..."}
   (with image file)
                ←─────────────────────

3. Convert to Audio
   WS /tts/stream-text ─────────→ {stream_start}
   {text: "description"}
                ←───────── [binary frames]
                ←───────── {stream_complete}

4. Play Audio in UI
   Audio() → play()
```

---

## Support & Documentation

- **Full Docs**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Interactive Swagger**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Server Health**: http://localhost:8000/api/v1/health

