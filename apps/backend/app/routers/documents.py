import logging
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.documents import ProcessedDocumentResponse
from app.services.pdf import parse_pdf

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/documents", tags=["documents"])

MAX_PDF_SIZE_MB = 50
MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024


@router.post("/process", response_model=ProcessedDocumentResponse)
async def process_document(file: UploadFile = File(...)):
    """
    Process a PDF file and return extracted chunks and sections.
    
    The document is processed in-memory and NOT persisted to the database.
    This is an ephemeral operation — the frontend is responsible for storing
    the returned data if needed.
    
    Args:
        file: PDF file to process
        
    Returns:
        ProcessedDocumentResponse with document structure (chunks, sections)
        
    Raises:
        400: File size exceeds limit or wrong content type
        422: PDF parsing failed
    """
    # Validate file type
    if file.content_type not in ["application/pdf", "application/x-pdf"]:
        raise HTTPException(
            status_code=415,
            detail=f"Invalid file type: {file.content_type}. Expected application/pdf"
        )
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Validate file size
    if file_size > MAX_PDF_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File size {file_size / 1024 / 1024:.1f}MB exceeds limit of {MAX_PDF_SIZE_MB}MB"
        )
    
    if file_size == 0:
        raise HTTPException(
            status_code=400,
            detail="File is empty"
        )
    
    # Process PDF in temporary location (not stored)
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_file:
            tmp_file.write(content)
            tmp_path = Path(tmp_file.name)
        
        # Parse PDF
        parsed_doc = parse_pdf(tmp_path)
        
        # Clean up temp file
        tmp_path.unlink()
        
        logger.info(
            "Processed document | file=%s | pages=%d | chunks=%d | sections=%d",
            file.filename,
            parsed_doc.page_count,
            len(parsed_doc.chunks),
            len(parsed_doc.sections),
        )
        
        # Return response (mapped from parsed_doc to response schema)
        return ProcessedDocumentResponse(
            title=file.filename,
            page_count=parsed_doc.page_count,
            chunk_count=len(parsed_doc.chunks),
            section_count=len(parsed_doc.sections),
            chunks=[
                {"index": c.index, "page_number": c.page_number, "text": c.text}
                for c in parsed_doc.chunks
            ],
            sections=[
                {"index": s.index, "title": s.title, "level": s.level, "start_chunk_index": s.start_chunk_index}
                for s in parsed_doc.sections
            ],
        )
    
    except Exception as e:
        logger.error("PDF processing failed | file=%s | error=%s", file.filename, e)
        raise HTTPException(
            status_code=422,
            detail=f"Failed to process PDF: {str(e)}"
        )

