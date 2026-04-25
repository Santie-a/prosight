from typing import Literal, Optional
from pydantic import BaseModel, Field

BlockType = Literal["text", "heading", "table", "figure", "formula"]

class BoundingBox(BaseModel):
    x0: float
    y0: float
    x1: float
    y1: float

class TableData(BaseModel):
    rows: list[list[str]]
    headers: Optional[list[str]] = None
    markdown: str                          # TTS-friendly linearized fallback

class ContentBlockResponse(BaseModel):
    id: str
    page_number: int
    block_index: int
    block_type: BlockType
    text: Optional[str] = None
    ocr_text: Optional[str] = None
    bbox: Optional[BoundingBox] = None
    file_id: Optional[str] = None         # present when block_type = 'figure'
    ai_description: Optional[str] = None  # present when description service has run
    tts_override: Optional[str] = None
    table: Optional[TableData] = None     # present when block_type = 'table'

class SectionResponse(BaseModel):
    id: str
    section_index: int
    title: str
    level: int
    start_block_id: str

class ProcessedDocumentResponse(BaseModel):
    title: str
    page_count: int
    blocks: list[ContentBlockResponse]
    sections: list[SectionResponse]