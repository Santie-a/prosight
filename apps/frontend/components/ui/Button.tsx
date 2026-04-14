import React from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Text } from './Text';
// 1. Importar los iconos
import { Ionicons } from '@expo/vector-icons'; 

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
  // 2. Nuevas props para el icono
  iconName?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  disabled = false,
  accessibilityLabel,
  style,
  iconName,
  iconSize,
}) => {
  const { theme, fontSize } = useAccessibility();

  const getButtonStyle = (): ViewStyle => {
    const base: ViewStyle = {
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: fontSize.button + 24,
      // 3. Importante: permitir que los elementos se apilen verticalmente
      flexDirection: 'column', 
      gap: 8,
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
      // 4. Aseguramos que el botón ocupe el flex que le pase el padre
      style={[getButtonStyle(), style]}
    >
      {/* 5. Renderizado del icono si existe */}
      {iconName && (
        <Ionicons 
          name={iconName} 
          size={iconSize || 32} 
          color={getTextColor()} 
        />
      )}
      
      <Text
        variant="button"
        style={{
          color: getTextColor(),
          textAlign: 'center',
          // Aumentamos un poco el tamaño si el botón es el gigante
          fontSize: iconSize ? fontSize.button + 2 : fontSize.button,
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};