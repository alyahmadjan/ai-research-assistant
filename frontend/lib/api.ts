import { ChatResponse, Conversation, DocumentItem, SourceItem } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function listDocuments(): Promise<DocumentItem[]> {
  return request<DocumentItem[]>("/documents");
}

export async function uploadDocuments(files: File[]): Promise<{ document_id: string; filename: string; status: string; pages: number; chunks_created: number }[]> {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Upload failed: ${response.status}`);
  }

  return response.json();
}

export async function askQuestion(payload: {
  conversation_id?: string;
  question: string;
  document_ids: string[];
}): Promise<ChatResponse> {
  return request<ChatResponse>("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getConversation(conversationId: string): Promise<Conversation> {
  return request<Conversation>(`/chat/${conversationId}`);
}

export async function searchDocs(query: string, documentIds: string[] = []): Promise<SourceItem[]> {
  const res = await request<{ query: string; results: SourceItem[] }>("/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, document_ids: documentIds, top_k: 5 }),
  });
  return res.results;
}

export async function summarize(documentIds: string[], focus?: string): Promise<ChatResponse> {
  return request<ChatResponse>("/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_ids: documentIds, focus }),
  });
}

export async function compare(documentIds: string[], question?: string): Promise<ChatResponse> {
  return request<ChatResponse>("/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_ids: documentIds, question }),
  });
}

export async function deleteDocument(documentId: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/documents/${documentId}`, { method: "DELETE" });
}

export async function getDocumentChunks(documentId: string): Promise<any[]> {
  return request<any[]>(`/documents/${documentId}/chunks`);
}
