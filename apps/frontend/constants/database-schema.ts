/**
 * SQLite Database Schema Definitions
 *
 * Tables:
 * - documents:      Metadata for processed PDFs
 * - content_blocks: Typed content units extracted from documents
 *                   (text, heading, table, figure, formula)
 * - block_tables:   Structured cell data for table blocks (1-to-1 with content_blocks)
 * - sections:       Document structure (table of contents)
 * - files:          Binary storage for uploaded PDF files
 */

export const DATABASE_SCHEMA = {

  createFilesTable: `
    CREATE TABLE IF NOT EXISTS files (
      id          TEXT PRIMARY KEY,
      filename    TEXT NOT NULL,
      file_type   TEXT NOT NULL,
      data        BLOB NOT NULL,
      mime_type   TEXT,
      size_bytes  INTEGER,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `,

  // files has no FK dependencies so it is created first.
  createDocumentsTable: `
    CREATE TABLE IF NOT EXISTS documents (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      page_count  INTEGER NOT NULL,
      file_id     TEXT NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (file_id) REFERENCES files(id)
    );
  `,

  // Central content table. Every extractable unit from a PDF is a row here.
  // block_type values: 'text' | 'heading' | 'table' | 'figure' | 'formula'
  // text is null for figure-only blocks.
  // ocr_text is populated when pymupdf4llm used OCR for this block.
  // tts_override allows a manually curated string for TTS (optional, future use).
  // file_id is non-null only for figure blocks storing an extracted image.
  createContentBlocksTable: `
    CREATE TABLE IF NOT EXISTS content_blocks (
      id           TEXT PRIMARY KEY,
      document_id  TEXT NOT NULL,
      block_index  INTEGER NOT NULL,
      page_number  INTEGER NOT NULL,
      block_type   TEXT NOT NULL,
      text         TEXT,
      ocr_text     TEXT,
      bbox_x0      REAL,
      bbox_y0      REAL,
      bbox_x1      REAL,
      bbox_y1      REAL,
      file_id      TEXT,
      ai_description TEXT,
      tts_override TEXT,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
    );
  `,

  // Structured cell data for table blocks.
  // rows_json: JSON array of arrays of strings — e.g. [["R1C1","R1C2"],["R2C1","R2C2"]]
  // headers_json: JSON array of header strings, nullable if no header row detected.
  // markdown: pre-rendered GFM table string used as TTS fallback.
  createBlockTablesTable: `
    CREATE TABLE IF NOT EXISTS block_tables (
      id           TEXT PRIMARY KEY,
      block_id     TEXT NOT NULL UNIQUE,
      rows_json    TEXT NOT NULL,
      headers_json TEXT,
      markdown     TEXT NOT NULL,
      FOREIGN KEY (block_id) REFERENCES content_blocks(id) ON DELETE CASCADE
    );
  `,

  // Sections point to the heading block that starts them via start_block_id.
  // level mirrors the heading level (1-6) from the document TOC or heuristic detection.
  createSectionsTable: `
    CREATE TABLE IF NOT EXISTS sections (
      id             TEXT PRIMARY KEY,
      document_id    TEXT NOT NULL,
      section_index  INTEGER NOT NULL,
      title          TEXT NOT NULL,
      level          INTEGER NOT NULL,
      start_block_id TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (start_block_id) REFERENCES content_blocks(id) ON DELETE CASCADE
    );
  `,

  createIndexes: `
    CREATE INDEX IF NOT EXISTS idx_documents_created
      ON documents(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_blocks_document_order
      ON content_blocks(document_id, block_index);
    CREATE INDEX IF NOT EXISTS idx_blocks_page
      ON content_blocks(document_id, page_number);
    CREATE INDEX IF NOT EXISTS idx_sections_document
      ON sections(document_id, section_index);
  `,
};

// ---------------------------------------------------------------------------
// TypeScript record types (mirror the SQL schema above)
// ---------------------------------------------------------------------------

export type BlockType = 'text' | 'heading' | 'table' | 'figure' | 'formula';

export interface DocumentRecord {
  id: string;
  title: string;
  page_count: number;
  file_id: string;
  created_at: string;
}

export interface ContentBlockRecord {
  id: string;              // UUID
  document_id: string;
  block_index: number;     // global reading order within document
  page_number: number;     // 1-indexed
  block_type: BlockType;
  text: string | null;     // null for figure-only blocks
  ocr_text: string | null;
  bbox_x0: number | null;
  bbox_y0: number | null;
  bbox_x1: number | null;
  bbox_y1: number | null;
  file_id: string | null;          // FK to files, figures only
  ai_description: string | null;   // filled by description service later
  tts_override: string | null;     // optional manual TTS override
}

export interface BlockTableRecord {
  id: string;
  block_id: string;        // FK to content_blocks.id
  rows_json: string;       // serialized JSON
  headers_json: string | null;
  markdown: string;
}

export interface SectionRecord {
  id: string;              // UUID
  document_id: string;
  section_index: number;
  title: string;
  level: number;           // 1-6
  start_block_id: string;  // FK to content_blocks.id
}

export interface FileRecord {
  id: string;
  filename: string;
  file_type: 'pdf' | 'image';
  data: Uint8Array;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}