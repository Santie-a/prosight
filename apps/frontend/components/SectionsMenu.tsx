import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Text } from '@/components/ui/Text';
import { ChunkRecord, SectionRecord } from '@/constants/database-schema';

interface SectionsMenuProps {
  sections: SectionRecord[];
  chunks: ChunkRecord[];
  currentChunkIndex: number;
  visible: boolean;
  onClose: () => void;
  onSectionSelect: (startChunkIndex: number) => void;
  onChunkSelect: (chunkIndex: number) => void;
}

export const SectionsMenu: React.FC<SectionsMenuProps> = ({
  sections,
  chunks,
  currentChunkIndex,
  visible,
  onClose,
  onSectionSelect,
  onChunkSelect,
}) => {
  const { theme, fontSize } = useAccessibility();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set()
  );

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    drawer: {
      backgroundColor: theme.surface,
      maxHeight: '90%',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      flexDirection: 'column',
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    headerTitle: {
      fontSize: fontSize.body,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    searchInput: {
      backgroundColor: theme.background,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: fontSize.body - 2,
      color: theme.text,
    },
    listContainer: {
      flex: 1,
    },
    sectionItem: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    sectionItemActive: {
      backgroundColor: `${theme.primary}15`,
    },
    sectionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    expandIcon: {
      fontSize: fontSize.body - 1,
      color: theme.textSecondary,
      minWidth: 20,
    },
    sectionTitle: {
      flex: 1,
      fontSize: fontSize.body - 1,
      color: theme.text,
      fontWeight: '500',
    },
    chunkItem: {
      paddingVertical: 6,
      paddingLeft: 40,
      paddingRight: 12,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    chunkItemActive: {
      backgroundColor: `${theme.primary}10`,
    },
    chunkText: {
      fontSize: fontSize.body - 2,
      color: theme.text,
    },
    chunkPreview: {
      fontSize: fontSize.body - 3,
      color: theme.textSecondary,
      marginTop: 2,
    },
    closeButton: {
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingVertical: 8,
      marginTop: 8,
      marginBottom: 12,
      borderRadius: 6,
      backgroundColor: theme.primary,
    },
    closeButtonText: {
      color: '#FFFFFF',
      fontSize: fontSize.button - 2,
      fontWeight: '600',
    },
  });

  const toggleSection = (id: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSections(newExpanded);
  };

  // Calculate which chunks belong to each section
  const getChunksForSection = (sectionIndex: number): ChunkRecord[] => {
    const section = sections[sectionIndex];
    if (!section) return [];

    const nextSection = sections[sectionIndex + 1];
    const endIndex = nextSection
      ? nextSection.start_chunk_index
      : chunks.length;

    return chunks.slice(section.start_chunk_index, endIndex);
  };

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;

    const query = searchQuery.toLowerCase();
    return sections.filter((section, idx) => {
      const sectionChunks = getChunksForSection(idx);
      return (
        section.title.toLowerCase().includes(query) ||
        sectionChunks.some((chunk) => chunk.text.toLowerCase().includes(query))
      );
    });
  }, [sections, chunks, searchQuery]);

  const renderSectionItem = (section: SectionRecord, sectionIndex: number) => {
    const isExpanded = expandedSections.has(section.id);
    const sectionChunks = getChunksForSection(sectionIndex);
    const isCurrentSection = currentChunkIndex >= section.start_chunk_index;
    const nextSection = sections[sectionIndex + 1];
    const isLastChunkInSection =
      !nextSection || currentChunkIndex < nextSection.start_chunk_index;
    const isActive = isCurrentSection && isLastChunkInSection;

    return (
      <View key={section.id}>
        {/* Section Header */}
        <Pressable
          onPress={() => {
            toggleSection(section.id);
            onSectionSelect(section.start_chunk_index);
          }}
          style={[styles.sectionItem, isActive && styles.sectionItemActive]}
        >
          <View
            style={[
              styles.sectionContent,
              {
                paddingLeft: Math.max(0, (section.level - 1) * 12),
              },
            ]}
          >
            <Text style={styles.expandIcon}>
              {sectionChunks.length > 0 ? (isExpanded ? '▼' : '▶') : '•'}
            </Text>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {section.title}
            </Text>
          </View>
        </Pressable>

        {/* Chunks for this section */}
        {isExpanded &&
          sectionChunks.map((chunk, idx) => {
            const chunkIndex = section.start_chunk_index + idx;
            const isChunkActive = currentChunkIndex === chunkIndex;
            const preview =
              chunk.text.length > 60
                ? chunk.text.substring(0, 60) + '...'
                : chunk.text;

            return (
              <Pressable
                key={chunk.id}
                onPress={() => onChunkSelect(chunkIndex)}
                style={[
                  styles.chunkItem,
                  isChunkActive && styles.chunkItemActive,
                ]}
              >
                <Text style={styles.chunkText} numberOfLines={1}>
                  {preview}
                </Text>
                <Text style={styles.chunkPreview}>p. {chunk.page_number}</Text>
              </Pressable>
            );
          })}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalContainer} onPress={onClose}>
        <Pressable
          style={styles.drawer}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Contents</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search sections..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Sections List */}
          <View style={styles.listContainer}>
            {filteredSections.length > 0 ? (
              <FlatList
                data={filteredSections}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item, index }) =>
                  renderSectionItem(item, index)
                }
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: theme.textSecondary }}>
                  No sections found
                </Text>
              </View>
            )}
          </View>

          {/* Close Button */}
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
