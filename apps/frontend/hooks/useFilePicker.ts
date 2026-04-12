import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system'; // Use the new class-based API

export interface PickedDocument {
  uri: string;
  filename: string;
  size: number;
  mimeType: string;
}

interface UseFilePickerReturn {
  selectPDF: () => Promise<PickedDocument | null>;
  error: string | null;
  setError: (error: string | null) => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const WARN_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export const useFilePicker = (): UseFilePickerReturn => {
  const [error, setError] = useState<string | null>(null);

  const validateFile = async (uri: string): Promise<{ valid: boolean; size: number }> => {
    try {
      // 1. Instantiate the modern File class
      const file = new File(uri);

      // 2. Use the 'exists' boolean property (no more manual checks)
      if (!file.exists) {
        throw new Error('File not found');
      }

      // 3. Access 'size' directly
      const size = file.size;

      if (size > MAX_FILE_SIZE) {
        setError(`File is too large (${Math.round(size / 1024 / 1024)}MB > 50MB).`);
        return { valid: false, size };
      }

      if (size > WARN_FILE_SIZE) {
        console.warn(`Large file detected: ${Math.round(size / 1024 / 1024)}MB.`);
      }

      return { valid: true, size };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to validate file';
      setError(message);
      return { valid: false, size: 0 };
    }
  };

  const selectPDF = async (): Promise<PickedDocument | null> => {
    try {
      setError(null);

      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true, // Recommended for the new File API to ensure read permissions
      });

      if (result.canceled) {
        return null;
      }

      const asset = result.assets[0];
      const { uri, mimeType, name } = asset;

      if (!uri) {
        setError('Invalid file URI');
        return null;
      }

      // Validate MIME type
      if (!mimeType || !mimeType.includes('pdf')) {
        setError('Please select a PDF file');
        return null;
      }

      // Validate file size using the new logic
      const { valid, size } = await validateFile(uri);
      if (!valid) {
        return null;
      }

      return {
        uri,
        filename: name || 'document.pdf',
        size,
        mimeType,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to select file';
      setError(message);
      return null;
    }
  };

  return {
    selectPDF,
    error,
    setError,
  };
};