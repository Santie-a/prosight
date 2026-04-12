import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { File } from 'expo-file-system';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useFilePicker, PickedDocument } from '@/hooks/useFilePicker';
import { useDocumentStorage } from '@/hooks/useDocumentStorage';
import { documentsAPI } from '@/services/api';

interface PDFUploadScreenProps {
  onUploadSuccess: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const PDFUploadScreen: React.FC<PDFUploadScreenProps> = ({ onUploadSuccess }) => {
  const { theme, fontSize } = useAccessibility();
  const { selectPDF, error: pickerError, setError: setPickerError } = useFilePicker();
  const { storeProcessedDocument } = useDocumentStorage();

  const [selectedFile, setSelectedFile] = useState<PickedDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: fontSize.title,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    selectButton: {
      marginBottom: 12,
    },
    fileInfoContainer: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 16,
    },
    fileRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    fileLabel: {
      fontSize: fontSize.body - 2,
      color: theme.textSecondary,
      flex: 1,
    },
    fileValue: {
      fontSize: fontSize.body - 2,
      color: theme.text,
      fontWeight: '500',
      flex: 1,
      textAlign: 'right',
    },
    errorContainer: {
      backgroundColor: `${theme.primary}20`,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    errorText: {
      fontSize: fontSize.body - 2,
      color: theme.primary,
    },
    successContainer: {
      backgroundColor: `#4CAF5020`,
      borderLeftWidth: 4,
      borderLeftColor: '#4CAF50',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    successText: {
      fontSize: fontSize.body - 2,
      color: '#4CAF50',
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyStateIcon: {
      fontSize: 64,
      marginBottom: 12,
    },
    emptyStateText: {
      fontSize: fontSize.body,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptyStateSubtext: {
      fontSize: fontSize.body - 2,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    uploadButtonContainer: {
      marginBottom: 12,
    },
    clearButtonContainer: {
      marginBottom: 16,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
    },
    button: {
      flex: 1,
    },
  });

  const handleSelectFile = async () => {
    setPickerError(null);
    setError(null);
    const file = await selectPDF();
    if (file) {
      setSelectedFile(file);
    }
  };


const handleUpload = async () => {
  if (!selectedFile) {
    setError('No file selected');
    return;
  }

  setLoading(true);
  setError(null);

  try {
    // 1. Initialize the modern File instance
    const file = new File(selectedFile.uri);

    if (!file.exists) {
      throw new Error('The selected file no longer exists.');
    }

    // 2. Call API to process document
    const processedDoc = await documentsAPI.process(selectedFile.uri, selectedFile.filename);

    // 3. Read the file content using the new API
    // .base64() is the modern replacement for readAsStringAsync with Base64 encoding
    const binaryData = await file.bytes();

    // 4. Store in database
    await storeProcessedDocument(
      processedDoc,
      binaryData,
      selectedFile.mimeType
    );

    setUploadSuccess(true);
    setSelectedFile(null);

    // 5. Call success callback
    setTimeout(() => {
      onUploadSuccess();
    }, 1500);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to upload and process document';
    setError(message);
    console.error('Upload error:', err);
  } finally {
    setLoading(false);
  }
};

  const handleClearSelection = () => {
    setSelectedFile(null);
    setError(null);
    setPickerError(null);
    setUploadSuccess(false);
  };

  // Show loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Processing PDF..." fullScreen />
      </View>
    );
  }

  // Show success state
  if (uploadSuccess) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.content}>
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateIcon}>✓</Text>
            <Text style={styles.sectionTitle}>PDF Uploaded Successfully</Text>
            <Text style={styles.emptyStateText}>
              Your document has been processed and stored
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Show file selection screen
  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Error message */}
        {(error || pickerError) && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error || pickerError}</Text>
          </View>
        )}

        {/* Empty state or file info */}
        {!selectedFile ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateIcon}>📄</Text>
            <Text style={styles.sectionTitle}>Upload PDF Document</Text>
            <Text style={styles.emptyStateText}>
              Select a PDF file to upload and process
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Maximum file size: 50MB
            </Text>
          </View>
        ) : (
          <>
            {/* File Info Display */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Selected File</Text>
              <View style={styles.fileInfoContainer}>
                <View style={styles.fileRow}>
                  <Text style={styles.fileLabel}>Filename:</Text>
                  <Text style={styles.fileValue} numberOfLines={1}>
                    {selectedFile.filename}
                  </Text>
                </View>
                <View style={styles.fileRow}>
                  <Text style={styles.fileLabel}>Size:</Text>
                  <Text style={styles.fileValue}>
                    {formatFileSize(selectedFile.size)}
                  </Text>
                </View>
                <View style={styles.fileRow}>
                  <Text style={styles.fileLabel}>Type:</Text>
                  <Text style={styles.fileValue}>{selectedFile.mimeType}</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.section}>
              <View style={styles.uploadButtonContainer}>
                <Button
                  onPress={handleUpload}
                  title="Upload & Process"
                  variant="primary"
                  disabled={loading}
                />
              </View>
              <View style={styles.clearButtonContainer}>
                <Button
                  onPress={handleClearSelection}
                  title="Select Different File"
                  variant="secondary"
                  disabled={loading}
                />
              </View>
            </View>
          </>
        )}

        {/* Select File Button (Only show when no file selected) */}
        {!selectedFile && (
          <View style={styles.section}>
            <View style={styles.selectButton}>
              <Button
                onPress={handleSelectFile}
                title="Select PDF File"
                variant="primary"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};
