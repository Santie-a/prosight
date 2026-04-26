/**
 * React Hook: useDocumentStorage
 *
 * High-level document storage operations.
 * Wraps useDatabase with document-specific logic.
 */

import { useCallback } from 'react';
import * as Crypto from 'expo-crypto';
import { useDatabase } from './useDatabase';
import {
  DocumentRecord,
  ContentBlockRecord,
  BlockTableRecord,
  SectionRecord,
  FileRecord,
} from '@/constants/database-schema';

// ---------------------------------------------------------------------------
// API response shape — mirrors ProcessedDocumentResponse in schemas/documents.py
// ---------------------------------------------------------------------------

interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface TableData {
  rows: string[][];
  headers: string[] | null;
  markdown: string;
}

interface ContentBlockResponse {
  id: string;
  page_number: number;
  block_index: number;
  block_type: 'text' | 'heading' | 'table' | 'figure' | 'formula';
  text: string | null;
  ocr_text: string | null;
  bbox: BoundingBox | null;
  file_id: string | null;
  ai_description: string | null;
  tts_override: string | null;
  table: TableData | null;
}

interface SectionResponse {
  id: string;
  section_index: number;
  title: string;
  level: number;
  start_block_id: string;
}

interface ProcessedDocumentResponse {
  title: string;
  page_count: number;
  blocks: ContentBlockResponse[];
  sections: SectionResponse[];
}

// ---------------------------------------------------------------------------
// Return type for getDocumentWithContent
// ---------------------------------------------------------------------------

export interface DocumentWithContent {
  document: DocumentRecord;
  blocks: ContentBlockRecord[];
  sections: SectionRecord[];
  // Keyed by block_id for O(1) lookup in the render layer.
  blockTables: Map<string, BlockTableRecord>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDocumentStorage() {
  const db = useDatabase();

  /**
   * Store a complete processed document with all blocks, table data,
   * and sections returned from the /documents/process endpoint.
   *
   * @param processedDoc  API response from /documents/process
   * @param fileData      Binary PDF content
   * @param mimeType      File MIME type (defaults to application/pdf)
   * @returns             The new document UUID
   */
  const storeProcessedDocument = useCallback(
    async (
      processedDoc: ProcessedDocumentResponse,
      fileData: Uint8Array,
      mimeType: string = 'application/pdf'
    ): Promise<string> => {
      const docId = Crypto.randomUUID();
      const fileId = Crypto.randomUUID();
      const now = new Date().toISOString();

      try {
        // 1. Store the raw PDF binary
        const fileRecord: FileRecord = {
          id: fileId,
          filename: processedDoc.title,
          file_type: 'pdf',
          data: fileData,
          mime_type: mimeType,
          size_bytes: fileData.length,
          created_at: now,
        };
        await db.insertFile(fileRecord);

        // 2. Store document metadata
        const docRecord: DocumentRecord = {
          id: docId,
          title: processedDoc.title,
          page_count: processedDoc.page_count,
          file_id: fileId,
          created_at: now,
        };
        await db.insertDocument(docRecord);

        // 3. Store content blocks
        const blockRecords: ContentBlockRecord[] = processedDoc.blocks.map(
          (block) => ({
            id: block.id,
            document_id: docId,
            block_index: block.block_index,
            page_number: block.page_number,
            block_type: block.block_type,
            text: block.text ?? null,
            ocr_text: block.ocr_text ?? null,
            bbox_x0: block.bbox?.x0 ?? null,
            bbox_y0: block.bbox?.y0 ?? null,
            bbox_x1: block.bbox?.x1 ?? null,
            bbox_y1: block.bbox?.y1 ?? null,
            file_id: block.file_id ?? null,
            ai_description: block.ai_description ?? null,
            tts_override: block.tts_override ?? null,
          })
        );
        await db.insertBlocks(blockRecords);

        // 4. Store structured table data for table blocks
        const tableRecords: BlockTableRecord[] = processedDoc.blocks
          .filter((block) => block.block_type === 'table' && block.table !== null)
          .map((block) => ({
            id: Crypto.randomUUID(),
            block_id: block.id,
            rows_json: JSON.stringify(block.table!.rows),
            headers_json: block.table!.headers
              ? JSON.stringify(block.table!.headers)
              : null,
            markdown: block.table!.markdown,
          }));

        for (const tableRecord of tableRecords) {
          await db.insertBlockTable(tableRecord);
        }

        // 5. Store sections
        const sectionRecords: SectionRecord[] = processedDoc.sections.map(
          (section) => ({
            id: section.id,
            document_id: docId,
            section_index: section.section_index,
            title: section.title,
            level: section.level,
            start_block_id: section.start_block_id,
          })
        );
        await db.insertSections(sectionRecords);

        console.log(`Document stored: ${docId}`);
        return docId;
      } catch (error) {
        console.error('Failed to store document:', error);
        throw error;
      }
    },
    [db]
  );

  /**
   * Load a document with all its blocks and sections.
   * Returns null if the document does not exist.
   */
  const getDocumentWithContent = useCallback(
    async (documentId: string): Promise<DocumentWithContent | null> => {
      try {
        const document = await db.getDocument(documentId);
        if (!document) return null;

        const [blocks, sections, blockTables] = await Promise.all([
          db.getBlocks(documentId),
          db.getSections(documentId),
          db.getBlockTablesForDocument(documentId),
        ]);

        return { document, blocks, sections, blockTables };
      } catch (error) {
        console.error('Failed to get document:', error);
        throw error;
      }
    },
    [db]
  );

  /**
   * Return all documents sorted by creation date descending.
   */
  const listDocuments = useCallback(async (): Promise<DocumentRecord[]> => {
    try {
      return await db.getAllDocuments();
    } catch (error) {
      console.error('Failed to list documents:', error);
      throw error;
    }
  }, [db]);

  /**
   * Delete a document and its associated file.
   * Blocks, block_tables, and sections are removed via CASCADE.
   */
  const removeDocument = useCallback(
    async (documentId: string): Promise<void> => {
      try {
        const doc = await db.getDocument(documentId);
        await db.deleteDocument(documentId);
        // Delete file after document to ensure cascading deletes complete
        if (doc) {
          await db.deleteFile(doc.file_id);
        }
        console.log(`Document deleted: ${documentId}`);
      } catch (error) {
        console.error('Failed to delete document:', error);
        throw error;
      }
    },
    [db]
  );

  /**
   * Return all blocks that belong to a given section.
   *
   * A section owns all blocks from its start_block_id (inclusive) up to
   * but not including the start_block_id of the next section.
   * For the last section, all remaining blocks are included.
   */
  const getBlocksInSection = useCallback(
    async (
      documentId: string,
      sectionIndex: number
    ): Promise<ContentBlockRecord[]> => {
      try {
        const [blocks, sections] = await Promise.all([
          db.getBlocks(documentId),
          db.getSections(documentId),
        ]);

        const section = sections[sectionIndex];
        if (!section) {
          throw new Error(`Section ${sectionIndex} not found`);
        }

        const startBlock = blocks.find((b) => b.id === section.start_block_id);
        if (!startBlock) return [];

        const nextSection = sections[sectionIndex + 1];
        const endBlock = nextSection
          ? blocks.find((b) => b.id === nextSection.start_block_id)
          : null;

        return blocks.filter((b) => {
          if (b.block_index < startBlock.block_index) return false;
          if (endBlock && b.block_index >= endBlock.block_index) return false;
          return true;
        });
      } catch (error) {
        console.error('Failed to get blocks in section:', error);
        throw error;
      }
    },
    [db]
  );

  return {
    storeProcessedDocument,
    getDocumentWithContent,
    listDocuments,
    removeDocument,
    getBlocksInSection,
  };
}
