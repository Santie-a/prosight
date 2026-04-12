import React from 'react';
import { View } from 'react-native';
// 1. Import from the correct library
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Text } from './Text';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { theme, fontSize } = useAccessibility();

  return (
    // 2. Use edges to define which areas to apply padding to (usually 'top')
    <SafeAreaView edges={['top']} style={{ backgroundColor: theme.surface }}>
      <View style={{ padding: 16 }}>
        <Text
          variant="title"
          style={{ fontSize: fontSize.large, marginBottom: subtitle ? 8 : 0 }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text variant="subtitle" color="textSecondary">
            {subtitle}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};