import React from 'react';
import { View, Image, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Text } from './ui/Text';
import { Button } from './ui/Button';
import { PickedImage } from '@/hooks/useImagePicker';

interface ImagePreviewProps {
  image: PickedImage;
  onReplace: () => void;
  onClear: () => void;
  isLoading?: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  image,
  onReplace,
  onClear,
  isLoading = false,
}) => {
  const { theme, fontSize } = useAccessibility();

  const styles = StyleSheet.create({
    container: {
      width: '100%',
      alignItems: 'center',
      marginVertical: 16,
      paddingHorizontal: 16,
    },
    imageContainer: {
      position: 'relative',
      width: '100%',
      aspectRatio: 1,
      marginBottom: 12,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    metadataContainer: {
      width: '100%',
      backgroundColor: theme.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    metadataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    metadataLabel: {
      fontSize: fontSize.body - 2,
      color: theme.textSecondary,
      flex: 1,
    },
    metadataValue: {
      fontSize: fontSize.body - 2,
      color: theme.text,
      fontWeight: '500',
      flex: 1,
      textAlign: 'right',
    },
    buttonRow: {
      width: '100%',
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
    },
    button: {
      flex: 1,
    },
  });

  return (
    <View style={styles.container}>
      {/* Image Preview */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: image.uri }}
          style={styles.image}
          resizeMode="cover"
        />
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <View style={styles.button}>
          <Button
            onPress={onReplace}
            title="Replace"
            variant="secondary"
            disabled={isLoading}
          />
        </View>
        <View style={styles.button}>
          <Button
            onPress={onClear}
            title="Clear"
            variant="outline"
            disabled={isLoading}
          />
        </View>
      </View>
    </View>
  );
};
