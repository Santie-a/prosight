import logging
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.documents import (
    BoundingBox,
    ContentBlockResponse,
    ProcessedDocumentResponse,
    SectionResponse,
    TableData,
)
from app.services.pdf import ParsedBlock, ParsedDocument, parse_pdf

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/documents", tags=["documents"])

MAX_PDF_SIZE_MB = 50
MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024


@router.post("/process", response_model=ProcessedDocumentResponse)
async def process_document(file: UploadFile = File(...)):
    """
    Process a PDF file and return extracted content blocks and sections.

    The document is processed in-memory and NOT persisted to the database.
    This is an ephemeral operation — the frontend is responsible for storing
    the returned data if needed.

    Figures are detected and recorded as blocks but images are not saved to
    disk at this stage. figure_path will always be null in the response.

    Args:
        file: PDF file to process.

    Returns:
        ProcessedDocumentResponse with typed content blocks and sections.

    Raises:
        415: Wrong content type.
        413: File size exceeds limit.
        400: File is empty.
        422: PDF parsing failed.
    """
    if file.content_type not in ("application/pdf", "application/x-pdf"):
        raise HTTPException(
            status_code=415,
            detail=f"Invalid file type: {file.content_type}. Expected application/pdf",
        )

    content = await file.read()
    file_size = len(content)

    if file_size > MAX_PDF_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                f"File size {file_size / 1024 / 1024:.1f} MB "
                f"exceeds the limit of {MAX_PDF_SIZE_MB} MB"
            ),
        )

    if file_size == 0:
        raise HTTPException(status_code=400, detail="File is empty")

    tmp_path: Path | None = None

    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_file:
            tmp_file.write(content)
            tmp_path = Path(tmp_file.name)

        # figure_output_dir=None — figures detected but not saved at this stage
        # parsed_doc: ParsedDocument = parse_pdf(tmp_path, figure_output_dir=Path("./temp_images"))
        parsed_doc: ParsedDocument = parse_pdf(tmp_path)

    except Exception as exc:
        logger.error("PDF processing failed | file=%s | error=%s", file.filename, exc)
        raise HTTPException(
            status_code=422,
            detail=f"Failed to process PDF: {exc}",
        )

    finally:
        if tmp_path and tmp_path.exists():
            tmp_path.unlink()

    logger.info(
        "Processed document | file=%s | pages=%d | blocks=%d | sections=%d",
        file.filename,
        parsed_doc.page_count,
        len(parsed_doc.blocks),
        len(parsed_doc.sections),
    )

    return ProcessedDocumentResponse(
        title=file.filename or parsed_doc.title,
        page_count=parsed_doc.page_count,
        blocks=[_map_block(b) for b in parsed_doc.blocks],
        sections=[
            SectionResponse(
                id=s.id,
                section_index=s.section_index,
                title=s.title,
                level=s.level,
                start_block_id=s.start_block_id,
            )
            for s in parsed_doc.sections
        ],
    )


# ---------------------------------------------------------------------------
# Mapping helper
# ---------------------------------------------------------------------------

def _map_block(block: ParsedBlock) -> ContentBlockResponse:
    """Map a ParsedBlock from the service layer to the API response schema."""
    return ContentBlockResponse(
        id=block.id,
        page_number=block.page_number,
        block_index=block.block_index,
        block_type=block.block_type,
        text=block.text,
        ocr_text=block.ocr_text,
        bbox=(
            BoundingBox(
                x0=block.bbox.x0,
                y0=block.bbox.y0,
                x1=block.bbox.x1,
                y1=block.bbox.y1,
            )
            if block.bbox is not None
            else None
        ),
        # figure_path is internal (filesystem); expose only whether a figure
        # file exists, not the raw path. The frontend has no use for a server
        # filesystem path at this stage.
        file_id=None,
        ai_description=None,
        tts_override=None,
        table=(
            TableData(
                rows=block.table.rows,
                headers=block.table.headers,
                markdown=block.table.markdown,
            )
            if block.table is not None
            else None
        ),
    )