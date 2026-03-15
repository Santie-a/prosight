import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)
    # return datetime.utcnow()


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_uuid
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    page_count: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_now
    )

    chunks: Mapped[list["DocumentChunk"]] = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentChunk.index",
    )
    sections: Mapped[list["DocumentSection"]] = relationship(
        "DocumentSection",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentSection.index",
    )


class DocumentChunk(Base):
    """
    A chunk is a logical reading unit — roughly a paragraph or a
    continuous block of text. TTS reads one chunk at a time.
    """
    __tablename__ = "document_chunks"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_uuid
    )
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id"), nullable=False
    )
    index: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    document: Mapped["Document"] = relationship(
        "Document", back_populates="chunks"
    )


class DocumentSection(Base):
    """
    A section is a navigable entry in the document outline —
    headings, chapters, or inferred topic boundaries.
    This powers the accessible navigation menu.
    """
    __tablename__ = "document_sections"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_uuid
    )
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id"), nullable=False
    )
    index: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    # The chunk index this section starts at — used for jump-to navigation
    start_chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    document: Mapped["Document"] = relationship(
        "Document", back_populates="sections"
    )


class ImageDescription(Base):
    """
    Stores the result of each VLM inference call.
    Useful for history, caching repeated images, and debugging.
    """
    __tablename__ = "image_descriptions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_uuid
    )
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    detail_level: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    processing_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_now
    )