import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';

export interface PickedImage {
  uri: string;
  filename: string;
  size: number;
  type: 'image/jpeg' | 'image/png';
  width?: number;
  height?: number;
}

interface UseImagePickerReturn {
  capturePhoto: () => Promise<PickedImage | null>;
  selectFromGallery: () => Promise<PickedImage | null>;
  error: string | null;
  setError: (error: string | null) => void;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const WARN_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Hook for image selection from camera or gallery
 * Handles permissions, validation, and returns image metadata
 */
export const useImagePicker = (): UseImagePickerReturn => {
  const [error, setError] = useState<string | null>(null);

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      const libraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraStatus.status !== 'granted') {
        setError('Camera permission is required to capture photos');
        return false;
      }

      if (libraryStatus.status !== 'granted') {
        setError('Photo library permission is required to select images');
        return false;
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request permissions';
      setError(message);
      return false;
    }
  };

  const validateImage = async (uri: string): Promise<{ valid: boolean; size: number }> => {
  try {
    // 1. Create a File instance from the URI
    const file = new File(uri);

    // 2. Check if the file exists using the exists property
    if (!file.exists) {
      throw new Error('Image file not found');
    }

    // 3. Access the size directly
    const size = file.size;

    if (size > MAX_IMAGE_SIZE) {
      setError(`Image is too large (${Math.round(size / 1024 / 1024)}MB > 10MB). Please select a smaller image.`);
      return { valid: false, size };
    }

    if (size > WARN_IMAGE_SIZE) {
      console.warn(`Image is ${Math.round(size / 1024 / 1024)}MB. Consider using a smaller image for faster processing.`);
    }

    return { valid: true, size };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to validate image';
    setError(message);
    return { valid: false, size: 0 };
  }
};

  // 1. Update the signature to accept ImagePickerResult instead of SuccessResult
  const processPickerResult = async (
    result: ImagePicker.ImagePickerResult
  ): Promise<PickedImage | null> => {
    try {
      setError(null);

      // TypeScript now knows this might be a cancellation
      if (result.canceled) {
        return null;
      }

      // After the canceled check, TS automatically narrows the type 
      // to ImagePickerSuccessResult, so result.assets is safe to use.
      const asset = result.assets[0];
      if (!asset.uri) {
        setError('No image selected');
        return null;
      }

      // ... rest of your validation logic remains the same
      const mimeType = asset.mimeType?.toLowerCase() || '';
      if (!mimeType.includes('jpeg') && !mimeType.includes('jpg') && !mimeType.includes('png')) {
        setError('Please select a JPEG or PNG image');
        return null;
      }

      const { valid, size } = await validateImage(asset.uri);
      if (!valid) return null;

      const filename = asset.fileName || asset.uri.split('/').pop() || 'image.jpg';
      const type = mimeType.includes('png') ? 'image/png' : 'image/jpeg';

      return {
        uri: asset.uri,
        filename,
        size,
        type,
        width: asset.width,
        height: asset.height,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process image';
      setError(message);
      return null;
    }
  };

  const capturePhoto = async (): Promise<PickedImage | null> => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchCameraAsync({
        // 2. Updated to resolve the deprecation warning
        mediaTypes: ['images'], 
        allowsEditing: false,
        aspect: [1, 1],
        quality: 0.8,
      });

      return await processPickerResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to capture photo';
      setError(message);
      return null;
    }
  };

  const selectFromGallery = async (): Promise<PickedImage | null> => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        // 2. Updated to resolve the deprecation warning
        mediaTypes: ['images'], 
        allowsEditing: false,
        quality: 0.8,
      });

      return await processPickerResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to select image';
      setError(message);
      return null;
    }
  };

  return {
    capturePhoto,
    selectFromGallery,
    error,
    setError,
  };
};
