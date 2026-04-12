import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useDocumentStorage } from '@/hooks/useDocumentStorage';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import { Text } from '@/components/ui/Text';
import { SectionsMenu } from '@/components/SectionsMenu';
import {
  DocumentRecord,
  ChunkRecord,
  SectionRecord,
} from '@/constants/database-schema';

interface ReaderViewProps {
  documentId: string;
  visible: boolean;
  onClose: () => void;
}

const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const ReaderView: React.FC<ReaderViewProps> = ({
  documentId,
  visible,
  onClose,
}) => {
  const { theme, fontSize } = useAccessibility();
  const { getDocumentWithContent } = useDocumentStorage();
  const audioPlayback = useAudioPlayback();

  // Document state
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [chunks, setChunks] = useState<ChunkRecord[]>([]);
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [currentChunkIndex, setCurrentChunkIndex] = useState(-1);
  const [showSectionsMenu, setShowSectionsMenu] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const wasPlayingRef = useRef(false);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerTitle: {
      flex: 1,
      fontSize: fontSize.body,
      fontWeight: '600',
      color: theme.text,
    },
    headerButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: theme.primary,
    },
    headerButtonText: {
      color: '#FFFFFF',
      fontSize: fontSize.button - 2,
      fontWeight: '600',
    },
    closeButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: theme.textSecondary,
    },
    contentContainer: {
      flex: 1,
    },
    chunkItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    chunkItemActive: {
      backgroundColor: `${theme.primary}20`,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
      paddingHorizontal: 13,
    },
    chunkNumber: {
      fontSize: fontSize.body - 3,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    chunkText: {
      fontSize: fontSize.body,
      lineHeight: fontSize.body * 1.6,
      color: theme.text,
    },
    chunkPageIndicator: {
      fontSize: fontSize.body - 2,
      color: theme.textSecondary,
      marginTop: 8,
    },
    audioControlsContainer: {
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    audioControlButtonRow: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
    },
    audioButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 6,
      backgroundColor: theme.primary,
      minWidth: 100,
      alignItems: 'center',
    },
    audioButtonDisabled: {
      backgroundColor: theme.textSecondary,
      opacity: 0.5,
    },
    audioButtonText: {
      color: '#FFFFFF',
      fontSize: fontSize.button - 2,
      fontWeight: '600',
    },
    progressText: {
      fontSize: fontSize.body - 2,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    errorText: {
      fontSize: fontSize.body,
      color: '#EF4444',
      textAlign: 'center',
      marginBottom: 16,
    },
    retryButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 6,
      backgroundColor: theme.primary,
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: fontSize.button - 2,
      fontWeight: '600',
    },
  });

  // Load document on mount
  useEffect(() => {
    if (!visible || !documentId) return;

    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);

        const fullDocument = await getDocumentWithContent(documentId);
        if (!fullDocument) {
          setError('Document not found');
          return;
        }

        setDocument(fullDocument.document);
        setChunks(fullDocument.chunks || []);
        setSections(fullDocument.sections || []);
        setCurrentChunkIndex(-1);
      } catch (err) {
        console.error('Error loading document:', err);
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [visible, documentId, getDocumentWithContent]);

  const handleStartReadingChunk = useCallback(
    (chunkIndex: number) => {
      if (chunkIndex >= 0 && chunkIndex < chunks.length) {
        setCurrentChunkIndex(chunkIndex);
        const chunk = chunks[chunkIndex];
        audioPlayback.synthesizeAndPlay(chunk.text);
      }
    },
    [chunks, audioPlayback]
  );

  const handleScrollToChunk = useCallback((chunkIndex: number) => {
    setCurrentChunkIndex(chunkIndex);
    flatListRef.current?.scrollToIndex({
      index: chunkIndex,
      animated: true,
      viewPosition: 0.5,
    });
  }, []);

  const handleSectionSelect = useCallback(
    (startChunkIndex: number) => {
      handleScrollToChunk(startChunkIndex);
      setShowSectionsMenu(false);
    },
    [handleScrollToChunk]
  );

  const renderChunk = (item: ChunkRecord, index: number) => {
    const isActive = index === currentChunkIndex;

    return (
      <Pressable
        onPress={() => handleStartReadingChunk(index)}
        style={[styles.chunkItem, isActive && styles.chunkItemActive]}
      >
        <Text style={styles.chunkNumber}>
          Chunk {index + 1} of {chunks.length}
        </Text>
        <Text style={styles.chunkText}>{item.text}</Text>
        <Text style={styles.chunkPageIndicator}>Page {item.page_number}</Text>
      </Pressable>
    );
  };

  if (!visible || !document) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {document.title}
          </Text>
          <Pressable
            onPress={() => setShowSectionsMenu(true)}
            style={styles.headerButton}
          >
            <Text style={styles.headerButtonText}>Contents</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.headerButtonText}>Close</Text>
          </Pressable>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={() => setError(null)}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : chunks.length > 0 ? (
          <>
            {/* Sections Menu Modal */}
            <SectionsMenu
              sections={sections}
              chunks={chunks}
              currentChunkIndex={currentChunkIndex}
              visible={showSectionsMenu}
              onClose={() => setShowSectionsMenu(false)}
              onSectionSelect={handleSectionSelect}
              onChunkSelect={handleScrollToChunk}
            />

            {/* Text Reader */}
            <View style={styles.contentContainer}>
              <FlatList
                ref={flatListRef}
                data={chunks}
                keyExtractor={(_, index) => String(index)}
                renderItem={({ item, index }) => renderChunk(item, index)}
                scrollEnabled={true}
              />
            </View>

            {/* Audio Controls */}
            <View style={styles.audioControlsContainer}>
              <View style={styles.audioControlButtonRow}>
                <Pressable
                  onPress={audioPlayback.resume}
                  disabled={audioPlayback.isPlaying}
                  style={[
                    styles.audioButton,
                    audioPlayback.isPlaying && styles.audioButtonDisabled,
                  ]}
                >
                  <Text style={styles.audioButtonText}>▶ Play</Text>
                </Pressable>

                <Pressable
                  onPress={audioPlayback.pause}
                  disabled={!audioPlayback.isPlaying}
                  style={[
                    styles.audioButton,
                    !audioPlayback.isPlaying && styles.audioButtonDisabled,
                  ]}
                >
                  <Text style={styles.audioButtonText}>⏸ Pause</Text>
                </Pressable>

                <Pressable
                  onPress={audioPlayback.stop}
                  style={styles.audioButton}
                >
                  <Text style={styles.audioButtonText}>⏹ Stop</Text>
                </Pressable>
              </View>

              {audioPlayback.isLoading && (
                <Text style={styles.progressText}>Synthesizing audio...</Text>
              )}

              {audioPlayback.error && (
                <Text style={[styles.progressText, { color: '#EF4444' }]}>
                  {audioPlayback.error}
                </Text>
              )}

              {audioPlayback.duration > 0 && (
                <Text style={styles.progressText}>
                  {formatTime(audioPlayback.currentTime * 1000)}s /{' '}
                  {formatTime(audioPlayback.duration * 1000)}s
                </Text>
              )}
            </View>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>No content available</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};
