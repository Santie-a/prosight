import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { PDFUploadScreen } from '@/components/PDFUploadScreen';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { DocumentsList } from '@/components/DocumentsList';
import { ReaderView } from '@/components/ReaderView';

type DocumentView = 'list' | 'upload';

export default function DocumentsScreen() {
  const [currentView, setCurrentView] = useState<DocumentView>('list');
  const [refreshList, setRefreshList] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [readerVisible, setReaderVisible] = useState(false);

  const { theme, fontSize } = useAccessibility();

  const handleUploadSuccess = () => {
    // Refresh the list after successful upload
    setRefreshList(!refreshList);
    setCurrentView('list');
  };

  const handleShowUpload = () => {
    setCurrentView('upload');
  };

  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setReaderVisible(true);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
  })

  return (
    <View style={styles.container}>
      {currentView === 'list' ? (
        <DocumentsList
          key={refreshList.toString()} // Force re-render on refresh
          onDocumentSelect={handleDocumentSelect}
          onUploadNew={handleShowUpload}
        />
      ) : (
        <PDFUploadScreen onUploadSuccess={handleUploadSuccess} />
      )}

      {/* Semantic Reader Modal */}
      {selectedDocumentId && (
        <ReaderView
          documentId={selectedDocumentId}
          visible={readerVisible}
          onClose={() => {
            setReaderVisible(false);
            setSelectedDocumentId(null);
          }}
        />
      )}
    </View>
  );
}
