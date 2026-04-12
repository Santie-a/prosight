import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Text } from './Text';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  fullScreen = false,
}) => {
  const { theme, fontSize } = useAccessibility();

  const styles = StyleSheet.create({
    container: {
      flex: fullScreen ? 1 : 0,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: fullScreen ? theme.background : 'transparent',
    },
    text: {
      marginTop: 12,
      fontSize: fontSize.body,
      color: theme.text,
    },
  });

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.primary} />
      {message && <Text style={styles.text}>{message}</Text>}
    </View>
  );
};
