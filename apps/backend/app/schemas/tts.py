from typing import Literal
from pydantic import BaseModel


# --- Client → Server ---

class PlayAction(BaseModel):
    action: Literal["play"]

class PauseAction(BaseModel):
    action: Literal["pause"]

class ResumeAction(BaseModel):
    action: Literal["resume"]

class NextAction(BaseModel):
    action: Literal["next"]

class PreviousAction(BaseModel):
    action: Literal["previous"]

class JumpToSectionAction(BaseModel):
    action: Literal["jump_to_section"]
    section_id: str


# --- Server → Client (JSON frames) ---

class ChunkInfoMessage(BaseModel):
    type: Literal["chunk_info"] = "chunk_info"
    chunk_index: int
    page_number: int
    total_chunks: int
    text: str

class EndOfDocumentMessage(BaseModel):
    type: Literal["end_of_document"] = "end_of_document"

class ErrorMessage(BaseModel):
    type: Literal["error"] = "error"
    code: str
    message: str

class ChunkCompleteMessage(BaseModel):
    type: Literal["chunk_complete"] = "chunk_complete"
    chunk_index: int