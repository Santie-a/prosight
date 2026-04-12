/**
 * SQLite Database Schema Definitions
 * 
 * Tables:
 * - documents: Metadata for processed PDFs
 * - chunks: Text segments extracted from documents
 * - sections: Document structure (table of contents)
 * - files: Binary storage for uploaded files
 */

export const DATABASE_SCHEMA = {
  // Create tables SQL statements
  createDocumentsTable: `
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      page_count INTEGER NOT NULL,
      chunk_count INTEGER NOT NULL,
      section_count INTEGER NOT NULL,
      file_id TEXT NOT NULL,
      FOREIGN KEY(file_id) REFERENCES files(id)
    );
  `,

  createChunksTable: `
    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id TEXT NOT NULL,
      "index" INTEGER NOT NULL,
      page_number INTEGER NOT NULL,
      text TEXT NOT NULL,
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
    );
  `,

  createSectionsTable: `
    CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id TEXT NOT NULL,
      "index" INTEGER NOT NULL,
      title TEXT NOT NULL,
      level INTEGER NOT NULL,
      start_chunk_index INTEGER NOT NULL,
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
    );
  `,

  createFilesTable: `
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      data BLOB NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      size_bytes INTEGER,
      mime_type TEXT
    );
  `,

  // Create indexes for faster queries
  createIndexes: `
    CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);
    CREATE INDEX IF NOT EXISTS idx_sections_document ON sections(document_id);
  `,
};

// Type definitions for database records
export interface DocumentRecord {
  id: string;
  title: string;
  created_at: string;
  page_count: number;
  chunk_count: number;
  section_count: number;
  file_id: string;
}

export interface ChunkRecord {
  id: number;
  document_id: string;
  index: number;
  page_number: number;
  text: string;
}

export interface SectionRecord {
  id: number;
  document_id: string;
  index: number;
  title: string;
  level: number;
  start_chunk_index: number;
}

export interface FileRecord {
  id: string;
  filename: string;
  file_type: 'pdf' | 'image';
  data: Uint8Array;
  created_at: string;
  size_bytes: number;
  mime_type: string;
}
