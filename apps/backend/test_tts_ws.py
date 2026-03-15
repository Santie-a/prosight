import asyncio
import json
import websockets

DOCUMENT_ID = "9d9547c2-e018-4818-af94-ef7653dc157d"

async def main():
    uri = f"ws://localhost:8000/api/v1/tts/stream/{DOCUMENT_ID}?chunk_index=0"
    async with websockets.connect(uri, max_size=4 * 1024 * 1024) as ws:
        await ws.send(json.dumps({"action": "play"}))

        audio_buffer = bytearray()

        while True:
            msg = await ws.recv()

            if isinstance(msg, bytes):
                audio_buffer.extend(msg)
                continue

            data = json.loads(msg)

            if data.get("type") == "chunk_info":
                audio_buffer = bytearray()
                print(f"Chunk {data['chunk_index']}/{data['total_chunks'] - 1} "
                      f"| page {data['page_number']} | {data['text'][:60]!r}")

            elif data.get("type") == "chunk_complete":
                print(f"  Chunk {data['chunk_index']} complete "
                      f"— total audio: {len(audio_buffer):,} bytes — requesting next")
                audio_buffer = bytearray()
                await ws.send(json.dumps({"action": "next"}))

            elif data.get("type") == "end_of_document":
                print("End of document.")
                break

            elif data.get("type") == "error":
                print(f"Error: {data}")
                break

asyncio.run(main())