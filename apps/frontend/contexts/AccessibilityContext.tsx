import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, FONT_SIZES, THEME_NAMES, FONT_SIZE_NAMES, VOICES, VOICE_NAMES } from '@/constants/config';
import { ThemeName, FontSizeName, VoiceName, Theme, FontSizes } from '@/hooks/types';

interface AccessibilitySettings {
  themeName: ThemeName;
  fontSizeName: FontSizeName;
  voiceName: VoiceName;
  theme: Theme;
  fontSize: FontSizes;
  setTheme: (name: ThemeName) => Promise<void>;
  setFontSize: (name: FontSizeName) => Promise<void>;
  setVoice: (name: VoiceName) => Promise<void>;
  isLoaded: boolean;
}

const AccessibilityContext = createContext<AccessibilitySettings | undefined>(undefined);

const DEFAULT_THEME: ThemeName = 'light';
const DEFAULT_FONT_SIZE: FontSizeName = 'medium';
const DEFAULT_VOICE: VoiceName = 'af_heart';
const STORAGE_KEYS = {
  THEME: 'prosight_theme',
  FONT_SIZE: 'prosight_font_size',
  VOICE: 'prosight_voice',
};

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [themeName, setThemeName] = useState<ThemeName>(DEFAULT_THEME);
  const [fontSizeName, setFontSizeName] = useState<FontSizeName>(DEFAULT_FONT_SIZE);
  const [voiceName, setVoiceName] = useState<VoiceName>(DEFAULT_VOICE);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [savedTheme, savedFontSize, savedVoice] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.THEME),
        AsyncStorage.getItem(STORAGE_KEYS.FONT_SIZE),
        AsyncStorage.getItem(STORAGE_KEYS.VOICE),
      ]);

      if (savedTheme && (THEME_NAMES as readonly string[]).includes(savedTheme)) {
        setThemeName(savedTheme as ThemeName);
      }
      if (savedFontSize && (FONT_SIZE_NAMES as readonly string[]).includes(savedFontSize)) {
        setFontSizeName(savedFontSize as FontSizeName);
      }
      if (savedVoice && (VOICE_NAMES as readonly string[]).includes(savedVoice)) {
        setVoiceName(savedVoice as VoiceName);
      }
    } catch (error) {
      console.error('Error loading accessibility settings:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const handleSetTheme = async (name: ThemeName) => {
    try {
      setThemeName(name);
      await AsyncStorage.setItem(STORAGE_KEYS.THEME, name);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const handleSetFontSize = async (name: FontSizeName) => {
    try {
      setFontSizeName(name);
      await AsyncStorage.setItem(STORAGE_KEYS.FONT_SIZE, name);
    } catch (error) {
      console.error('Error saving font size:', error);
    }
  };

  const handleSetVoice = async (name: VoiceName) => {
    try {
      setVoiceName(name);
      await AsyncStorage.setItem(STORAGE_KEYS.VOICE, name);
    } catch (error) {
      console.error('Error saving voice:', error);
    }
  };

  const value: AccessibilitySettings = {
    themeName,
    fontSizeName,
    voiceName,
    theme: THEMES[themeName],
    fontSize: FONT_SIZES[fontSizeName],
    setTheme: handleSetTheme,
    setFontSize: handleSetFontSize,
    setVoice: handleSetVoice,
    isLoaded,
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};
