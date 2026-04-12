/**
 * React Hook: useDocumentStorage
 * 
 * High-level document storage operations
 * Wraps useDatabase with document-specific logic
 */

import { useCallback } from 'react';
import * as Crypto from 'expo-crypto';
import { useDatabase } from './useDatabase';
import {
  DocumentRecord,
  ChunkRecord,
  SectionRecord,
  FileRecord,
} from '@/constants/database-schema';

/**
 * Response from API's /documents/process endpoint
 */
interface ProcessedDocumentResponse {
  title: string;
  page_count: number;
  chunk_count: number;
  section_count: number;
  chunks: Array<{
    index: number;
    page_number: number;
    text: string;
  }>;
  sections: Array<{
    index: number;
    title: string;
    level: number;
    start_chunk_index: number;
  }>;
}

export function useDocumentStorage() {
  const db = useDatabase();

  /**
   * Store a complete processed document with all chunks and sections
   * @param processedDoc API response from /documents/process
   * @param fileData Binary PDF file data
   * @param mimeType File MIME type
   */
  const storeProcessedDocument = useCallback(
    async (
      processedDoc: ProcessedDocumentResponse,
      fileData: Uint8Array,
      mimeType: string = 'application/pdf'
    ): Promise<string> => {
      const docId = Crypto.randomUUID();;
      const fileId = Crypto.randomUUID();;
      const now = new Date().toISOString();

      try {
        // 1. Store the file binary
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
          created_at: now,
          page_count: processedDoc.page_count,
          chunk_count: processedDoc.chunk_count,
          section_count: processedDoc.section_count,
          file_id: fileId,
        };
        await db.insertDocument(docRecord);

        // 3. Store chunks
        const chunks: ChunkRecord[] = processedDoc.chunks.map((chunk) => ({
          id: 0, // Will be auto-generated
          document_id: docId,
          index: chunk.index,
          page_number: chunk.page_number,
          text: chunk.text,
        }));
        await db.insertChunks(chunks);

        // 4. Store sections
        const sections: SectionRecord[] = processedDoc.sections.map(
          (section) => ({
            id: 0, // Will be auto-generated
            document_id: docId,
            index: section.index,
            title: section.title,
            level: section.level,
            start_chunk_index: section.start_chunk_index,
          })
        );
        await db.insertSections(sections);

        console.log(`✓ Document stored: ${docId}`);
        return docId;
      } catch (error) {
        console.error('✗ Failed to store document:', error);
        throw error;
      }
    },
    [db]
  );

  /**
   * Get document with all its chunks and sections
   */
  const getDocumentWithContent = useCallback(
    async (documentId: string) => {
      try {
        const doc = await db.getDocument(documentId);
        if (!doc) return null;

        const chunks = await db.getChunks(documentId);
        const sections = await db.getSections(documentId);

        return {
          document: doc,
          chunks,
          sections,
        };
      } catch (error) {
        console.error('✗ Failed to get document:', error);
        throw error;
      }
    },
    [db]
  );

  /**
   * Get all documents (list view)
   */
  const listDocuments = useCallback(async () => {
    try {
      return await db.getAllDocuments();
    } catch (error) {
      console.error('✗ Failed to list documents:', error);
      throw error;
    }
  }, [db]);

  /**
   * Delete document and cascade delete chunks/sections
   */
  const removeDocument = useCallback(
    async (documentId: string): Promise<void> => {
      try {
        const doc = await db.getDocument(documentId);
        if (doc) {
          // Delete associated file
          await db.deleteFile(doc.file_id);
        }
        // Delete document (cascades to chunks/sections)
        await db.deleteDocument(documentId);
        console.log(`✓ Document deleted: ${documentId}`);
      } catch (error) {
        console.error('✗ Failed to delete document:', error);
        throw error;
      }
    },
    [db]
  );

  /**
   * Get chunks for a specific section
   */
  const getChunksInSection = useCallback(
    async (
      documentId: string,
      sectionIndex: number
    ): Promise<ChunkRecord[]> => {
      try {
        const sections = await db.getSections(documentId);
        const section = sections[sectionIndex];

        if (!section) {
          throw new Error(`Section ${sectionIndex} not found`);
        }

        // Find chunks from this section to the start of next section
        const chunks = await db.getChunks(documentId);
        const nextSection = sections[sectionIndex + 1];
        const endChunkIndex = nextSection ? nextSection.start_chunk_index : chunks.length;

        return chunks.filter(
          (c) => c.index >= section.start_chunk_index && c.index < endChunkIndex
        );
      } catch (error) {
        console.error('✗ Failed to get section chunks:', error);
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
    getChunksInSection,
  };
}
