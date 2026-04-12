/**
 * Storage Utilities
 * 
 * Helper functions for file handling, conversions, and storage operations
 */

/**
 * Convert ArrayBuffer to Uint8Array
 */
export function arrayBufferToUint8Array(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

/**
 * Convert Uint8Array to base64 string
 */
export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < uint8Array.byteLength; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Get human-readable file size
 * @param bytes File size in bytes
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Validate PDF file
 */
export function isValidPDF(filename: string, mimeType: string): boolean {
  const validExtensions = ['.pdf'];
  const validMimeTypes = ['application/pdf', 'application/x-pdf'];

  const hasValidExtension = validExtensions.some((ext) =>
    filename.toLowerCase().endsWith(ext)
  );

  const hasValidMimeType = validMimeTypes.includes(mimeType);

  return hasValidExtension && hasValidMimeType;
}

/**
 * Validate image file
 */
export function isValidImage(filename: string, mimeType: string): boolean {
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const validMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  const hasValidExtension = validExtensions.some((ext) =>
    filename.toLowerCase().endsWith(ext)
  );

  const hasValidMimeType = validMimeTypes.includes(mimeType);

  return hasValidExtension && hasValidMimeType;
}

/**
 * Check if file size is within limits
 * @param sizeBytes File size in bytes
 * @param limitMB Maximum allowed size in MB
 */
export function isFileSizeValid(sizeBytes: number, limitMB: number): boolean {
  const limitBytes = limitMB * 1024 * 1024;
  return sizeBytes <= limitBytes;
}

/**
 * Extract filename from URI
 */
export function extractFilename(uri: string): string {
  return uri.split('/').pop() || 'document';
}

/**
 * Generate unique filename with timestamp
 */
export function generateUniqueFilename(
  originalName: string,
  timestamp = Date.now()
): string {
  const ext = originalName.split('.').pop();
  const name = originalName.replace(`.${ext}`, '');
  return `${name}-${timestamp}.${ext}`;
}
