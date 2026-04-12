import React, { useState } from 'react';
import { View } from 'react-native';
import { PDFUploadScreen } from '@/components/PDFUploadScreen';
import { DocumentsList } from '@/components/DocumentsList';
import { ReaderView } from '@/components/ReaderView';

type DocumentView = 'list' | 'upload';

export default function DocumentsScreen() {
  const [currentView, setCurrentView] = useState<DocumentView>('list');
  const [refreshList, setRefreshList] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [readerVisible, setReaderVisible] = useState(false);

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

  return (
    <View style={{ flex: 1 }}>
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
