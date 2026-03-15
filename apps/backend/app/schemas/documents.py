from pydantic import BaseModel, Field


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