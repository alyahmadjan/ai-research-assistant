import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000,
})

export async function uploadDocument(file, onProgress) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
  return data
}

export async function fetchDocuments() {
  const { data } = await api.get('/documents')
  return data.documents
}

export async function deleteDocument(docId) {
  const { data } = await api.delete(`/documents/${docId}`)
  return data
}

export async function queryDocuments(question, docIds = null) {
  const { data } = await api.post('/query', {
    question,
    doc_ids: docIds && docIds.length > 0 ? docIds : null,
  })
  return data
}
