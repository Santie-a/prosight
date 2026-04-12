/**
 * React Hook: useDatabase
 * 
 * Low-level CRUD operations for documents, chunks, sections, files
 */

import { useCallback } from 'react';
import {
  executeQuery,
  executeUpdate,
  getOne,
} from '@/services/database';
import {
  DocumentRecord,
  ChunkRecord,
  SectionRecord,
  FileRecord,
} from '@/constants/database-schema';

export function useDatabase() {
  // --- DOCUMENTS OPERATIONS ---

  const insertDocument = useCallback(
    async (doc: DocumentRecord): Promise<void> => {
      const sql = `
        INSERT INTO documents (id, title, page_count, chunk_count, section_count, file_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      await executeUpdate(sql, [
        doc.id,
        doc.title,
        doc.page_count,
        doc.chunk_count,
        doc.section_count,
        doc.file_id,
        doc.created_at,
      ]);
    },
    []
  );

  const getDocument = useCallback(
    async (documentId: string): Promise<DocumentRecord | null> => {
      const sql = 'SELECT * FROM documents WHERE id = ?';
      return getOne(sql, [documentId]);
    },
    []
  );

  const getAllDocuments = useCallback(async (): Promise<DocumentRecord[]> => {
    const sql =
      'SELECT * FROM documents ORDER BY created_at DESC';
    return executeQuery(sql);
  }, []);

  const deleteDocument = useCallback(
    async (documentId: string): Promise<void> => {
      // Cascading delete handled by foreign keys
      const sql = 'DELETE FROM documents WHERE id = ?';
      await executeUpdate(sql, [documentId]);
    },
    []
  );

  const updateDocument = useCallback(
    async (documentId: string, updates: Partial<DocumentRecord>): Promise<void> => {
      const fields = Object.keys(updates)
        .map((key) => `${key} = ?`)
        .join(', ');
      const values = Object.values(updates);
      const sql = `UPDATE documents SET ${fields} WHERE id = ?`;
      await executeUpdate(sql, [...values, documentId]);
    },
    []
  );

  // --- CHUNKS OPERATIONS ---

  const insertChunks = useCallback(
    async (chunks: ChunkRecord[]): Promise<void> => {
      if (!chunks.length) return;

      // Batch insert for efficiency
      const sql = `
        INSERT INTO chunks (document_id, "index", page_number, text)
        VALUES (?, ?, ?, ?)
      `;

      for (const chunk of chunks) {
        await executeUpdate(sql, [
          chunk.document_id,
          chunk.index,
          chunk.page_number,
          chunk.text,
        ]);
      }
    },
    []
  );

  const getChunks = useCallback(
    async (documentId: string): Promise<ChunkRecord[]> => {
      const sql =
        'SELECT * FROM chunks WHERE document_id = ? ORDER BY "index" ASC';
      return executeQuery(sql, [documentId]);
    },
    []
  );

  const getChunk = useCallback(
    async (documentId: string, index: number): Promise<ChunkRecord | null> => {
      const sql =
        'SELECT * FROM chunks WHERE document_id = ? AND "index" = ?';
      return getOne(sql, [documentId, index]);
    },
    []
  );

  // --- SECTIONS OPERATIONS ---

  const insertSections = useCallback(
    async (sections: SectionRecord[]): Promise<void> => {
      if (!sections.length) return;

      const sql = `
        INSERT INTO sections (document_id, "index", title, level, start_chunk_index)
        VALUES (?, ?, ?, ?, ?)
      `;

      for (const section of sections) {
        await executeUpdate(sql, [
          section.document_id,
          section.index,
          section.title,
          section.level,
          section.start_chunk_index,
        ]);
      }
    },
    []
  );

  const getSections = useCallback(
    async (documentId: string): Promise<SectionRecord[]> => {
      const sql =
        'SELECT * FROM sections WHERE document_id = ? ORDER BY "index" ASC';
      return executeQuery(sql, [documentId]);
    },
    []
  );

  // --- FILES OPERATIONS ---

  const insertFile = useCallback(
    async (file: FileRecord): Promise<void> => {
      const sql = `
        INSERT INTO files (id, filename, file_type, data, mime_type, size_bytes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      await executeUpdate(sql, [
        file.id,
        file.filename,
        file.file_type,
        file.data,
        file.mime_type,
        file.size_bytes,
        file.created_at,
      ]);
    },
    []
  );

  const getFile = useCallback(
    async (fileId: string): Promise<FileRecord | null> => {
      const sql = 'SELECT * FROM files WHERE id = ?';
      return getOne(sql, [fileId]);
    },
    []
  );

  const deleteFile = useCallback(
    async (fileId: string): Promise<void> => {
      const sql = 'DELETE FROM files WHERE id = ?';
      await executeUpdate(sql, [fileId]);
    },
    []
  );

  return {
    // Documents
    insertDocument,
    getDocument,
    getAllDocuments,
    deleteDocument,
    updateDocument,
    // Chunks
    insertChunks,
    getChunks,
    getChunk,
    // Sections
    insertSections,
    getSections,
    // Files
    insertFile,
    getFile,
    deleteFile,
  };
}
