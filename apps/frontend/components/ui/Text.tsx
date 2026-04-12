import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface CustomTextProps extends TextProps {
  variant?: 'title' | 'subtitle' | 'body' | 'button' | 'large';
  color?: 'primary' | 'secondary' | 'error' | 'success' | 'text' | 'textSecondary' | 'warning';
}

export const Text: React.FC<CustomTextProps> = ({
  variant = 'body',
  color = 'text',
  style,
  ...props
}) => {
  const { fontSize, theme } = useAccessibility();

  const fontSizeValue = fontSize[variant as keyof typeof fontSize] as number;
  const colorValue = theme[color as keyof typeof theme] as string;

  return (
    <RNText
      {...props}
      style={[
        {
          fontSize: fontSizeValue,
          color: colorValue,
          fontWeight: variant === 'title' || variant === 'subtitle' ? '600' : '400',
        },
        style,
      ]}
    />
  );
};
