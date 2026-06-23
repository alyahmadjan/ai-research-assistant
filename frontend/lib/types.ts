export type DocumentItem = {
  id: string;
  filename: string;
  file_type: string;
  status: string;
  pages: number;
  chunks_created: number;
  created_at: string;
  updated_at: string;
};

export type UploadResponse = {
  document_id: string;
  filename: string;
  status: string;
  pages: number;
  chunks_created: number;
};

export type SourceItem = {
  document_id: string;
  document_filename: string;
  page?: number | null;
  chunk_id: string;
  text_preview: string;
  score?: number | null;
};

export type ChatResponse = {
  conversation_id: string;
  answer: string;
  citations: SourceItem[];
  confidence: "low" | "medium" | "high";
};

export type ConversationMessage = {
  role: string;
  question?: string | null;
  answer?: string | null;
  citations: SourceItem[];
  confidence?: string | null;
  created_at: string;
};

export type Conversation = {
  conversation_id: string;
  title: string;
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
};
