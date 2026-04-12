"""
Test suite for document processing endpoint:
- POST /api/v1/documents/process (stateless PDF processing, no database storage)
"""

import asyncio
import httpx
from pathlib import Path


BASE_URL = "http://localhost:8000"

# Use a simple test PDF from the test suite if available
# For manual testing, provide a valid PDF path
TEST_PDF_PATH = None  # Set to a valid PDF path for testing


async def test_document_process():
    """Test POST /api/v1/documents/process"""
    print("\n" + "="*60)
    print("Testing Document Process Endpoint: POST /api/v1/documents/process")
    print("="*60)
    
    if not TEST_PDF_PATH or not Path(TEST_PDF_PATH).exists():
        print("\n[SKIPPED] No test PDF available")
        print("  To run tests, provide a valid PDF file and set TEST_PDF_PATH")
        return
    
    async with httpx.AsyncClient() as client:
        # Test 1: Valid PDF file
        print("\n[Test 1] Valid PDF file")
        with open(TEST_PDF_PATH, "rb") as f:
            response = await client.post(
                f"{BASE_URL}/api/v1/documents/process",
                files={"file": ("test.pdf", f, "application/pdf")}
            )
        
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  ✓ Response received")
            print(f"    - Title: {data.get('title')}")
            print(f"    - Pages: {data.get('page_count')}")
            print(f"    - Chunks: {data.get('chunk_count')}")
            print(f"    - Sections: {data.get('section_count')}")
            
            # Verify response structure
            if all(key in data for key in ["title", "page_count", "chunks", "sections"]):
                print("  ✓ Response has correct structure")
            else:
                print("  ✗ Response missing expected fields")
            
            # Verify chunks structure
            if data.get("chunks") and len(data["chunks"]) > 0:
                chunk = data["chunks"][0]
                if all(key in chunk for key in ["index", "page_number", "text"]):
                    print(f"  ✓ Chunk structure correct")
                else:
                    print(f"  ✗ Chunk structure incorrect")
            
            # Verify sections structure
            if data.get("sections") and len(data["sections"]) > 0:
                section = data["sections"][0]
                if all(key in section for key in ["index", "title", "level", "start_chunk_index"]):
                    print(f"  ✓ Section structure correct")
                else:
                    print(f"  ✗ Section structure incorrect")
        else:
            print(f"  ✗ Expected 200, got {response.status_code}")
            print(f"  Response: {response.text}")
        
        # Test 2: Invalid file type (should fail)
        print("\n[Test 2] Invalid file type (should fail)")
        response = await client.post(
            f"{BASE_URL}/api/v1/documents/process",
            files={"file": ("test.txt", b"not a pdf", "text/plain")}
        )
        print(f"  Status: {response.status_code}")
        if response.status_code == 415:
            print(f"  ✓ Correctly rejected invalid file type")
        else:
            print(f"  ✗ Expected 415, got {response.status_code}")
        
        # Test 3: Empty file (should fail)
        print("\n[Test 3] Empty file (should fail)")
        response = await client.post(
            f"{BASE_URL}/api/v1/documents/process",
            files={"file": ("empty.pdf", b"", "application/pdf")}
        )
        print(f"  Status: {response.status_code}")
        if response.status_code == 400:
            print(f"  ✓ Correctly rejected empty file")
        else:
            print(f"  ✗ Expected 400, got {response.status_code}")
        
        # Test 4: Missing file field (should fail)
        print("\n[Test 4] Missing file field (should fail)")
        response = await client.post(
            f"{BASE_URL}/api/v1/documents/process"
        )
        print(f"  Status: {response.status_code}")
        if response.status_code in (400, 422):
            print(f"  ✓ Correctly rejected missing file")
        else:
            print(f"  ✗ Expected 400/422, got {response.status_code}")


async def test_stateless_behavior():
    """Verify that document processing does NOT create database records"""
    print("\n" + "="*60)
    print("Testing Stateless Behavior (No Database Persistence)")
    print("="*60)
    
    if not TEST_PDF_PATH or not Path(TEST_PDF_PATH).exists():
        print("\n[SKIPPED] No test PDF available")
        return
    
    print("\n[Status] This test would require database inspection")
    print("  After calling POST /documents/process:")
    print("  1. Verify no Document records created in DB")
    print("  2. Verify no files saved to uploads/ directory")
    print("  3. Verify temporary files are cleaned up")
    print("\n  Run manually:")
    print(f"    $ sqlite3 app.db 'SELECT COUNT(*) FROM document;'")
    print(f"    $ ls uploads/")


async def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("DOCUMENT PROCESSING ENDPOINT TESTS")
    print("="*60)
    print("\nRequirements:")
    print("  - Backend server running at http://localhost:8000")
    print("  - Valid PDF file for testing")
    
    await test_document_process()
    await test_stateless_behavior()
    
    print("\n" + "="*60)
    print("Tests completed")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(main())
