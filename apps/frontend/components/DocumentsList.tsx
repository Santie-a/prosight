import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TextInput, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useDocumentStorage } from '@/hooks/useDocumentStorage';
import { DocumentRecord } from '@/constants/database-schema';

interface DocumentsListProps {
  onDocumentSelect: (documentId: string) => void;
  onUploadNew: () => void;
}

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return dateString;
  }
};

export const DocumentsList: React.FC<DocumentsListProps> = ({
  onDocumentSelect,
  onUploadNew,
}) => {
  const { theme, fontSize } = useAccessibility();
  const { listDocuments, removeDocument } = useDocumentStorage();

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch documents from database
  const fetchDocuments = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const docs = await listDocuments();
      // Sort by created_at (newest first)
      const sorted = docs.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setDocuments(sorted);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load documents';
      setError(message);
      console.error('Fetch documents error:', err);
    } finally {
      if (showRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Load documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Filter documents by search text
  const filteredDocuments = useMemo(() => {
    if (!searchText.trim()) {
      return documents;
    }
    const query = searchText.toLowerCase();
    return documents.filter(doc => doc.title.toLowerCase().includes(query));
  }, [documents, searchText]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerContainer: {
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: {
      fontSize: fontSize.title,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: fontSize.body - 2,
      color: theme.textSecondary,
    },
    searchContainer: {
      marginBottom: 16,
    },
    searchInput: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: fontSize.body,
      color: theme.text,
      marginBottom: 12,
    },
    searchPlaceholder: {
      color: theme.textSecondary,
    },
    uploadButtonContainer: {
      marginBottom: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: fontSize.body,
      color: theme.textSecondary,
      marginTop: 12,
    },
    errorContainer: {
      backgroundColor: `${theme.primary}20`,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    errorText: {
      fontSize: fontSize.body - 2,
      color: theme.primary,
    },
    retryButton: {
      marginTop: 12,
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyStateIcon: {
      fontSize: 64,
      marginBottom: 12,
    },
    emptyStateText: {
      fontSize: fontSize.body,
      color: theme.text,
      textAlign: 'center',
      marginBottom: 8,
      fontWeight: '500',
    },
    emptyStateSubtext: {
      fontSize: fontSize.body - 2,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    emptyStateButton: {
      width: '80%',
    },
    documentItem: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    documentItemPressed: {
      backgroundColor: theme.border,
      opacity: 0.7,
    },
    documentTitle: {
      fontSize: fontSize.body,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    documentMetadata: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    metadataItem: {
      flex: 1,
    },
    metadataLabel: {
      fontSize: fontSize.body - 3,
      color: theme.textSecondary,
      marginBottom: 2,
    },
    metadataValue: {
      fontSize: fontSize.body - 2,
      color: theme.text,
      fontWeight: '500',
    },
    documentDate: {
      fontSize: fontSize.body - 3,
      color: theme.textSecondary,
      marginTop: 8,
    },
    listContainer: {
      paddingBottom: 20,
    },
    noResultsContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    noResultsText: {
      fontSize: fontSize.body,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    trashIcon: {
      fontSize: 24,
      color: theme.primary,
      paddingRight: 12,
      paddingTop: 12
    },
  });

  const handleDocumentPress = (documentId: string) => {
    onDocumentSelect(documentId);
  };

  const handleRetry = () => {
    fetchDocuments();
  };

  const handleRefresh = () => {
    fetchDocuments(true);
  };

  const handleRemoveDocument = async (documentId: string) => {
    setDeletingId(documentId);
    try {
      await removeDocument(documentId);
      setDocuments(docs => docs.filter(doc => doc.id !== documentId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete document';
      setError(message);
      console.error('Delete document error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Render document item
  const renderDocumentItem = ({ item }: { item: DocumentRecord }) => (
    <Pressable
      onPress={() => handleDocumentPress(item.id)}
      style={({ pressed }) => [
        styles.documentItem,
        pressed && styles.documentItemPressed,
      ]}
    >
      <Text style={styles.documentTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <View style={styles.documentMetadata}>
        <View style={styles.metadataItem}>
          <Text style={styles.metadataLabel}>Pages</Text>
          <Text style={styles.metadataValue}>{item.page_count}</Text>
        </View>
        <Pressable
          onPress={() => handleRemoveDocument(item.id)}
          disabled={deletingId === item.id}
        >
          <Text style={styles.trashIcon}>
            {deletingId === item.id ? '⏳' : '🗑️'}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.documentDate}>
        {formatDate(item.created_at)}
      </Text>
    </Pressable>
  );

  // Show loading
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading documents...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredDocuments}
        renderItem={renderDocumentItem}
        keyExtractor={item => item.id}
        scrollEnabled
        contentContainerStyle={styles.listContainer}
        onEndReachedThreshold={0.1}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.headerContainer}>
              <Text style={styles.title}>My Documents</Text>
              <Text style={styles.subtitle}>
                {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Search Box */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search documents..."
                placeholderTextColor={theme.textSecondary}
                value={searchText}
                onChangeText={setSearchText}
              />
              <View style={styles.uploadButtonContainer}>
                <Button
                  onPress={onUploadNew}
                  title="Upload New PDF"
                  variant="primary"
                />
              </View>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <View style={styles.retryButton}>
                  <Button
                    onPress={handleRetry}
                    title="Retry"
                    variant="outline"
                  />
                </View>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyStateContainer}>
            {!searchText.trim() ? (
              <>
                <Text style={styles.emptyStateIcon}>📚</Text>
                <Text style={styles.emptyStateText}>No Documents Yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Upload your first PDF to get started
                </Text>
                <View style={styles.emptyStateButton}>
                  <Button
                    onPress={onUploadNew}
                    title="Upload PDF"
                    variant="primary"
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.emptyStateIcon}>🔍</Text>
                <Text style={styles.noResultsText}>
                  No documents match "{searchText}"
                </Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
};
