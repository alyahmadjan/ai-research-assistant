import { useState, useEffect, useCallback } from 'react'
import { FlaskConical } from 'lucide-react'
import DocumentPanel from './components/DocumentPanel'
import ChatPanel from './components/ChatPanel'
import SourcesPanel from './components/SourcesPanel'
import { fetchDocuments } from './api'

export default function App() {
  const [documents, setDocuments] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [sources, setSources] = useState([])

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await fetchDocuments()
      setDocuments(docs)
    } catch {
      // backend may not be running yet
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top nav */}
      <header className="flex-shrink-0 h-12 bg-white border-b border-gray-200 flex items-center px-5 gap-3 z-10">
        <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
          <FlaskConical className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-800">AI Research Assistant</span>
        <span className="ml-auto text-xs text-gray-400">
          {documents.length} document{documents.length !== 1 ? 's' : ''} in library
        </span>
      </header>

      {/* Main 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        <DocumentPanel
          documents={documents}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onDocumentsChange={loadDocuments}
        />

        <ChatPanel
          selectedDocIds={selectedIds}
          hasDocuments={documents.length > 0}
          onSourcesChange={setSources}
        />

        <SourcesPanel sources={sources} />
      </div>
    </div>
  )
}
