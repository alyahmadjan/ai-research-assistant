from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class DocumentOut(BaseModel):
    id: str
    filename: str
    file_type: str
    status: str
    pages: int
    chunks_created: int
    project_id: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChunkOut(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    page_number: int | None = None
    text: str
    metadata_json: str
    vector_id: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    status: str
    pages: int
    chunks_created: int


class ChatSource(BaseModel):
    document_id: str
    document_filename: str
    page: int | None = None
    chunk_id: str
    text_preview: str
    score: float | None = None


class ChatRequest(BaseModel):
    conversation_id: str | None = None
    question: str = Field(min_length=2)
    document_ids: list[str] = Field(default_factory=list)


class ChatResponse(BaseModel):
    conversation_id: str
    answer: str
    citations: list[ChatSource]
    confidence: Literal["low", "medium", "high"] = "medium"


class SearchRequest(BaseModel):
    query: str = Field(min_length=2)
    document_ids: list[str] = Field(default_factory=list)
    top_k: int = 5


class SearchResponse(BaseModel):
    query: str
    results: list[ChatSource]


class CompareRequest(BaseModel):
    document_ids: list[str] = Field(default_factory=list)
    question: str | None = None


class SummarizeRequest(BaseModel):
    document_ids: list[str] = Field(default_factory=list)
    focus: str | None = None


class FeedbackRequest(BaseModel):
    conversation_id: str
    message_id: str
    rating: int = Field(ge=1, le=5)
    comment: str | None = None


class FeedbackResponse(BaseModel):
    ok: bool
    detail: str


class ConversationMessageOut(BaseModel):
    role: str
    question: str | None = None
    answer: str | None = None
    citations: list[ChatSource] = Field(default_factory=list)
    confidence: str | None = None
    created_at: datetime


class ConversationOut(BaseModel):
    conversation_id: str
    title: str
    messages: list[ConversationMessageOut] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
