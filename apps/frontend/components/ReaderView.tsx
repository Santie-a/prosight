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
import { useDocumentStorage, DocumentWithContent } from '@/hooks/useDocumentStorage';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import { Text } from '@/components/ui/Text';
import { SectionsMenu } from '@/components/SectionsMenu';
import {
  DocumentRecord,
  ContentBlockRecord,
  BlockTableRecord,
  SectionRecord,
} from '@/constants/database-schema';
import { ScrollView } from 'react-native';

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

/**
 * Resolve the best text to send to TTS for a given block.
 *
 * Priority:
 *   tts_override  — manually curated, always preferred if present
 *   text          — native extracted text (covers text, heading, table markdown)
 *   ocr_text      — OCR fallback for figures and low-quality scans
 *   ai_description — AI-generated figure description
 *   default       — generic page announcement so TTS never goes silent
 */
function resolveTtsText(block: ContentBlockRecord): string {
  if (block.tts_override) return block.tts_override;
  if (block.text) return block.text;
  if (block.ocr_text) return block.ocr_text;
  if (block.ai_description) return block.ai_description;
  return `Figure on page ${block.page_number}`;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  documentId,
  visible,
  onClose,
}) => {
  const { theme, fontSize, voiceName } = useAccessibility();
  const { getDocumentWithContent } = useDocumentStorage();
  const audioPlayback = useAudioPlayback();

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [blocks, setBlocks] = useState<ContentBlockRecord[]>([]);
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [blockTables, setBlockTables] = useState<Map<string, BlockTableRecord>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentBlockIndex, setCurrentBlockIndex] = useState(-1);
  const [showSectionsMenu, setShowSectionsMenu] = useState(false);
  const flatListRef = useRef<FlatList>(null);

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
    closeButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: theme.textSecondary,
    },
    headerButtonText: {
      color: '#FFFFFF',
      fontSize: fontSize.button - 2,
      fontWeight: '600',
    },
    contentContainer: {
      flex: 1,
    },

    // --- Shared block wrapper ---
    blockItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    blockItemActive: {
      backgroundColor: `${theme.primary}20`,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
      paddingHorizontal: 13,
    },
    blockMeta: {
      fontSize: fontSize.body - 3,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    pageIndicator: {
      fontSize: fontSize.body - 2,
      color: theme.textSecondary,
      marginTop: 8,
    },

    // --- Text block ---
    textContent: {
      fontSize: fontSize.body,
      lineHeight: fontSize.body * 1.6,
      color: theme.text,
    },

    // --- Heading block ---
    headingContent: {
      fontSize: fontSize.body + 2,
      fontWeight: '700',
      color: theme.text,
      lineHeight: (fontSize.body + 2) * 1.4,
    },

    // --- Table block ---
    tableWrapper: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    tableLabel: {
      fontSize: fontSize.body - 2,
      color: theme.textSecondary,
      fontStyle: 'italic',
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 4,
      backgroundColor: theme.background,
    },
    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: theme.primary,
    },
    tableRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    tableRowAlt: {
      backgroundColor: `${theme.primary}08`,
    },
    tableHeaderCell: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minWidth: 80,
    },
    tableHeaderCellText: {
      fontSize: fontSize.body - 1,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    tableCell: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minWidth: 80,
      borderRightWidth: 1,
      borderRightColor: theme.border,
    },
    tableCellLast: {
      borderRightWidth: 0,
    },
    tableCellText: {
      fontSize: fontSize.body - 1,
      color: theme.text,
      lineHeight: (fontSize.body - 1) * 1.4,
    },
    tableFallback: {
      padding: 12,
      backgroundColor: theme.background,
    },
    tableFallbackText: {
      fontSize: fontSize.body - 2,
      color: theme.text,
      fontFamily: 'monospace',
    },

    // --- Figure block ---
    figureContainer: {
      backgroundColor: theme.background,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      alignItems: 'center',
      gap: 8,
    },
    figurePlaceholder: {
      fontSize: 32,
    },
    figureLabel: {
      fontSize: fontSize.body - 1,
      color: theme.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
    },
    figureOcrText: {
      fontSize: fontSize.body - 2,
      color: theme.text,
      textAlign: 'center',
      marginTop: 4,
    },

    // --- Formula block ---
    formulaContainer: {
      backgroundColor: theme.background,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 8,
    },
    formulaContent: {
      fontSize: fontSize.body - 1,
      color: theme.text,
      fontFamily: 'monospace',
    },

    // --- Audio controls ---
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

    // --- States ---
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

  // ---------------------------------------------------------------------------
  // Load document
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!visible || !documentId) return;

    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);

        const result: DocumentWithContent | null =
          await getDocumentWithContent(documentId);

        if (!result) {
          setError('Document not found');
          return;
        }

        setDocument(result.document);
        setBlocks(result.blocks);
        setSections(result.sections);
        setBlockTables(result.blockTables);
        setCurrentBlockIndex(-1);
      } catch (err) {
        console.error('Error loading document:', err);
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [visible, documentId, getDocumentWithContent]);

  // ---------------------------------------------------------------------------
  // Navigation and playback
  // ---------------------------------------------------------------------------

  const handleReadBlock = useCallback(
    (blockIndex: number) => {
      if (blockIndex < 0 || blockIndex >= blocks.length) return;
      setCurrentBlockIndex(blockIndex);
      const block = blocks[blockIndex];
      audioPlayback.synthesizeAndPlay(resolveTtsText(block), voiceName);
    },
    [blocks, audioPlayback, voiceName]
  );

  const handleScrollToBlock = useCallback((blockIndex: number) => {
    setCurrentBlockIndex(blockIndex);
    flatListRef.current?.scrollToIndex({
      index: blockIndex,
      animated: true,
      viewPosition: 0.3,
    });
  }, []);

  const handleSectionSelect = useCallback(
    (blockIndex: number) => {
      handleScrollToBlock(blockIndex);
      setShowSectionsMenu(false);
    },
    [handleScrollToBlock]
  );

  // ---------------------------------------------------------------------------
  // Block renderers
  // ---------------------------------------------------------------------------

  const renderTable = (block: ContentBlockRecord) => {
    const tableRecord = blockTables.get(block.id);

    // If structured data is not available fall back to the markdown string
    if (!tableRecord) {
      return (
        <View style={styles.tableFallback}>
          <Text style={styles.tableFallbackText}>{block.text}</Text>
        </View>
      );
    }

    const headers: string[] | null = tableRecord.headers_json
      ? JSON.parse(tableRecord.headers_json)
      : null;
    const rows: string[][] = JSON.parse(tableRecord.rows_json);
    const colCount = Math.max(
      headers?.length ?? 0,
      ...rows.map((r) => r.length)
    );

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header row */}
          {headers && (
            <View style={styles.tableHeaderRow}>
              {Array.from({ length: colCount }).map((_, ci) => (
                <View key={ci} style={styles.tableHeaderCell}>
                  <Text style={styles.tableHeaderCellText}>
                    {headers[ci] ?? ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {/* Data rows */}
          {rows.map((row, ri) => (
            <View
              key={ri}
              style={[styles.tableRow, ri % 2 === 1 && styles.tableRowAlt]}
            >
              {Array.from({ length: colCount }).map((_, ci) => (
                <View
                  key={ci}
                  style={[
                    styles.tableCell,
                    ci === colCount - 1 && styles.tableCellLast,
                  ]}
                >
                  <Text style={styles.tableCellText}>{row[ci] ?? ''}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderBlockContent = (block: ContentBlockRecord) => {
    switch (block.block_type) {
      case 'heading':
        return <Text style={styles.headingContent}>{block.text}</Text>;

      case 'table':
        return (
          <View style={styles.tableWrapper}>
            <Text style={styles.tableLabel}>Table · page {block.page_number}</Text>
            {renderTable(block)}
          </View>
        );

      case 'figure':
        return (
          <View style={styles.figureContainer}>
            <Text style={styles.figurePlaceholder}>🖼</Text>
            <Text style={styles.figureLabel}>
              {block.ai_description ?? `Figure on page ${block.page_number}`}
            </Text>
            {block.ocr_text ? (
              <Text style={styles.figureOcrText}>{block.ocr_text}</Text>
            ) : null}
          </View>
        );

      case 'formula':
        return (
          <View style={styles.formulaContainer}>
            <Text style={styles.formulaContent}>{block.text}</Text>
          </View>
        );

      case 'text':
      default:
        return <Text style={styles.textContent}>{block.text}</Text>;
    }
  };

  const renderBlock = ({
    item,
    index,
  }: {
    item: ContentBlockRecord;
    index: number;
  }) => {
    const isActive = index === currentBlockIndex;

    return (
      <Pressable
        onPress={() => handleReadBlock(index)}
        style={[styles.blockItem, isActive && styles.blockItemActive]}
      >
        <Text style={styles.blockMeta}>
          {item.block_type.charAt(0).toUpperCase() + item.block_type.slice(1)}{' '}
          · {index + 1} of {blocks.length}
        </Text>
        {renderBlockContent(item)}
        <Text style={styles.pageIndicator}>Page {item.page_number}</Text>
      </Pressable>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!visible || !document) return null;

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

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => setError(null)} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : blocks.length > 0 ? (
          <>
            <SectionsMenu
              sections={sections}
              blocks={blocks}
              currentBlockIndex={currentBlockIndex}
              visible={showSectionsMenu}
              onClose={() => setShowSectionsMenu(false)}
              onSectionSelect={handleSectionSelect}
              onBlockSelect={handleScrollToBlock}
            />

            <View style={styles.contentContainer}>
              <FlatList
                ref={flatListRef}
                data={blocks}
                keyExtractor={(item) => item.id}
                renderItem={renderBlock}
                scrollEnabled
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
                  {formatTime(audioPlayback.currentTime * 1000)} /{' '}
                  {formatTime(audioPlayback.duration * 1000)}
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