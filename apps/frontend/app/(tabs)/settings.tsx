import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  AccessibilityInfo,
} from 'react-native';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { ThemeName, FontSizeName } from '@/hooks/types';

export default function SettingsScreen() {
  const { theme, fontSize, setTheme, setFontSize, themeName, fontSizeName } = useAccessibility();
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(themeName);
  const [selectedFont, setSelectedFont] = useState<FontSizeName>(fontSizeName);

  const themeNames: ThemeName[] = ['light', 'dark', 'highContrast'];
  const fontNames: FontSizeName[] = ['small', 'medium', 'large', 'extraLarge'];

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
      <Header title="Settings" subtitle="Customize your experience" />

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
            title="🔄 Reset to Defaults"
            variant="outline"
            accessibilityLabel="Reset all settings to default values"
          />
        </View>
      </ScrollView>
    </View>
  );
}
