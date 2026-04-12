import React, { ReactNode } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button } from './Button';
import { Text } from './Text';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const { theme, fontSize } = useAccessibility();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    content: {
      width: '100%',
      alignItems: 'center',
      gap: 16,
    },
    icon: {
      fontSize: 48,
      marginBottom: 12,
    },
    title: {
      fontSize: fontSize.large,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    message: {
      fontSize: fontSize.body,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 12,
    },
    errorBox: {
      width: '100%',
      backgroundColor: theme.error + '15',
      borderWidth: 1,
      borderColor: theme.error,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    errorText: {
      fontSize: fontSize.subtitle,
      color: theme.error,
      fontFamily: 'monospace',
    },
    button: {
      minWidth: 200,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} style={{ width: '100%' }}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>Something Went Wrong</Text>
        <Text style={styles.message}>
          An error occurred in the application. Please try again or contact support.
        </Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error.message}</Text>
          </View>
        )}

        <Button
          onPress={onReset}
          title="🔄 Try Again"
          style={styles.button}
          accessibilityLabel="Try again button"
        />
      </ScrollView>
    </View>
  );
}
