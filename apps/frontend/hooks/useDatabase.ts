/**
 * React Hook: useDatabase
 *
 * Low-level CRUD operations for documents, content_blocks, block_tables,
 * sections, and files.
 */

import { useCallback } from 'react';
import { executeQuery, executeUpdate, getOne } from '@/services/database';
import {
  DocumentRecord,
  ContentBlockRecord,
  BlockTableRecord,
  SectionRecord,
  FileRecord,
} from '@/constants/database-schema';

export function useDatabase() {

  // ---------------------------------------------------------------------------
  // Documents
  // ---------------------------------------------------------------------------

  const insertDocument = useCallback(
    async (doc: DocumentRecord): Promise<void> => {
      const sql = `
        INSERT INTO documents (id, title, page_count, file_id, created_at)
        VALUES (?, ?, ?, ?, ?)
      `;
      await executeUpdate(sql, [
        doc.id,
        doc.title,
        doc.page_count,
        doc.file_id,
        doc.created_at,
      ]);
    },
    []
  );

  const getDocument = useCallback(
    async (documentId: string): Promise<DocumentRecord | null> => {
      return getOne('SELECT * FROM documents WHERE id = ?', [documentId]);
    },
    []
  );

  const getAllDocuments = useCallback(
    async (): Promise<DocumentRecord[]> => {
      return executeQuery('SELECT * FROM documents ORDER BY created_at DESC');
    },
    []
  );

  const deleteDocument = useCallback(
    async (documentId: string): Promise<void> => {
      await executeUpdate('DELETE FROM documents WHERE id = ?', [documentId]);
    },
    []
  );

  const updateDocument = useCallback(
    async (documentId: string, updates: Partial<DocumentRecord>): Promise<void> => {
      const fields = Object.keys(updates).map((key) => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      await executeUpdate(
        `UPDATE documents SET ${fields} WHERE id = ?`,
        [...values, documentId]
      );
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Content blocks
  // ---------------------------------------------------------------------------

  const insertBlocks = useCallback(
    async (blocks: ContentBlockRecord[]): Promise<void> => {
      if (!blocks.length) return;
      const sql = `
        INSERT INTO content_blocks (
          id, document_id, block_index, page_number, block_type,
          text, ocr_text,
          bbox_x0, bbox_y0, bbox_x1, bbox_y1,
          file_id, ai_description, tts_override
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      for (const block of blocks) {
        await executeUpdate(sql, [
          block.id,
          block.document_id,
          block.block_index,
          block.page_number,
          block.block_type,
          block.text ?? null,
          block.ocr_text ?? null,
          block.bbox_x0 ?? null,
          block.bbox_y0 ?? null,
          block.bbox_x1 ?? null,
          block.bbox_y1 ?? null,
          block.file_id ?? null,
          block.ai_description ?? null,
          block.tts_override ?? null,
        ]);
      }
    },
    []
  );

  const getBlocks = useCallback(
    async (documentId: string): Promise<ContentBlockRecord[]> => {
      return executeQuery(
        'SELECT * FROM content_blocks WHERE document_id = ? ORDER BY block_index ASC',
        [documentId]
      );
    },
    []
  );

  const getBlock = useCallback(
    async (blockId: string): Promise<ContentBlockRecord | null> => {
      return getOne('SELECT * FROM content_blocks WHERE id = ?', [blockId]);
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Block tables (structured data for table blocks)
  // ---------------------------------------------------------------------------

  const insertBlockTable = useCallback(
    async (blockTable: BlockTableRecord): Promise<void> => {
      const sql = `
        INSERT INTO block_tables (id, block_id, rows_json, headers_json, markdown)
        VALUES (?, ?, ?, ?, ?)
      `;
      await executeUpdate(sql, [
        blockTable.id,
        blockTable.block_id,
        blockTable.rows_json,
        blockTable.headers_json ?? null,
        blockTable.markdown,
      ]);
    },
    []
  );

  const getBlockTable = useCallback(
    async (blockId: string): Promise<BlockTableRecord | null> => {
      return getOne('SELECT * FROM block_tables WHERE block_id = ?', [blockId]);
    },
    []
  );

  /**
   * Load all block_tables for a document in a single query.
   * Returns a Map keyed by block_id for O(1) lookup in the render layer.
   */
  const getBlockTablesForDocument = useCallback(
    async (documentId: string): Promise<Map<string, BlockTableRecord>> => {
      const rows = await executeQuery<BlockTableRecord>(
        `SELECT bt.* FROM block_tables bt
         INNER JOIN content_blocks cb ON cb.id = bt.block_id
         WHERE cb.document_id = ?`,
        [documentId]
      );
      const map = new Map<string, BlockTableRecord>();
      for (const row of rows) {
        map.set(row.block_id, row);
      }
      return map;
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Sections
  // ---------------------------------------------------------------------------

  const insertSections = useCallback(
    async (sections: SectionRecord[]): Promise<void> => {
      if (!sections.length) return;
      const sql = `
        INSERT INTO sections (id, document_id, section_index, title, level, start_block_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      for (const section of sections) {
        await executeUpdate(sql, [
          section.id,
          section.document_id,
          section.section_index,
          section.title,
          section.level,
          section.start_block_id,
        ]);
      }
    },
    []
  );

  const getSections = useCallback(
    async (documentId: string): Promise<SectionRecord[]> => {
      return executeQuery(
        'SELECT * FROM sections WHERE document_id = ? ORDER BY section_index ASC',
        [documentId]
      );
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Files
  // ---------------------------------------------------------------------------

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
      return getOne('SELECT * FROM files WHERE id = ?', [fileId]);
    },
    []
  );

  const deleteFile = useCallback(
    async (fileId: string): Promise<void> => {
      await executeUpdate('DELETE FROM files WHERE id = ?', [fileId]);
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
    // Content blocks
    insertBlocks,
    getBlocks,
    getBlock,
    // Block tables
    insertBlockTable,
    getBlockTable,
    getBlockTablesForDocument,
    // Sections
    insertSections,
    getSections,
    // Files
    insertFile,
    getFile,
    deleteFile,
  };
}
