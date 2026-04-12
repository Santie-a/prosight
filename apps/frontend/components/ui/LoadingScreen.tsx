import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Text } from './Text';

export const LoadingScreen: React.FC<{ message?: string }> = ({
  message = 'Loading app...',
}) => {
  const { theme, fontSize } = useAccessibility();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    text: {
      fontSize: fontSize.body,
      color: theme.text,
    },
  });

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};
