import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

import fitz  # pymupdf

logger = logging.getLogger(__name__)

# Approximate character ceiling per chunk (~300 tokens at ~4 chars/token)
CHUNK_CHAR_LIMIT = 1200
# Blocks shorter than this are candidates for merging
MIN_BLOCK_CHARS = 60


@dataclass
class ParsedChunk:
    index: int
    page_number: int  # 1-indexed
    text: str


@dataclass
class ParsedSection:
    index: int
    title: str
    level: int
    start_chunk_index: int


@dataclass
class ParsedDocument:
    title: str
    page_count: int
    chunks: list[ParsedChunk] = field(default_factory=list)
    sections: list[ParsedSection] = field(default_factory=list)


def parse_pdf(file_path: Path) -> ParsedDocument:
    """
    Main entry point. Opens a PDF, extracts chunks and sections,
    returns a ParsedDocument ready to be persisted.
    """
    doc = fitz.open(str(file_path))
    page_count = doc.page_count
    title = file_path.stem  # overridden by caller with original filename

    raw_blocks = _extract_blocks(doc)
    chunks = _build_chunks(raw_blocks)
    sections = _build_sections(doc, chunks)

    doc.close()

    return ParsedDocument(
        title=title,
        page_count=page_count,
        chunks=chunks,
        sections=sections,
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

@dataclass
class _RawBlock:
    page_number: int  # 1-indexed
    text: str
    is_heading_candidate: bool


def _extract_blocks(doc: fitz.Document) -> list[_RawBlock]:
    """
    Extract text blocks from all pages. Each block is a paragraph-level
    unit of text. Filters out empty blocks and noise.
    """
    blocks: list[_RawBlock] = []

    for page_index in range(len(doc)):
        page = doc[page_index]
        page_number = page_index + 1
        raw = page.get_text("blocks")  # list of (x0, y0, x1, y1, text, block_no, block_type)

        for block in raw:
            block_type = block[6]
            if block_type != 0:  # 0 = text, 1 = image — skip images
                continue

            text = block[4].strip()
            if not text or len(text) < 3:
                continue

            # Remove hyphenation artifacts from line breaks
            text = re.sub(r"-\n(\w)", r"\1", text)
            # Normalize internal whitespace
            text = re.sub(r"\n+", " ", text).strip()

            is_heading_candidate = _looks_like_heading(text)
            blocks.append(_RawBlock(
                page_number=page_number,
                text=text,
                is_heading_candidate=is_heading_candidate,
            ))

    return blocks


def _looks_like_heading(text: str) -> bool:
    """
    Heuristic: a block looks like a heading if it is short, does not end
    with sentence-ending punctuation, and has no more than 12 words.
    This is intentionally conservative to avoid false positives.
    """
    if len(text) > 120:
        return False
    if text.endswith((".", "!", "?", ";")):
        return False
    word_count = len(text.split())
    if word_count > 12 or word_count < 1:
        return False
    return True


def _build_chunks(blocks: list[_RawBlock]) -> list[ParsedChunk]:
    """
    Merge consecutive non-heading blocks into chunks up to CHUNK_CHAR_LIMIT.
    Heading candidates always start a new chunk — they are short and serve
    as natural boundaries.
    """
    chunks: list[ParsedChunk] = []
    buffer_texts: list[str] = []
    buffer_chars = 0
    buffer_page = 1

    def flush():
        if not buffer_texts:
            return
        merged = " ".join(buffer_texts).strip()
        if merged:
            chunks.append(ParsedChunk(
                index=len(chunks),
                page_number=buffer_page,
                text=merged,
            ))

    for block in blocks:
        if block.is_heading_candidate:
            flush()
            buffer_texts = [block.text]
            buffer_chars = len(block.text)
            buffer_page = block.page_number
            flush()
            buffer_texts = []
            buffer_chars = 0
            continue

        will_exceed = buffer_chars + len(block.text) > CHUNK_CHAR_LIMIT
        page_changed = block.page_number != buffer_page and buffer_chars > MIN_BLOCK_CHARS

        if will_exceed or page_changed:
            flush()
            buffer_texts = [block.text]
            buffer_chars = len(block.text)
            buffer_page = block.page_number
        else:
            if not buffer_texts:
                buffer_page = block.page_number
            buffer_texts.append(block.text)
            buffer_chars += len(block.text)

    flush()
    return chunks


def _build_sections(
    doc: fitz.Document,
    chunks: list[ParsedChunk],
) -> list[ParsedSection]:
    """
    Try the embedded TOC first. Fall back to heuristic heading detection
    from chunks if the TOC is empty.
    """
    toc = doc.get_toc()  # list of [level, title, page_number]

    if toc:
        logger.debug("Using embedded TOC (%d entries)", len(toc))
        return _sections_from_toc(toc, chunks)
    else:
        logger.debug("No embedded TOC — using heuristic heading detection")
        return _sections_from_headings(chunks)


def _page_to_chunk_index(chunks: list[ParsedChunk], page_number: int) -> int:
    """
    Returns the index of the first chunk that is on or after the given page.
    Falls back to the last chunk if nothing matches.
    """
    for chunk in chunks:
        if chunk.page_number >= page_number:
            return chunk.index
    return max(0, len(chunks) - 1)


def _sections_from_toc(
    toc: list,
    chunks: list[ParsedChunk],
) -> list[ParsedSection]:
    sections = []
    for i, entry in enumerate(toc):
        level, title, page_number = entry[0], entry[1], entry[2]
        title = title.strip()
        if not title:
            continue
        start_chunk_index = _page_to_chunk_index(chunks, page_number)
        sections.append(ParsedSection(
            index=i,
            title=title,
            level=level,
            start_chunk_index=start_chunk_index,
        ))
    return sections


def _sections_from_headings(chunks: list[ParsedChunk]) -> list[ParsedSection]:
    """
    Any chunk whose entire text looks like a heading becomes a section.
    Level is always 1 here since we have no hierarchy information.
    """
    sections = []
    for chunk in chunks:
        if _looks_like_heading(chunk.text):
            sections.append(ParsedSection(
                index=len(sections),
                title=chunk.text,
                level=1,
                start_chunk_index=chunk.index,
            ))
    return sections