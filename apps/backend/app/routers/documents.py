import logging
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db.models import Document, DocumentChunk, DocumentSection
from app.dependencies import DBSession
from app.schemas.documents import (
    ChunkItem,
    DocumentChunksResponse,
    DocumentSectionsResponse,
    DocumentUploadResponse,
    SectionItem,
)
from app.services.pdf import parse_pdf

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/documents", tags=["documents"])
settings = get_settings()

MAX_PDF_SIZE_MB = 50
MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024


@router.post("/upload", response_model=DocumentUploadResponse, status_code=201)
async def upload_document(
    db: DBSession,
    file: UploadFile = File(..., description="PDF file"),
) -> DocumentUploadResponse:
    # --- Validate content type ---
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(
            status_code=415,
            detail="Only PDF files are accepted.",
        )

    # --- Read and size-check ---
    pdf_bytes = await file.read()
    if len(pdf_bytes) > MAX_PDF_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of {MAX_PDF_SIZE_MB} MB.",
        )

    # --- Save to disk ---
    document_id = str(uuid.uuid4())
    uploads_dir = settings.uploads_dir
    uploads_dir.mkdir(parents=True, exist_ok=True)
    file_path = uploads_dir / f"{document_id}.pdf"

    try:
        file_path.write_bytes(pdf_bytes)
    except OSError as e:
        logger.error("Failed to write PDF to disk: %s", e)
        raise HTTPException(status_code=500, detail="Failed to save file.")

    # --- Parse ---
    try:
        parsed = parse_pdf(file_path)
    except Exception as e:
        logger.error("PDF parsing failed for %s: %s", file_path, e)
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail="Could not parse PDF.")

    original_title = Path(file.filename).stem if file.filename else document_id

    # --- Persist ---
    try:
        document = Document(
            id=document_id,
            title=original_title,
            file_path=str(file_path),
            page_count=parsed.page_count,
        )
        db.add(document)

        for chunk in parsed.chunks:
            db.add(DocumentChunk(
                document_id=document_id,
                index=chunk.index,
                page_number=chunk.page_number,
                text=chunk.text,
            ))

        for section in parsed.sections:
            db.add(DocumentSection(
                document_id=document_id,
                index=section.index,
                title=section.title,
                level=section.level,
                start_chunk_index=section.start_chunk_index,
            ))

        db.commit()
    except Exception as e:
        db.rollback()
        file_path.unlink(missing_ok=True)
        logger.error("DB persist failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to save document.")

    logger.info(
        "Document uploaded | id=%s | pages=%d | chunks=%d | sections=%d",
        document_id,
        parsed.page_count,
        len(parsed.chunks),
        len(parsed.sections),
    )

    return DocumentUploadResponse(
        document_id=document_id,
        title=original_title,
        page_count=parsed.page_count,
        chunk_count=len(parsed.chunks),
        section_count=len(parsed.sections),
    )


@router.get("/{document_id}/sections", response_model=DocumentSectionsResponse)
def get_sections(document_id: str, db: DBSession) -> DocumentSectionsResponse:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    return DocumentSectionsResponse(
        document_id=document_id,
        sections=[
            SectionItem(
                id=s.id,
                index=s.index,
                title=s.title,
                level=s.level,
                start_chunk_index=s.start_chunk_index,
            )
            for s in document.sections
        ],
    )


@router.get("/{document_id}/chunks", response_model=DocumentChunksResponse)
def get_chunks(
    document_id: str,
    db: DBSession,
    offset: int = 0,
    limit: int = 50,
) -> DocumentChunksResponse:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    total = len(document.chunks)
    page = document.chunks[offset: offset + limit]

    return DocumentChunksResponse(
        document_id=document_id,
        total=total,
        chunks=[
            ChunkItem(
                id=c.id,
                index=c.index,
                page_number=c.page_number,
                text=c.text,
            )
            for c in page
        ],
    )