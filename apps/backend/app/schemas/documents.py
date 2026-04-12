from pydantic import BaseModel, Field


# --- Document Processing Response (New MVP endpoint) ---

class ProcessedChunkItem(BaseModel):
    index: int = Field(..., description="Sequential chunk index")
    page_number: int = Field(..., description="1-indexed page number")
    text: str = Field(..., description="Text content of this chunk")


class ProcessedSectionItem(BaseModel):
    index: int = Field(..., description="Sequential section index")
    title: str = Field(..., description="Section title or heading")
    level: int = Field(..., description="Heading level (1-6)")
    start_chunk_index: int = Field(..., description="Index of first chunk in this section")


class ProcessedDocumentResponse(BaseModel):
    """Response from POST /documents/process — processed PDF data (ephemeral, not stored)"""
    title: str = Field(..., description="Document title (derived from filename)")
    page_count: int = Field(..., description="Total pages in the PDF")
    chunk_count: int = Field(..., description="Number of text chunks extracted")
    section_count: int = Field(..., description="Number of sections/headings found")
    chunks: list[ProcessedChunkItem] = Field(..., description="Extracted text chunks")
    sections: list[ProcessedSectionItem] = Field(..., description="Document structure (TOC)")


# --- Legacy schemas (kept for reference, will be removed) ---

class DocumentUploadResponse(BaseModel):
    document_id: str = Field(..., description="UUID of the created document record")
    title: str = Field(..., description="Filename used as document title")
    page_count: int = Field(..., description="Total pages in the PDF")
    chunk_count: int = Field(..., description="Number of text chunks extracted")
    section_count: int = Field(..., description="Number of navigable sections found")


class SectionItem(BaseModel):
    id: str
    index: int
    title: str
    level: int
    start_chunk_index: int


class DocumentSectionsResponse(BaseModel):
    document_id: str
    sections: list[SectionItem]


class ChunkItem(BaseModel):
    id: str
    index: int
    page_number: int
    text: str


class DocumentChunksResponse(BaseModel):
    document_id: str
    total: int
    chunks: list[ChunkItem]