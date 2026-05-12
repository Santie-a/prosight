import { Theme, FontSizes } from '@/hooks/types';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
export const API_PREFIX = process.env.EXPO_PUBLIC_API_PREFIX || '/api/v1';

export const FONT_SIZES: Record<string, FontSizes> = {
  small: {
    label: 'Small',
    title: 12,
    subtitle: 10,
    body: 10,
    button: 10,
    large: 14,
  },
  medium: {
    label: 'Medium',
    title: 16,
    subtitle: 13,
    body: 14,
    button: 14,
    large: 18,
  },
  large: {
    label: 'Large',
    title: 20,
    subtitle: 16,
    body: 18,
    button: 16,
    large: 22,
  },
  extraLarge: {
    label: 'Extra Large',
    title: 38,
    subtitle: 32,
    body: 34,
    button: 30,
    large: 30,
  },
};

export const THEMES: Record<string, Theme> = {
  light: {
    name: 'Light',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#000000',
    textSecondary: '#666666',
    primary: '#007AFF',
    primaryLight: '#E3F2FD',
    secondary: '#666666',
    border: '#CCCCCC',
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500',
  },
  dark: {
    name: 'Dark',
    background: '#000000',
    surface: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#B3B3B3',
    primary: '#0A84FF',
    primaryLight: '#1C3A5F',
    secondary: '#B3B3B3',
    border: '#333333',
    success: '#30B0C0',
    error: '#FF453A',
    warning: '#FF9500',
  },
  highContrast: {
    name: 'High Contrast',
    background: '#000000',
    surface: '#1A1A1A',
    text: '#FFFF00',
    textSecondary: '#CCCCCC',
    primary: '#00FFFF',
    primaryLight: '#003333',
    secondary: '#FFFFFF',
    border: '#FFFF00',
    success: '#00FF00',
    error: '#FF0000',
    warning: '#FFAA00',
  },
};

export const THEME_NAMES = ['light', 'dark', 'highContrast'] as const;
export const FONT_SIZE_NAMES = ['small', 'medium', 'large', 'extraLarge'] as const;

export const VOICES: Record<string, { id: string; label: string; description: string }> = {
  af_bella: {
    id: 'af_bella',
    label: 'Bella',
    description: 'Female voice - Bella',
  },
  af_heart: {
    id: 'af_heart',
    label: 'Heart',
    description: 'Female voice - Heart (Default)',
  },
  af_sky: {
    id: 'af_sky',
    label: 'Sky',
    description: 'Female voice - Sky',
  },
  am_echo: {
    id: 'am_echo',
    label: 'Echo',
    description: 'Male voice - Echo',
  },
  am_liam: {
    id: 'am_liam',
    label: 'Liam',
    description: 'Male voice - Liam',
  },
  am_puck: {
    id: 'am_puck',
    label: 'Puck',
    description: 'Male voice - Puck',
  },
};

export const VOICE_NAMES = ['af_bella', 'af_heart', 'af_sky', 'am_echo', 'am_liam', 'am_puck'] as const;

// File size limits (in bytes)
export const FILE_LIMITS = {
  IMAGE: 10 * 1024 * 1024, // 10 MB
  PDF: 50 * 1024 * 1024, // 50 MB
};

// Text limits
export const TEXT_LIMITS = {
  TTS_MIN: 1,
  TTS_MAX: 10000,
};
