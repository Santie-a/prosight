export type ThemeName = 'light' | 'dark' | 'highContrast';
export type FontSizeName = 'small' | 'medium' | 'large' | 'extraLarge';

export interface Theme {
  name: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryLight: string;
  secondary: string;
  border: string;
  success: string;
  error: string;
  warning: string;
}

export interface FontSizes {
  label: string;
  title: number;
  subtitle: number;
  body: number;
  button: number;
  large: number;
}

export interface Document {
  document_id: string;
  title: string;
  page_count: number;
  chunk_count: number;
  section_count: number;
  uploadedAt?: string;
}

export interface Section {
  id: string;
  index: number;
  title: string;
  level: number;
  start_chunk_index: number;
}

export interface DocumentChunk {
  id: string;
  index: number;
  page_number: number;
  text: string;
}

export interface VisionResponse {
  description: string;
  detail_level: 'brief' | 'detailed' | 'navigation';
  processing_ms: number;
}

export interface SynthesizeResult {
  audio: ArrayBuffer;
  duration?: number;
}

export interface HealthStatus {
  status: 'ready' | 'degraded';
  providers: {
    vlm: {
      ready: boolean;
      error: string | null;
    };
    tts: {
      ready: boolean;
      error: string | null;
    };
  };
}
