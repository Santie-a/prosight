import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  AccessibilityInfo,
} from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { VOICES, VOICE_NAMES } from '@/constants/config';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { ThemeName, FontSizeName, VoiceName } from '@/hooks/types';

const voiceAssets: Record<VoiceName, any> = {
  af_bella: require('@/assets/audio/voices/af_bella.wav'),
  af_heart: require('@/assets/audio/voices/af_heart.wav'),
  af_sky: require('@/assets/audio/voices/af_sky.wav'),
  am_echo: require('@/assets/audio/voices/am_echo.wav'),
  am_liam: require('@/assets/audio/voices/am_liam.wav'),
  am_puck: require('@/assets/audio/voices/am_puck.wav'),
};

export default function SettingsScreen() {
  const { theme, fontSize, setTheme, setFontSize, setVoice, themeName, fontSizeName, voiceName } = useAccessibility();
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(themeName);
  const [selectedFont, setSelectedFont] = useState<FontSizeName>(fontSizeName);
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(voiceName);
  const [isPlayingVoice, setIsPlayingVoice] = useState<VoiceName | null>(null);

  // Audio player for voice samples
  const player = useAudioPlayer('');

  const themeNames: ThemeName[] = ['light', 'dark', 'highContrast'];
  const fontNames: FontSizeName[] = ['small', 'medium', 'large', 'extraLarge'];
  const voiceNames: VoiceName[] = [...VOICE_NAMES];

  const getThemeDescription = (themeName: ThemeName): string => {
    switch (themeName) {
      case 'light':
        return 'Light background with dark text';
      case 'dark':
        return 'Dark background with light text';
      case 'highContrast':
        return 'High contrast for better visibility';
      default:
        return '';
    }
  };

  const getFontDescription = (fontName: FontSizeName): string => {
    switch (fontName) {
      case 'small':
        return 'Small text';
      case 'medium':
        return 'Standard size text';
      case 'large':
        return 'Large text';
      case 'extraLarge':
        return 'Extra large text';
      default:
        return '';
    }
  };

  const getVoiceDescription = (voiceName: VoiceName): string => {
    return VOICES[voiceName]?.description || '';
  };

  const playVoiceSample = async (voiceNameToPlay: VoiceName) => {
    try {
      setIsPlayingVoice(voiceNameToPlay);
      const voiceAsset = voiceAssets[voiceNameToPlay];
      if (!voiceAsset) {
        console.error(`Voice asset not found for ${voiceNameToPlay}`);
        setIsPlayingVoice(null);
        return;
      }
      player.replace(voiceAsset);
      await player.play();
      // Reset playing state when done (this is a simplification; ideally we'd listen to playback end)
      setTimeout(() => {
        setIsPlayingVoice(null);
      }, 5000); // Assume samples are less than 5 seconds
    } catch (err) {
      console.error('Error playing voice sample:', err);
      setIsPlayingVoice(null);
    }
  };

  const handleThemeChange = async (newTheme: ThemeName) => {
    setSelectedTheme(newTheme);
    await setTheme(newTheme);
    await AccessibilityInfo.announceForAccessibility(
      `Theme changed to ${newTheme}`
    );
  };

  const handleFontSizeChange = async (newSize: FontSizeName) => {
    setSelectedFont(newSize);
    await setFontSize(newSize);
    await AccessibilityInfo.announceForAccessibility(
      `Font size changed to ${newSize}`
    );
  };

  const handleVoiceChange = async (newVoice: VoiceName) => {
    setSelectedVoice(newVoice);
    await setVoice(newVoice);
    const voiceLabel = VOICES[newVoice]?.label || newVoice;
    await playVoiceSample(newVoice);
    await AccessibilityInfo.announceForAccessibility(
      `Voice changed to ${voiceLabel}`
    );
  };

  const handleReset = () => {
    Alert.alert('Reset to Defaults', 'Are you sure?', [
      {
        text: 'Cancel',
        onPress: () => {},
        style: 'cancel',
      },
      {
        text: 'Reset',
        onPress: async () => {
          await handleThemeChange('light');
          await handleFontSizeChange('medium');
          await handleVoiceChange('af_heart');
          await AccessibilityInfo.announceForAccessibility(
            'Settings reset to defaults'
          );
        },
        style: 'destructive',
      },
    ]);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 16,
      gap: 16,
    },
    section: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: fontSize.large,
      fontWeight: '600',
      marginBottom: 12,
      color: theme.text,
    },
    optionGroup: {
      gap: 8,
    },
    optionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: theme.border,
      borderRadius: 8,
      gap: 12,
    },
    optionButtonSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '15',
    },
    radioCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioCircleSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    radioInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.surface,
    },
    optionContent: {
      flex: 1,
    },
    optionLabel: {
      fontWeight: '500',
      marginBottom: 4,
      color: theme.text,
    },
    optionDescription: {
      fontSize: fontSize.subtitle,
      color: theme.textSecondary,
    },
    voiceOptionWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    voiceOptionButton: {
      flex: 1,
    },
    playButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: theme.border,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    playButtonActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '15',
    },
    playButtonText: {
      fontSize: 18,
      color: theme.text,
    },
    playingIndicator: {
      fontSize: 12,
      marginLeft: 4,
    },
    previewSection: {
      marginTop: 12,
      padding: 16,
      backgroundColor: theme.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    previewTitle: {
      fontSize: fontSize.large,
      fontWeight: '600',
      marginBottom: 8,
      color: theme.text,
    },
    previewText: {
      fontSize: fontSize.body,
      color: theme.text,
      marginBottom: 8,
    },
    previewSmall: {
      fontSize: fontSize.subtitle,
      color: theme.textSecondary,
    },
    footerButtons: {
      gap: 8,
      marginBottom: 20,
      marginTop: 16,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 16,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Theme Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <View style={styles.optionGroup}>
            {themeNames.map((themeName) => (
              <TouchableOpacity
                key={themeName}
                onPress={() => handleThemeChange(themeName)}
                style={[
                  styles.optionButton,
                  selectedTheme === themeName && styles.optionButtonSelected,
                ]}
                accessibilityLabel={`Theme: ${themeName}`}
                accessibilityHint={`Set theme to ${themeName}. Current theme: ${selectedTheme}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedTheme === themeName }}
              >
                <View
                  style={[
                    styles.radioCircle,
                    selectedTheme === themeName && styles.radioCircleSelected,
                  ]}
                >
                  {selectedTheme === themeName && <View style={styles.radioInner} />}
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>{themeName}</Text>
                  <Text style={styles.optionDescription}>
                    {getThemeDescription(themeName)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Font Size Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Font Size</Text>
          <View style={styles.optionGroup}>
            {fontNames.map((fontName) => (
              <TouchableOpacity
                key={fontName}
                onPress={() => handleFontSizeChange(fontName)}
                style={[
                  styles.optionButton,
                  selectedFont === fontName && styles.optionButtonSelected,
                ]}
                accessibilityLabel={`Font size: ${fontName}`}
                accessibilityHint={`Set font size to ${fontName}. Current size: ${selectedFont}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedFont === fontName }}
              >
                <View
                  style={[
                    styles.radioCircle,
                    selectedFont === fontName && styles.radioCircleSelected,
                  ]}
                >
                  {selectedFont === fontName && <View style={styles.radioInner} />}
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>{fontName}</Text>
                  <Text style={styles.optionDescription}>
                    {getFontDescription(fontName)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Voice Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice</Text>
          <View style={styles.optionGroup}>
            {voiceNames.map((voiceName) => (
              <View key={voiceName} style={styles.voiceOptionWrapper}>
                <TouchableOpacity
                  onPress={() => handleVoiceChange(voiceName)}
                  style={[
                    styles.optionButton,
                    styles.voiceOptionButton,
                    selectedVoice === voiceName && styles.optionButtonSelected,
                  ]}
                  accessibilityLabel={`Voice: ${VOICES[voiceName]?.label || voiceName}`}
                  accessibilityHint={`Set voice to ${VOICES[voiceName]?.label || voiceName}. Current voice: ${VOICES[selectedVoice]?.label || selectedVoice}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedVoice === voiceName }}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      selectedVoice === voiceName && styles.radioCircleSelected,
                    ]}
                  >
                    {selectedVoice === voiceName && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionLabel}>{VOICES[voiceName]?.label || voiceName}</Text>
                    <Text style={styles.optionDescription}>
                      {getVoiceDescription(voiceName)}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Preview Section */}
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>Preview</Text>
          <Text style={styles.previewText}>
            This is how your text will look with the current settings.
          </Text>
          <Text style={styles.previewSmall}>
            Smaller text appears here for captions and descriptions.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.footerButtons}>
          <Button
            onPress={handleReset}
            title="Reset to Defaults"
            variant="outline"
            accessibilityLabel="Reset all settings to default values"
          />
        </View>
      </ScrollView>
    </View>
  );
}
