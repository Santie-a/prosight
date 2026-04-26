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
import { ContentBlockRecord, SectionRecord } from '@/constants/database-schema';

interface SectionsMenuProps {
  sections: SectionRecord[];
  blocks: ContentBlockRecord[];
  currentBlockIndex: number;
  visible: boolean;
  onClose: () => void;
  // Called with the flat list index of the first block in the section
  onSectionSelect: (blockIndex: number) => void;
  // Called with the flat list index of a specific block
  onBlockSelect: (blockIndex: number) => void;
}

export const SectionsMenu: React.FC<SectionsMenuProps> = ({
  sections,
  blocks,
  currentBlockIndex,
  visible,
  onClose,
  onSectionSelect,
  onBlockSelect,
}) => {
  const { theme, fontSize } = useAccessibility();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
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
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionItemActive: {
      backgroundColor: `${theme.primary}15`,
    },
    sectionContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
    },
    expandButton: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    expandIcon: {
      fontSize: fontSize.body - 1,
      color: theme.textSecondary,
      minWidth: 20,
      textAlign: 'center',
    },
    sectionTitle: {
      flex: 1,
      fontSize: fontSize.body - 1,
      color: theme.text,
      fontWeight: '500',
    },
    blockItem: {
      paddingVertical: 6,
      paddingLeft: 40,
      paddingRight: 12,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    blockItemActive: {
      backgroundColor: `${theme.primary}10`,
    },
    blockPreviewText: {
      fontSize: fontSize.body - 2,
      color: theme.text,
    },
    blockPageText: {
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
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background,
      paddingHorizontal: 16,
    },
  });

  // ---------------------------------------------------------------------------
  // Derive a block index lookup from start_block_id so we avoid O(n) finds
  // inside render loops.
  // ---------------------------------------------------------------------------
  const blockIndexById = useMemo(() => {
    const map = new Map<string, number>();
    blocks.forEach((block, idx) => map.set(block.id, idx));
    return map;
  }, [blocks]);

  /**
   * Return all blocks that belong to a section, in reading order.
   * A section owns blocks from its start_block_id up to (not including)
   * the next section's start_block_id.
   */
  const getBlocksForSection = (sectionIndex: number): ContentBlockRecord[] => {
    const section = sections[sectionIndex];
    if (!section) return [];

    const startIdx = blockIndexById.get(section.start_block_id);
    if (startIdx === undefined) return [];

    const nextSection = sections[sectionIndex + 1];
    const endIdx = nextSection
      ? (blockIndexById.get(nextSection.start_block_id) ?? blocks.length)
      : blocks.length;

    return blocks.slice(startIdx, endIdx);
  };

  const toggleSection = (id: string) => {
    const next = new Set(expandedSections);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedSections(next);
  };

  // ---------------------------------------------------------------------------
  // Active section detection
  // Uses block_index rather than a flat array position so it is stable even
  // if the sections are filtered.
  // ---------------------------------------------------------------------------
  const isActiveSection = (sectionIndex: number): boolean => {
    const section = sections[sectionIndex];
    if (!section) return false;

    const startIdx = blockIndexById.get(section.start_block_id);
    if (startIdx === undefined) return false;
    if (currentBlockIndex < startIdx) return false;

    const nextSection = sections[sectionIndex + 1];
    if (!nextSection) return true;

    const nextStartIdx = blockIndexById.get(nextSection.start_block_id);
    return nextStartIdx === undefined || currentBlockIndex < nextStartIdx;
  };

  // ---------------------------------------------------------------------------
  // Search filter - with original section indices
  // ---------------------------------------------------------------------------
  const filteredSectionsWithIndex = useMemo(() => {
    const mapped = sections.map((section, idx) => ({ section, originalIndex: idx }));
    if (!searchQuery.trim()) return mapped;
    const query = searchQuery.toLowerCase();
    return mapped.filter(({ section, originalIndex }) => {
      if (section.title.toLowerCase().includes(query)) return true;
      return getBlocksForSection(originalIndex).some(
        (block) => block.text?.toLowerCase().includes(query)
      );
    });
  }, [sections, blocks, searchQuery]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const blockPreview = (block: ContentBlockRecord): string => {
    const raw = block.text ?? block.ocr_text ?? block.ai_description ?? '';
    return raw.length > 60 ? raw.substring(0, 60) + '...' : raw;
  };

  const renderSectionItem = (section: SectionRecord, sectionIndex: number) => {
    const isExpanded = expandedSections.has(section.id);
    const sectionBlocks = getBlocksForSection(sectionIndex);
    const isActive = isActiveSection(sectionIndex);
    const startIdx = blockIndexById.get(section.start_block_id);

    return (
      <View key={section.id}>
        <View
          style={[styles.sectionItem, isActive && styles.sectionItemActive]}
        >
          <Pressable
            onPress={() => {
              if (startIdx !== undefined) {
                onSectionSelect(startIdx);
              }
            }}
            style={[
              styles.sectionContent,
              { paddingLeft: Math.max(0, (section.level - 1) * 12) },
            ]}
          >
            <Text style={styles.sectionTitle} numberOfLines={2}>
              {section.title}
            </Text>
          </Pressable>
          {sectionBlocks.length > 0 && (
            <Pressable
              onPress={() => toggleSection(section.id)}
              style={styles.expandButton}
            >
              <Text style={styles.expandIcon}>
                {isExpanded ? '▼' : '▶'}
              </Text>
            </Pressable>
          )}
        </View>

        {isExpanded &&
          sectionBlocks.map((block) => {
            const blockIdx = blockIndexById.get(block.id);
            if (blockIdx === undefined) return null;
            const isBlockActive = currentBlockIndex === blockIdx;

            return (
              <Pressable
                key={block.id}
                onPress={() => onBlockSelect(blockIdx)}
                style={[
                  styles.blockItem,
                  isBlockActive && styles.blockItemActive,
                ]}
              >
                <Text style={styles.blockPreviewText} numberOfLines={1}>
                  {blockPreview(block)}
                </Text>
                <Text style={styles.blockPageText}>
                  p. {block.page_number}
                </Text>
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
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalContainer} onPress={onClose}>
        <Pressable
          style={styles.drawer}
          onPress={(e) => e.stopPropagation()}
        >
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

          <View style={styles.header}>
            {filteredSectionsWithIndex.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={{ color: theme.textSecondary, fontSize: fontSize.body }}>
                  {sections.length === 0
                    ? `No sections available (sections: ${sections.length})`
                    : 'No sections found'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredSectionsWithIndex}
                keyExtractor={(item) => item.section.id}
                renderItem={({ item }) =>
                  renderSectionItem(item.section, item.originalIndex)
                }
                scrollEnabled={true}
              />
            )}
          </View>

          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};