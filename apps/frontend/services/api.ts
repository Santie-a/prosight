import axios, { AxiosError } from 'axios';
import { API_BASE_URL, API_PREFIX } from '@/constants/config';

const api = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  timeout: 30000,
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Response types
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

export interface ContentBlockResponse {
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

export interface SectionResponse {
  id: string;
  section_index: number;
  title: string;
  level: number;
  start_block_id: string;
}

export interface ProcessedDocumentResponse {
  title: string;
  page_count: number;
  blocks: ContentBlockResponse[];
  sections: SectionResponse[];
}

// ---------------------------------------------------------------------------
// API clients
// ---------------------------------------------------------------------------

export const healthAPI = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

export const visionAPI = {
  describe: async (
    imageUri: string,
    detailLevel: 'read' | 'detailed' | 'navigation' = 'detailed'
  ) => {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'image.jpg',
    } as any);
    formData.append('detail_level', detailLevel);

    const response = await api.post('/vision/describe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export const documentsAPI = {
  /**
   * Process a PDF file and return typed content blocks and sections.
   *
   * Stateless — the backend does NOT store the document. The frontend is
   * responsible for persisting the returned data via useDocumentStorage.
   *
   * @param fileUri  URI of the PDF file to process
   * @param fileName Original filename of the PDF
   */
  process: async (
    fileUri: string,
    fileName: string
  ): Promise<ProcessedDocumentResponse> => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: 'application/pdf',
      name: fileName,
    } as any);

    const response = await api.post<ProcessedDocumentResponse>(
      '/documents/process',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
};

export const ttsAPI = {
  /**
   * Synthesize text to speech and return audio as a WAV file.
   *
   * @param text  Text to synthesize (1–10,000 characters)
   * @param voice Optional voice name (default: af_heart)
   */
  synthesize: async (text: string, voice?: string): Promise<ArrayBuffer> => {
    const response = await api.post(
      '/tts/synthesize',
      { text, voice },
      { responseType: 'arraybuffer' }
    );
    return response.data;
  },
};

export { api };