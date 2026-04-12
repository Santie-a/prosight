import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Text } from './ui/Text';
import { Button } from './ui/Button';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';

interface AnalysisResultProps {
  description: string;
  imageUri?: string;
  timestamp?: Date;
  onAnalyzeAnother: () => void;
  onCopy?: () => void;
}

const formatDateTime = (date: Date): string => {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const AnalysisResult: React.FC<AnalysisResultProps> = ({
  description,
  imageUri,
  timestamp,
  onAnalyzeAnother,
  onCopy,
}) => {
  const { theme, fontSize } = useAccessibility();
  const { isLoading, isPlaying, currentTime, duration, error: audioError, synthesizeAndPlay, pause, resume, stop } = useAudioPlayback();

  const [showAudioControls, setShowAudioControls] = useState(false);

  // Automatically synthesize and play audio when component mounts
  useEffect(() => {
    const autoPlayAudio = async () => {
      try {
        await synthesizeAndPlay(description);
        setShowAudioControls(true);
      } catch (err) {
        console.error('Error auto-synthesizing audio:', err);
      }
    };

    autoPlayAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const styles = StyleSheet.create({
    container: {
      width: '100%',
      flex: 1,
      paddingHorizontal: 16,
    },
    headerContainer: {
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: {
      fontSize: fontSize.title,
      color: theme.text,
      fontWeight: '600',
      marginBottom: 4,
    },
    timestamp: {
      fontSize: fontSize.body - 2,
      color: theme.textSecondary,
    },
    imageContainer: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 16,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    scrollContent: {
      flex: 1,
      marginBottom: 16,
    },
    descriptionContainer: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 16,
    },
    description: {
      fontSize: fontSize.body,
      color: theme.text,
      lineHeight: fontSize.body * 1.6,
    },
    audioControlsContainer: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 16,
    },
    audioProgressContainer: {
      marginBottom: 12,
    },
    progressBar: {
      height: 4,
      backgroundColor: theme.border,
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.primary,
    },
    timeContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    timeText: {
      fontSize: fontSize.body - 2,
      color: theme.textSecondary,
    },
    audioButtonsContainer: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
    },
    audioButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    audioButtonStopStyle: {
      borderColor: theme.border,
      backgroundColor: 'transparent',
    },
    audioButtonText: {
      fontSize: fontSize.button - 2,
      color: '#FFFFFF',
      fontWeight: '500',
    },
    audioButtonStopText: {
      color: theme.text,
    },
    audioErrorContainer: {
      backgroundColor: `${theme.primary}20`,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
      borderRadius: 8,
      padding: 8,
      marginBottom: 12,
    },
    audioErrorText: {
      fontSize: fontSize.body - 2,
      color: theme.primary,
    },
    buttonContainer: {
      width: '100%',
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
      paddingBottom: 16,
    },
    button: {
      flex: 1,
    },
  });

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Analysis Result</Text>
        {timestamp && (
          <Text style={styles.timestamp}>
            {formatDateTime(timestamp)}
          </Text>
        )}
      </View>

      {/* Image Display */}
      {imageUri && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Description and Audio */}
      <ScrollView style={styles.scrollContent} scrollEnabled>
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>
            {description}
          </Text>
        </View>

        {/* Audio Controls */}
        {showAudioControls && (
          <View style={styles.audioControlsContainer}>
            {audioError && (
              <View style={styles.audioErrorContainer}>
                <Text style={styles.audioErrorText}>{audioError}</Text>
              </View>
            )}

            <View style={styles.audioProgressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>
                  {formatTime(currentTime * 1000)}
                </Text>
                <Text style={styles.timeText}>
                  {formatTime(duration * 1000)}
                </Text>
              </View>
            </View>

            <View style={styles.audioButtonsContainer}>
              {!isPlaying ? (
                <Pressable
                  style={styles.audioButton}
                  onPress={resume}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.audioButtonText}>
                      {currentTime > 0 ? '▶ Resume' : '▶ Play'}
                    </Text>
                  )}
                </Pressable>
              ) : (
                <Pressable
                  style={styles.audioButton}
                  onPress={pause}
                >
                  <Text style={styles.audioButtonText}>⏸ Pause</Text>
                </Pressable>
              )}

              <Pressable
                style={[styles.audioButton, styles.audioButtonStopStyle]}
                onPress={stop}
              >
                <Text style={[styles.audioButtonText, styles.audioButtonStopText]}>⏹ Stop</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {onCopy && (
          <View style={styles.button}>
            <Button
              onPress={onCopy}
              title="Copy"
              variant="outline"
            />
          </View>
        )}
        <View style={styles.button}>
          <Button
            onPress={onAnalyzeAnother}
            title="New Image"
            variant="primary"
          />
        </View>
      </View>
    </View>
  );
};
