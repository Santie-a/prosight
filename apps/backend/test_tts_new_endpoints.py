"""
Test suite for new TTS endpoints:
- POST /api/v1/tts/synthesize (REST)
- WS /api/v1/tts/stream-text (WebSocket)
"""

import asyncio
import json
import httpx
import websockets

BASE_URL = "http://localhost:8000"
WS_BASE_URL = "ws://localhost:8000"

# Test data
TEST_TEXT = "This is a test description of an image. It contains a dog sitting on a blue couch."
SHORT_TEXT = "Hello world"
LONG_TEXT = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " * 50  # ~3000 chars
EMPTY_TEXT = "   "  # Only whitespace


async def test_rest_endpoint():
    """Test POST /api/v1/tts/synthesize"""
    print("\n" + "="*60)
    print("Testing REST Endpoint: POST /api/v1/tts/synthesize")
    print("="*60)
    
    async with httpx.AsyncClient() as client:
        # Test 1: Valid request
        print("\n[Test 1] Valid request with text")
        response = await client.post(
            f"{BASE_URL}/api/v1/tts/synthesize",
            json={"text": TEST_TEXT}
        )
        print(f"  Status: {response.status_code}")
        print(f"  Content-Type: {response.headers.get('content-type')}")
        print(f"  Audio size: {len(response.content):,} bytes")
        
        if response.status_code == 200:
            # Verify it's a WAV file (starts with RIFF header)
            if response.content[:4] == b'RIFF':
                print("  ✓ Valid WAV file")
            else:
                print("  ✗ Invalid WAV file")
        else:
            print(f"  ✗ Expected 200, got {response.status_code}")
            print(f"  Response: {response.text}")
        
        # Test 2: Short text
        print("\n[Test 2] Short text request")
        response = await client.post(
            f"{BASE_URL}/api/v1/tts/synthesize",
            json={"text": SHORT_TEXT}
        )
        print(f"  Status: {response.status_code}")
        print(f"  Audio size: {len(response.content):,} bytes")
        if response.status_code == 200 and response.content[:4] == b'RIFF':
            print("  ✓ Valid WAV file")
        
        # Test 3: Long text
        print("\n[Test 3] Long text request")
        response = await client.post(
            f"{BASE_URL}/api/v1/tts/synthesize",
            json={"text": LONG_TEXT}
        )
        print(f"  Status: {response.status_code}")
        print(f"  Audio size: {len(response.content):,} bytes")
        if response.status_code == 200 and response.content[:4] == b'RIFF':
            print("  ✓ Valid WAV file")
        
        # Test 4: Empty text (should fail)
        print("\n[Test 4] Empty/whitespace text (should fail)")
        response = await client.post(
            f"{BASE_URL}/api/v1/tts/synthesize",
            json={"text": EMPTY_TEXT}
        )
        print(f"  Status: {response.status_code}")
        if response.status_code == 400:
            print(f"  ✓ Correctly rejected empty text")
            print(f"  Detail: {response.json().get('detail')}")
        else:
            print(f"  ✗ Expected 400, got {response.status_code}")
        
        # Test 5: Missing text field (should fail)
        print("\n[Test 5] Missing text field (should fail)")
        response = await client.post(
            f"{BASE_URL}/api/v1/tts/synthesize",
            json={}
        )
        print(f"  Status: {response.status_code}")
        if response.status_code in (400, 422):
            print(f"  ✓ Correctly rejected missing field")
        else:
            print(f"  ✗ Expected 400/422, got {response.status_code}")


async def test_websocket_endpoint():
    """Test WS /api/v1/tts/stream-text"""
    print("\n" + "="*60)
    print("Testing WebSocket Endpoint: WS /api/v1/tts/stream-text")
    print("="*60)
    
    # Test 1: Valid WebSocket connection
    print("\n[Test 1] Valid WebSocket connection with text")
    try:
        uri = f"{WS_BASE_URL}/api/v1/tts/stream-text"
        async with websockets.connect(uri, max_size=4 * 1024 * 1024) as ws:
            # Send text
            await ws.send(json.dumps({"text": TEST_TEXT}))
            print("  Sent message with text")
            
            audio_buffer = bytearray()
            frame_count = 0
            
            while True:
                msg = await ws.recv()
                
                if isinstance(msg, bytes):
                    audio_buffer.extend(msg)
                    frame_count += 1
                    continue
                
                data = json.loads(msg)
                msg_type = data.get("type")
                
                if msg_type == "stream_start":
                    print(f"  ✓ Received stream_start message")
                    print(f"    Text: {data.get('text')[:60]}...")
                
                elif msg_type == "stream_complete":
                    print(f"  ✓ Received stream_complete message")
                    print(f"  Total audio frames: {frame_count}")
                    print(f"  Total audio bytes: {len(audio_buffer):,}")
                    
                    if audio_buffer[:4] == b'RIFF':
                        print(f"  ✓ Valid WAV file received")
                    else:
                        print(f"  ✗ Invalid WAV file (got {audio_buffer[:4]})")
                    
                    break
                
                elif msg_type == "error":
                    print(f"  ✗ Error: {data}")
                    break
        
        print("  ✓ WebSocket closed cleanly")
    
    except Exception as e:
        print(f"  ✗ WebSocket error: {e}")
    
    # Test 2: Empty text (should fail)
    print("\n[Test 2] Empty text via WebSocket (should fail)")
    try:
        uri = f"{WS_BASE_URL}/api/v1/tts/stream-text"
        async with websockets.connect(uri, max_size=4 * 1024 * 1024) as ws:
            await ws.send(json.dumps({"text": EMPTY_TEXT}))
            
            msg = await asyncio.wait_for(ws.recv(), timeout=2)
            data = json.loads(msg)
            
            if data.get("type") == "error":
                print(f"  ✓ Correctly rejected empty text")
                print(f"    Error: {data.get('message')}")
            else:
                print(f"  ✗ Expected error, got: {data}")
    
    except asyncio.TimeoutError:
        print(f"  ✗ Timeout waiting for response")
    except Exception as e:
        print(f"  ✗ WebSocket error: {e}")
    
    # Test 3: Invalid JSON (should fail)
    print("\n[Test 3] Invalid JSON (should fail)")
    try:
        uri = f"{WS_BASE_URL}/api/v1/tts/stream-text"
        async with websockets.connect(uri, max_size=4 * 1024 * 1024) as ws:
            await ws.send("not valid json {")
            
            msg = await asyncio.wait_for(ws.recv(), timeout=2)
            data = json.loads(msg)
            
            if data.get("type") == "error":
                print(f"  ✓ Correctly rejected invalid JSON")
                print(f"    Error: {data.get('message')}")
            else:
                print(f"  ✗ Expected error, got: {data}")
    
    except asyncio.TimeoutError:
        print(f"  ✗ Timeout waiting for response")
    except Exception as e:
        print(f"  ✗ WebSocket error: {e}")
    
    # Test 4: Missing text field (should fail)
    print("\n[Test 4] Missing text field (should fail)")
    try:
        uri = f"{WS_BASE_URL}/api/v1/tts/stream-text"
        async with websockets.connect(uri, max_size=4 * 1024 * 1024) as ws:
            await ws.send(json.dumps({"voice": "af_heart"}))
            
            msg = await asyncio.wait_for(ws.recv(), timeout=2)
            data = json.loads(msg)
            
            if data.get("type") == "error":
                print(f"  ✓ Correctly rejected missing text field")
                print(f"    Error: {data.get('message')}")
            else:
                print(f"  ✗ Expected error, got: {data}")
    
    except asyncio.TimeoutError:
        print(f"  ✗ Timeout waiting for response")
    except Exception as e:
        print(f"  ✗ WebSocket error: {e}")


async def test_comparison():
    """Compare REST and WebSocket endpoints"""
    print("\n" + "="*60)
    print("Comparing REST vs WebSocket Endpoints")
    print("="*60)
    
    test_text = "Compare these two endpoints please."
    
    # Get audio from REST
    print("\n[REST] Fetching audio...")
    rest_audio = None
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/v1/tts/synthesize",
            json={"text": test_text}
        )
        if response.status_code == 200:
            rest_audio = response.content
            print(f"  Audio size: {len(rest_audio):,} bytes")
    
    # Get audio from WebSocket
    print("\n[WebSocket] Fetching audio...")
    ws_audio = bytearray()
    try:
        uri = f"{WS_BASE_URL}/api/v1/tts/stream-text"
        async with websockets.connect(uri, max_size=4 * 1024 * 1024) as ws:
            await ws.send(json.dumps({"text": test_text}))
            
            while True:
                msg = await ws.recv()
                
                if isinstance(msg, bytes):
                    ws_audio.extend(msg)
                elif isinstance(msg, str):
                    data = json.loads(msg)
                    if data.get("type") == "stream_complete":
                        break
        
        print(f"  Audio size: {len(ws_audio):,} bytes")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Compare
    print("\n[Comparison]")
    if rest_audio and ws_audio:
        print(f"  REST audio size:      {len(rest_audio):,} bytes")
        print(f"  WebSocket audio size: {len(ws_audio):,} bytes")
        
        # Check if both are valid WAV
        rest_valid = rest_audio[:4] == b'RIFF'
        ws_valid = bytes(ws_audio[:4]) == b'RIFF'
        
        print(f"  REST valid WAV:       {'✓' if rest_valid else '✗'}")
        print(f"  WebSocket valid WAV:  {'✓' if ws_valid else '✗'}")
        
        # Note: Audio content might differ due to multiple synthesis runs
        print(f"  Audio content may differ (separate synthesis runs)")


async def main():
    """Run all tests"""
    print("\n" + ""*60)
    print("TTS NEW ENDPOINTS TEST SUITE")
    print("*"*60)
    
    await test_rest_endpoint()
    await test_websocket_endpoint()
    await test_comparison()
    
    print("\n" + "="*60)
    print("Test suite completed!")
    print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
