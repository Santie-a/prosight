import React from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Text } from './Text';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  disabled = false,
  accessibilityLabel,
  style,
}) => {
  const { theme, fontSize } = useAccessibility();

  const getButtonStyle = (): ViewStyle => {
    const base: ViewStyle = {
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: fontSize.button + 24,
    };

    switch (variant) {
      case 'primary':
        return {
          ...base,
          backgroundColor: disabled ? theme.textSecondary : theme.primary,
        };
      case 'secondary':
        return {
          ...base,
          backgroundColor: disabled ? theme.textSecondary : theme.surface,
          borderColor: theme.primary,
          borderWidth: 2,
        };
      case 'outline':
        return {
          ...base,
          borderColor: disabled ? theme.textSecondary : theme.border,
          borderWidth: 2,
        };
      default:
        return base;
    }
  };

  const getTextColor = () => {
    if (variant === 'primary') return '#FFFFFF';
    return theme.text;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled }}
      style={[getButtonStyle(), style]}
    >
      <Text
        variant="button"
        style={{
          color: getTextColor(),
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};
