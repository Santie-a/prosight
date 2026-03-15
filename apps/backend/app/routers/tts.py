import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

from app.db.database import get_db
from app.db.models import Document, DocumentChunk, DocumentSection
from app.dependencies import get_tts_provider
from app.schemas.tts import (
    ChunkInfoMessage,
    ChunkCompleteMessage,
    EndOfDocumentMessage,
    ErrorMessage,
)

WEBSOCKET_CHUNK_BYTES = 65536  # 64 KB per frame — safe for all WS implementations

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/tts", tags=["tts"])


async def _send_json(ws: WebSocket, payload: dict) -> None:
    if ws.client_state == WebSocketState.CONNECTED:
        await ws.send_text(json.dumps(payload))


async def _send_error(ws: WebSocket, code: str, message: str) -> None:
    await _send_json(ws, ErrorMessage(code=code, message=message).model_dump())


@router.websocket("/stream/{document_id}")
async def tts_stream(
    websocket: WebSocket,
    document_id: str,
    chunk_index: int = 0,
):
    await websocket.accept()

    # --- Load document and chunks ---
    db = next(get_db())
    try:
        document = db.get(Document, document_id)
        if document is None:
            await _send_error(websocket, "not_found", "Document not found.")
            await websocket.close(code=1008)
            return

        chunks: list[DocumentChunk] = document.chunks
        total_chunks = len(chunks)

        if total_chunks == 0:
            await _send_error(websocket, "empty_document", "Document has no text chunks.")
            await websocket.close(code=1008)
            return

        # Clamp starting index
        current_index = max(0, min(chunk_index, total_chunks - 1))

        tts = get_tts_provider()
        paused = False

        logger.info(
            "WS connected | document=%s | start_chunk=%d | total=%d",
            document_id, current_index, total_chunks,
        )

        while True:
            try:
                raw = await websocket.receive_text()
                message = json.loads(raw)
            except WebSocketDisconnect:
                logger.info("WS disconnected | document=%s", document_id)
                return
            except json.JSONDecodeError:
                await _send_error(websocket, "invalid_message", "Message must be valid JSON.")
                continue

            action = message.get("action")

            if action in ("play", "resume"):
                paused = False
                await _generate_and_send(
                    websocket, tts, chunks, current_index, total_chunks
                )

            elif action == "pause":
                paused = True
                # No response needed — client owns playback state.
                # Server simply will not generate until play/resume.

            elif action == "next":
                if current_index >= total_chunks - 1:
                    await _send_json(
                        websocket, EndOfDocumentMessage().model_dump()
                    )
                else:
                    current_index += 1
                    if not paused:
                        await _generate_and_send(
                            websocket, tts, chunks, current_index, total_chunks
                        )

            elif action == "previous":
                current_index = max(0, current_index - 1)
                if not paused:
                    await _generate_and_send(
                        websocket, tts, chunks, current_index, total_chunks
                    )

            elif action == "jump_to_section":
                section_id = message.get("section_id")
                if not section_id:
                    await _send_error(
                        websocket, "missing_field", "jump_to_section requires section_id."
                    )
                    continue

                section = db.get(DocumentSection, section_id)
                if section is None or section.document_id != document_id:
                    await _send_error(
                        websocket, "not_found", f"Section {section_id} not found."
                    )
                    continue

                current_index = max(
                    0, min(section.start_chunk_index, total_chunks - 1)
                )
                paused = False
                await _generate_and_send(
                    websocket, tts, chunks, current_index, total_chunks
                )

            else:
                await _send_error(
                    websocket, "unknown_action", f"Unknown action: {action!r}."
                )

    except Exception as e:
        logger.error("Unexpected WS error | document=%s | %s", document_id, e)
        await _send_error(websocket, "internal_error", "An unexpected error occurred.")
    finally:
        db.close()
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close()


async def _send_wav_in_frames(websocket: WebSocket, wav_bytes: bytes) -> None:
    """
    Splits a WAV payload into fixed-size frames.
    Only the first frame contains the WAV header — subsequent frames are
    raw PCM continuations. The client appends them in order.
    Actually, simplest for the client: send the entire WAV split into
    binary frames of max 64 KB. The client buffers all frames between
    chunk_info and chunk_complete, then concatenates and plays.
    """
    for i in range(0, len(wav_bytes), WEBSOCKET_CHUNK_BYTES):
        if websocket.client_state != WebSocketState.CONNECTED:
            return
        await websocket.send_bytes(wav_bytes[i: i + WEBSOCKET_CHUNK_BYTES])


async def _generate_and_send(
    websocket: WebSocket,
    tts,
    chunks: list[DocumentChunk],
    index: int,
    total_chunks: int,
) -> None:
    chunk = chunks[index]

    await _send_json(websocket, ChunkInfoMessage(
        chunk_index=index,
        page_number=chunk.page_number,
        total_chunks=total_chunks,
        text=chunk.text,
    ).model_dump())

    try:
        for wav_segment in tts.synthesize(chunk.text):
            if websocket.client_state != WebSocketState.CONNECTED:
                return
            await _send_wav_in_frames(websocket, wav_segment)
    except Exception as e:
        logger.error("TTS synthesis failed for chunk %d: %s", index, e)
        await _send_error(websocket, "tts_failed", f"Failed to synthesize chunk {index}.")
        return

    await _send_json(websocket, ChunkCompleteMessage(chunk_index=index).model_dump())