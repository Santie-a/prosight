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
   * Process a PDF file and extract chunks and sections in a single request.
   * 
   * Note: This is a stateless operation. The backend does NOT store the document.
   * The frontend is responsible for storing the returned chunks and sections.
   * 
   * @param fileUri - URI of the PDF file to process
   * @param fileName - Original filename of the PDF
   * @returns {Promise<{title, page_count, chunk_count, section_count, chunks, sections}>}
   */
  process: async (fileUri: string, fileName: string) => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: 'application/pdf',
      name: fileName,
    } as any);

    const response = await api.post('/documents/process', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export const ttsAPI = {
  /**
   * Synthesize text to speech and return audio as a WAV file.
   * 
   * @param text - Text to synthesize (1-10,000 characters)
   * @param voice - Optional voice name (default: af_heart)
   * @returns {Promise<ArrayBuffer>} - WAV audio data
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
