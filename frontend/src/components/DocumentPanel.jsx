import { useRef, useState } from 'react'
import { Upload, FileText, Trash2, CheckSquare, Square, Loader2, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import { uploadDocument, deleteDocument } from '../api'

export default function DocumentPanel({ documents, selectedIds, onSelectionChange, onDocumentsChange }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = async (files) => {
    const file = files[0]
    if (!file) return
    setError(null)
    setUploading(true)
    setUploadProgress(0)
    try {
      const result = await uploadDocument(file, setUploadProgress)
      if (result.duplicate) {
        setError('This document is already in your library.')
      }
      onDocumentsChange()
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleDelete = async (docId, e) => {
    e.stopPropagation()
    try {
      await deleteDocument(docId)
      onSelectionChange(selectedIds.filter((id) => id !== docId))
      onDocumentsChange()
    } catch {
      setError('Failed to delete document.')
    }
  }

  const toggleSelect = (docId) => {
    if (selectedIds.includes(docId)) {
      onSelectionChange(selectedIds.filter((id) => id !== docId))
    } else {
      onSelectionChange([...selectedIds, docId])
    }
  }

  const selectAll = () => {
    if (selectedIds.length === documents.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(documents.map((d) => d.doc_id))
    }
  }

  return (
    <aside className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800 tracking-wide uppercase">Documents</h2>
        <p className="text-xs text-gray-400 mt-0.5">Upload PDFs, TXT, or Markdown</p>
      </div>

      {/* Upload zone */}
      <div className="px-4 pt-4">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !uploading && inputRef.current?.click()}
          className={clsx(
            'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors',
            dragOver ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-400 hover:bg-gray-50',
            uploading && 'pointer-events-none opacity-60'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {uploading ? (
            <div className="space-y-2">
              <Loader2 className="w-6 h-6 text-brand-500 animate-spin mx-auto" />
              <p className="text-xs text-gray-500">Uploading… {uploadProgress}%</p>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-brand-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Upload className="w-6 h-6 text-gray-300 mx-auto" />
              <p className="text-xs font-medium text-gray-600">Drop file or click to upload</p>
              <p className="text-xs text-gray-400">Max 20 MB</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-1">
        {documents.length === 0 ? (
          <p className="text-xs text-gray-400 text-center mt-8">No documents yet. Upload one above.</p>
        ) : (
          <>
            <button
              onClick={selectAll}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-brand-600 mb-2 transition-colors"
            >
              {selectedIds.length === documents.length ? (
                <CheckSquare className="w-3.5 h-3.5 text-brand-500" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              {selectedIds.length === documents.length ? 'Deselect all' : 'Select all'}
            </button>

            {documents.map((doc) => {
              const selected = selectedIds.includes(doc.doc_id)
              return (
                <div
                  key={doc.doc_id}
                  onClick={() => toggleSelect(doc.doc_id)}
                  className={clsx(
                    'flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors group',
                    selected ? 'bg-brand-50 border border-brand-200' : 'hover:bg-gray-50 border border-transparent'
                  )}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {selected ? (
                      <CheckSquare className="w-4 h-4 text-brand-500" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
                    )}
                  </div>
                  <FileText className={clsx('w-4 h-4 mt-0.5 flex-shrink-0', selected ? 'text-brand-500' : 'text-gray-300')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{doc.filename}</p>
                    <p className="text-xs text-gray-400">{doc.pages} page{doc.pages !== 1 ? 's' : ''}</p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(doc.doc_id, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-300 hover:text-red-500 transition-all"
                    title="Remove document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 bg-brand-50">
          <p className="text-xs text-brand-700 font-medium">
            {selectedIds.length} document{selectedIds.length !== 1 ? 's' : ''} selected for search
          </p>
        </div>
      )}
    </aside>
  )
}
