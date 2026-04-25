import logging
import re
import uuid
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf4llm

logger = logging.getLogger(__name__)

# Classes surfaced by pymupdf4llm in page_boxes that we skip entirely.
# page-footer adds noise for TTS; page-header is handled per document type.
_IGNORED_CLASSES = {"page-footer", "page-header"}

# Mapping from pymupdf4llm page_box class to our block_type vocabulary.
_CLASS_TO_BLOCK_TYPE: dict[str, str] = {
    "section-header": "heading",
    "text": "text",
    "picture": "figure",
    "table": "table",
    "caption": "text",       # captions are text for TTS purposes
    "formula": "formula",
    "code": "text",
}


# ---------------------------------------------------------------------------
# Output data models
# ---------------------------------------------------------------------------

@dataclass
class ParsedBoundingBox:
    x0: float
    y0: float
    x1: float
    y1: float


@dataclass
class ParsedTableData:
    rows: list[list[str]]
    headers: list[str] | None
    markdown: str


@dataclass
class ParsedBlock:
    id: str                        # UUID, used as FK in DB
    page_number: int               # 1-indexed
    block_index: int               # global reading order within document
    block_type: str                # 'text' | 'heading' | 'table' | 'figure' | 'formula'
    text: str | None               # None for figure-only blocks
    ocr_text: str | None           # populated when the block text came from OCR
    bbox: ParsedBoundingBox | None
    figure_path: Path | None       # local path to saved image, figures only
    table: ParsedTableData | None  # structured table data, tables only


@dataclass
class ParsedSection:
    id: str                        # UUID
    section_index: int
    title: str
    level: int                     # 1-6
    start_block_id: str            # FK to ParsedBlock.id


@dataclass
class ParsedDocument:
    title: str
    page_count: int
    blocks: list[ParsedBlock] = field(default_factory=list)
    sections: list[ParsedSection] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def parse_pdf(file_path: Path, figure_output_dir: Path | None = None) -> ParsedDocument:
    """
    Main entry point. Extracts all content blocks and sections from a PDF
    using pymupdf4llm as the extraction backend.

    pymupdf4llm returns one dict per page with the following keys:
        metadata   - document and page metadata
        page_boxes - list of layout blocks, each with bbox, class, index, pos
        text       - full markdown string for the page
        toc_items  - TOC entries pointing at this page

    The 'pos' field in each page_box is a (start, end) character range into
    'text', which we use to slice the exact text for each block. The 'class'
    field maps directly to our block_type vocabulary.

    Args:
        file_path: Path to the PDF file.
        figure_output_dir: Directory where extracted figure images are saved.
                           Passed directly to pymupdf4llm via image_path.
                           If None, write_images is disabled.

    Returns:
        A ParsedDocument ready to be persisted.
    """
    save_images = figure_output_dir is not None
    if save_images:
        figure_output_dir.mkdir(parents=True, exist_ok=True)

    kwargs: dict = dict(
        page_chunks=True,
        write_images=save_images,
        extract_words=False,
    )
    if save_images:
        kwargs["image_path"] = str(figure_output_dir)

    pages: list[dict] = pymupdf4llm.to_markdown(str(file_path), **kwargs)

    page_count = pages[0]["metadata"]["page_count"] if pages else 0
    title = file_path.stem

    blocks: list[ParsedBlock] = []
    block_index = 0

    for page_data in pages:
        page_number: int = page_data["metadata"]["page_number"]
        page_text: str = page_data.get("text", "") or ""
        page_boxes: list[dict] = page_data.get("page_boxes", [])

        # page_boxes are already in reading order (sorted by index).
        for box in sorted(page_boxes, key=lambda b: b["index"]):
            box_class: str = box.get("class", "text")

            if box_class in _IGNORED_CLASSES:
                continue

            block_type = _CLASS_TO_BLOCK_TYPE.get(box_class, "text")
            bbox = _parse_bbox(box.get("bbox"))

            # Slice the block's text from the page markdown using pos offsets.
            pos = box.get("pos")
            raw_text = _slice_text(page_text, pos)

            if block_type == "figure":
                # For figures the text slice contains the markdown image
                # reference and any OCR text pymupdf4llm extracted from the
                # image. We extract the image path and OCR text separately.
                figure_path = _extract_image_path(raw_text, figure_output_dir)
                ocr_text = _extract_ocr_text(raw_text)
                blocks.append(ParsedBlock(
                    id=str(uuid.uuid4()),
                    page_number=page_number,
                    block_index=block_index,
                    block_type="figure",
                    text=None,
                    ocr_text=ocr_text or None,
                    bbox=bbox,
                    figure_path=figure_path,
                    table=None,
                ))

            elif block_type == "table":
                table_data = _parse_markdown_table(raw_text)
                clean_text = table_data.markdown if table_data else raw_text.strip()
                blocks.append(ParsedBlock(
                    id=str(uuid.uuid4()),
                    page_number=page_number,
                    block_index=block_index,
                    block_type="table",
                    text=clean_text,
                    ocr_text=None,
                    bbox=bbox,
                    figure_path=None,
                    table=table_data,
                ))

            else:
                clean_text = _clean_text(raw_text, block_type)
                if not clean_text:
                    continue
                blocks.append(ParsedBlock(
                    id=str(uuid.uuid4()),
                    page_number=page_number,
                    block_index=block_index,
                    block_type=block_type,
                    text=clean_text,
                    ocr_text=None,
                    bbox=bbox,
                    figure_path=None,
                    table=None,
                ))

            block_index += 1

    sections = _build_sections(pages, blocks)

    return ParsedDocument(
        title=title,
        page_count=page_count,
        blocks=blocks,
        sections=sections,
    )


# ---------------------------------------------------------------------------
# Text helpers
# ---------------------------------------------------------------------------

def _slice_text(page_text: str, pos: tuple | list | None) -> str:
    """
    Slice page_text using the (start, end) character offsets in pos.
    Falls back to the full page text if pos is missing or malformed.
    """
    if not pos or len(pos) < 2:
        return page_text
    try:
        start, end = int(pos[0]), int(pos[1])
        return page_text[start:end]
    except (TypeError, ValueError):
        logger.warning("Could not apply pos slice %s", pos)
        return page_text


def _clean_text(raw: str, block_type: str) -> str:
    """
    Strip markdown syntax from a text or heading block so the stored text
    is clean for TTS. Heading '#' prefixes and bold/italic markers are removed.
    """
    text = raw.strip()
    if block_type == "heading":
        text = re.sub(r"^#{1,6}\s*", "", text)
    # Remove bold/italic markers
    text = re.sub(r"\*{1,2}([^*]+)\*{1,2}", r"\1", text)
    text = re.sub(r"_{1,2}([^_]+)_{1,2}", r"\1", text)
    # Collapse multiple spaces
    text = re.sub(r" {2,}", " ", text).strip()
    return text


def _extract_image_path(raw: str, figure_output_dir: Path | None) -> Path | None:
    """
    Extract the filesystem path from a markdown image reference.
    pymupdf4llm writes: ![](relative/path/to/image.png)
    Returns an absolute Path if the file exists, otherwise the raw candidate.
    """
    match = re.search(r"!\[.*?\]\((.+?)\)", raw)
    if not match:
        return None
    rel_path = match.group(1).strip()
    candidate = Path(rel_path)
    if candidate.is_absolute() and candidate.exists():
        return candidate
    if figure_output_dir is not None:
        absolute = figure_output_dir / candidate.name
        if absolute.exists():
            return absolute
    return candidate if candidate.suffix else None


def _extract_ocr_text(raw: str) -> str:
    """
    pymupdf4llm wraps OCR text extracted from a picture block like so:
        **----- Start of picture text -----**
        ... ocr content ...
        **----- End of picture text -----**
    Extract and return just the inner content, stripped.
    """
    match = re.search(
        r"\*{0,2}-{5}\s*Start of picture text\s*-{5}\*{0,2}(.*?)"
        r"\*{0,2}-{5}\s*End of picture text\s*-{5}\*{0,2}",
        raw,
        re.DOTALL | re.IGNORECASE,
    )
    if not match:
        return ""
    ocr = re.sub(r"<br\s*/?>", " ", match.group(1), flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", ocr).strip()


# ---------------------------------------------------------------------------
# Table helpers
# ---------------------------------------------------------------------------

def _parse_markdown_table(raw: str) -> ParsedTableData | None:
    """
    Parse a GFM markdown table string into ParsedTableData.
    pymupdf4llm renders tables as markdown — we reverse that into rows/cells.
    The separator row (|---|---|) is detected and skipped. The row immediately
    before the separator is treated as headers.
    """
    lines = [l.strip() for l in raw.strip().splitlines() if l.strip()]
    table_lines = [l for l in lines if l.startswith("|")]
    if not table_lines:
        return None

    def parse_row(line: str) -> list[str]:
        inner = line.strip("|")
        return [cell.strip() for cell in inner.split("|")]

    def is_separator(line: str) -> bool:
        return bool(re.match(r"^\|[-| :]+\|$", line))

    rows: list[list[str]] = []
    headers: list[str] | None = None

    for line in table_lines:
        if is_separator(line):
            if rows:
                headers = rows.pop()
            continue
        rows.append(parse_row(line))

    if not rows and headers is None:
        return None

    markdown = _rows_to_markdown(headers, rows)
    return ParsedTableData(rows=rows, headers=headers, markdown=markdown)


def _rows_to_markdown(headers: list[str] | None, rows: list[list[str]]) -> str:
    """Render headers and rows back into a clean GFM markdown table."""
    if not rows and not headers:
        return ""
    all_rows = ([headers] if headers else []) + rows
    col_count = max(len(r) for r in all_rows)

    def pad(row: list[str]) -> list[str]:
        return row + [""] * (col_count - len(row))

    lines: list[str] = []
    if headers:
        lines.append("| " + " | ".join(pad(headers)) + " |")
        lines.append("| " + " | ".join("---" for _ in range(col_count)) + " |")
        for row in rows:
            lines.append("| " + " | ".join(pad(row)) + " |")
    else:
        for row in rows:
            lines.append("| " + " | ".join(pad(row)) + " |")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# BBox helper
# ---------------------------------------------------------------------------

def _parse_bbox(bbox_raw) -> ParsedBoundingBox | None:
    if not bbox_raw or len(bbox_raw) < 4:
        return None
    try:
        return ParsedBoundingBox(
            x0=float(bbox_raw[0]),
            y0=float(bbox_raw[1]),
            x1=float(bbox_raw[2]),
            y1=float(bbox_raw[3]),
        )
    except (TypeError, ValueError):
        logger.warning("Could not parse bounding box: %s", bbox_raw)
        return None


# ---------------------------------------------------------------------------
# Section builder
# ---------------------------------------------------------------------------

def _build_sections(
    pages: list[dict],
    blocks: list[ParsedBlock],
) -> list[ParsedSection]:
    """
    Build sections from TOC items surfaced by pymupdf4llm.
    Falls back to heading blocks if the document has no embedded TOC.
    """
    heading_blocks_by_page: dict[int, list[ParsedBlock]] = {}
    first_block_by_page: dict[int, ParsedBlock] = {}

    for block in blocks:
        if block.block_type == "heading":
            heading_blocks_by_page.setdefault(block.page_number, []).append(block)
        if block.page_number not in first_block_by_page:
            first_block_by_page[block.page_number] = block

    seen_titles: set[str] = set()
    sections: list[ParsedSection] = []
    section_index = 0

    for page_data in pages:
        for toc_entry in page_data.get("toc_items", []):
            level, title, page_number = toc_entry[0], toc_entry[1], toc_entry[2]
            title = title.strip()
            if not title or title in seen_titles:
                continue
            seen_titles.add(title)

            start_block = _find_heading_block(
                title, page_number, heading_blocks_by_page, first_block_by_page
            )
            if start_block is None:
                logger.warning("No block found for TOC entry '%s' on page %d", title, page_number)
                continue

            sections.append(ParsedSection(
                id=str(uuid.uuid4()),
                section_index=section_index,
                title=title,
                level=level,
                start_block_id=start_block.id,
            ))
            section_index += 1

    # Fallback: no TOC — derive sections from heading blocks
    if not sections:
        logger.debug("No TOC entries found — deriving sections from heading blocks")
        for block in blocks:
            if block.block_type == "heading" and block.text:
                sections.append(ParsedSection(
                    id=str(uuid.uuid4()),
                    section_index=section_index,
                    title=block.text,
                    level=1,
                    start_block_id=block.id,
                ))
                section_index += 1

    return sections


def _find_heading_block(
    title: str,
    page_number: int,
    heading_blocks_by_page: dict[int, list[ParsedBlock]],
    first_block_by_page: dict[int, ParsedBlock],
) -> ParsedBlock | None:
    candidates = heading_blocks_by_page.get(page_number, [])
    for block in candidates:
        if block.text and block.text.strip().lower() == title.lower():
            return block
    if candidates:
        return candidates[0]
    return first_block_by_page.get(page_number)