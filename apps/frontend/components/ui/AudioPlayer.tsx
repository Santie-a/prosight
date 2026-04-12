import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  AccessibilityInfo,
} from 'react-native';
import { Audio } from 'expo-av';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Text } from './Text';

interface AudioPlayerProps {
  onPlayPause?: (isPlaying: boolean) => void;
  onStop?: () => void;
  title?: string;
  duration?: number;
  currentTime?: number;}

export function AudioPlayer({
  onPlayPause,
  onStop,
  title = 'Now Playing',
  duration = 0,
  currentTime = 0,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const { theme, fontSize } = useAccessibility();

  useEffect(() => {
    if (duration > 0) {
      setSliderValue((currentTime / duration) * 100);
    }
  }, [currentTime, duration]);

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    const newState = !isPlaying;
    setIsPlaying(newState);
    
    await AccessibilityInfo.announceForAccessibility(
      newState ? 'Playing' : 'Paused'
    );
    
    if (onPlayPause) {
      onPlayPause(newState);
    }
  };

  const handleStop = async () => {
    setIsPlaying(false);
    
    await AccessibilityInfo.announceForAccessibility('Stopped');
    
    if (onStop) {
      onStop();
    }
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    titleText: {
      fontSize: fontSize.subtitle,
      color: theme.textSecondary,
      marginBottom: 8,
    },
    progressContainer: {
      gap: 8,
      marginBottom: 12,
    },
    timeContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
    },
    timeText: {
      fontSize: fontSize.subtitle,
      color: theme.textSecondary,
    },
    controlsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    controlButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    controlButtonSecondary: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    controlButtonText: {
      fontSize: 20,
    },
    progressBar: {
      height: 4,
      backgroundColor: theme.border,
      borderRadius: 2,
      marginBottom: 8,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.primary,
    },
  });

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      {title && <Text style={styles.titleText}>{title}</Text>}

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, styles.controlButtonSecondary]}
          onPress={handleStop}
          accessible={true}
          accessibilityLabel="Stop playback"
          accessibilityRole="button"
        >
          <Text style={styles.controlButtonText}>⏹️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={handlePlayPause}
          accessible={true}
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          accessibilityRole="button"
        >
          <Text style={styles.controlButtonText}>
            {isPlaying ? '⏸️' : '▶️'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.controlButtonSecondary]}
          accessible={true}
          accessibilityLabel="Settings"
          accessibilityRole="button"
        >
          <Text style={styles.controlButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
