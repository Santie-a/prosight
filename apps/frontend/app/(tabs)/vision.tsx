import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ImagePreview } from '@/components/ImagePreview';
import { AnalysisResult } from '@/components/AnalysisResult';
import { useImagePicker, PickedImage } from '@/hooks/useImagePicker';
import { visionAPI } from '@/services/api';

type DetailLevel = 'brief' | 'detailed' | 'navigation';

export default function VisionScreen() {
  const { theme, fontSize } = useAccessibility();

  // State management
  const [selectedImage, setSelectedImage] = useState<PickedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ description: string } | null>(null);
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('detailed');
  const [resultTimestamp, setResultTimestamp] = useState<Date | null>(null);

  // Image picker hook
  const { capturePhoto, selectFromGallery, error: pickerError, setError: setPickerError } = useImagePicker();

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
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: fontSize.title,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    detailLevelContainer: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
    },
    detailButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: theme.border,
      backgroundColor: 'transparent',
    },
    detailButtonActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    detailButtonText: {
      fontSize: fontSize.button - 2,
      color: theme.text,
      fontWeight: '500',
    },
    detailButtonTextActive: {
      color: '#FFFFFF',
    },
    selectionButtonsContainer: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
    },
    selectionButton: {
      flex: 1,
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
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyStateText: {
      fontSize: fontSize.body,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 12,
    },
    analyzeButtonContainer: {
      paddingVertical: 12,
    },
  });

  // Handle camera capture
  const handleCapturePhoto = async () => {
    setPickerError(null);
    setError(null);
    const image = await capturePhoto();
    if (image) {
      setSelectedImage(image);
      setResult(null);
      setResultTimestamp(null);
    }
  };

  // Handle gallery selection
  const handleSelectFromGallery = async () => {
    setPickerError(null);
    setError(null);
    const image = await selectFromGallery();
    if (image) {
      setSelectedImage(image);
      setResult(null);
      setResultTimestamp(null);
    }
  };

  // Handle image replacement
  const handleReplaceImage = async () => {
    setPickerError(null);
    setError(null);
    const image = await selectFromGallery();
    if (image) {
      setSelectedImage(image);
      setResult(null);
      setResultTimestamp(null);
    }
  };

  // Handle image clear
  const handleClearImage = () => {
    setSelectedImage(null);
    setResult(null);
    setResultTimestamp(null);
    setError(null);
    setPickerError(null);
  };

  // Submit image for analysis
  const handleAnalyzeImage = async () => {
    if (!selectedImage) {
      setError('No image selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await visionAPI.describe(selectedImage.uri, detailLevel);
      setResult(response);
      setResultTimestamp(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze image';
      setError(message);
      console.error('Vision API error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle copy description
  const handleCopyDescription = async () => {
    if (!result?.description) return;

    try {
      // Note: React Native doesn't have a built-in clipboard API
      // In a real app, you would use a library like @react-native-clipboard/clipboard
      console.log('Copy description:', result.description);
      // For now, just show a message
      setError(null);
    } catch (err) {
      console.error('Copy error:', err);
    }
  };

  // Handle analyze another
  const handleAnalyzeAnother = () => {
    setSelectedImage(null);
    setResult(null);
    setResultTimestamp(null);
    setError(null);
  };

  // Show loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Analyzing image..." fullScreen />
      </View>
    );
  }

  // Show result if available
  if (result && selectedImage) {
    return (
      <View style={styles.container}>
        <AnalysisResult
          description={result.description}
          imageUri={selectedImage.uri}
          timestamp={resultTimestamp || undefined}
          onAnalyzeAnother={handleAnalyzeAnother}
          onCopy={handleCopyDescription}
        />
      </View>
    );
  }

  // Show image preview if selected
  if (selectedImage) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.content}>
          <ImagePreview
            image={selectedImage}
            onReplace={handleReplaceImage}
            onClear={handleClearImage}
            isLoading={loading}
          />

          {/* Detail Level Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Analysis Detail</Text>
            <View style={styles.detailLevelContainer}>
              {(['brief', 'detailed', 'navigation'] as const).map((level) => (
                <Pressable
                  key={level}
                  onPress={() => setDetailLevel(level)}
                  disabled={loading}
                  style={[
                    styles.detailButton,
                    detailLevel === level && styles.detailButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.detailButtonText,
                      detailLevel === level && styles.detailButtonTextActive,
                    ]}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Error message */}
          {(error || pickerError) && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error || pickerError}</Text>
            </View>
          )}

          {/* Analyze Button */}
          <View style={styles.analyzeButtonContainer}>
            <Button
              onPress={handleAnalyzeImage}
              title="Analyze Image"
              variant="primary"
              disabled={loading}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  // Show image selection screen
  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Error message */}
        {(error || pickerError) && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error || pickerError}</Text>
          </View>
        )}

        {/* Empty state */}
        <View style={styles.emptyStateContainer}>
          <Text style={{ fontSize: 48 }}>📷</Text>
          <Text style={styles.sectionTitle}>Select an Image</Text>
          <Text style={styles.emptyStateText}>
            Choose an image from your device or capture a new one to analyze
          </Text>
        </View>

        {/* Selection buttons */}
        <View style={styles.selectionButtonsContainer}>
          <View style={styles.selectionButton}>
            <Button
              onPress={handleCapturePhoto}
              title="Capture Photo"
              variant="primary"
              disabled={loading}
            />
          </View>
          <View style={styles.selectionButton}>
            <Button
              onPress={handleSelectFromGallery}
              title="Select from Gallery"
              variant="secondary"
              disabled={loading}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
