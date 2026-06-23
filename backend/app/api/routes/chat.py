from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.schemas import ChatRequest, ChatResponse, CompareRequest, FeedbackRequest, FeedbackResponse, SummarizeRequest
from app.repositories.chat_repo import ChatRepository
from app.repositories.document_repo import DocumentRepository
from app.services.citation_service import CitationService
from app.services.generation_service import GenerationService
from app.services.retrieval_service import RetrievalService

router = APIRouter(tags=["chat"])
chat_repo = ChatRepository()
doc_repo = DocumentRepository()
retrieval_service = RetrievalService()
generation_service = GenerationService()
citation_service = CitationService()


def _conversation_title(question: str) -> str:
    return question[:60]


def _resolve_documents_for_single_doc_action(db: Session, document_ids: list[str], fallback_limit: int = 1) -> list[str]:
    # Added: when the UI does not pass document_ids, fall back to the most recent upload.
    # This prevents empty payloads from breaking summarize/chat and matches the expected UX.
    if document_ids:
        return document_ids
    recent_docs = doc_repo.list_recent(db, limit=fallback_limit)
    return [doc.id for doc in recent_docs]


def _resolve_documents_for_compare(db: Session, document_ids: list[str]) -> list[str]:
    # Added: comparison defaults to the two most recent uploads when nothing is selected.
    if document_ids:
        return document_ids
    recent_docs = doc_repo.list_recent(db, limit=2)
    return [doc.id for doc in recent_docs]


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    active_document_ids = _resolve_documents_for_single_doc_action(db, payload.document_ids, fallback_limit=1)
    if not active_document_ids:
        raise HTTPException(status_code=404, detail="Upload a document first or select one from the document list.")

    conversation = chat_repo.get_conversation(db, payload.conversation_id) if payload.conversation_id else None
    if conversation is None:
        conversation = chat_repo.create_conversation(db, title=_conversation_title(payload.question))

    hits = retrieval_service.search(db, payload.question, top_k=6, document_ids=active_document_ids)
    context_blocks = retrieval_service.build_context(hits, max_chunks=5)
    generation = generation_service.generate(payload.question, context_blocks, mode="answer")
    citations = [citation_service.chunk_to_source(hit.chunk, hit.document, score=hit.score) for hit in hits[:5]]

    chat_repo.add_message(
        db,
        conversation_id=conversation.id,
        role="user",
        question=payload.question,
        document_ids_json=json.dumps(active_document_ids),
    )
    chat_repo.add_message(
        db,
        conversation_id=conversation.id,
        role="assistant",
        answer=generation.answer,
        retrieved_chunks_json=json.dumps([c.model_dump() for c in citations]),
        document_ids_json=json.dumps(active_document_ids),
        confidence=generation.confidence,
    )

    return ChatResponse(
        conversation_id=conversation.id,
        answer=generation.answer,
        citations=citations,
        confidence=generation.confidence,
    )


@router.post("/summarize", response_model=ChatResponse)
def summarize(payload: SummarizeRequest, db: Session = Depends(get_db)):
    active_document_ids = _resolve_documents_for_single_doc_action(db, payload.document_ids, fallback_limit=1)
    if not active_document_ids:
        raise HTTPException(status_code=404, detail="Upload a document first or select one from the document list.")

    docs = [doc_repo.get(db, doc_id) for doc_id in active_document_ids]
    docs = [doc for doc in docs if doc is not None]
    if not docs:
        raise HTTPException(status_code=404, detail="No matching documents found")

    question = payload.focus or "Summarize the main points, findings, and conclusions."
    hits = []
    for doc in docs:
        hits.extend(retrieval_service.search(db, question, top_k=3, document_ids=[doc.id]))
    context_blocks = retrieval_service.build_context(hits, max_chunks=6)
    generation = generation_service.generate(question, context_blocks, mode="summarize")
    citations = [citation_service.chunk_to_source(hit.chunk, hit.document, score=hit.score) for hit in hits[:6]]
    conversation = chat_repo.create_conversation(db, title="Summary")

    chat_repo.add_message(
        db,
        conversation_id=conversation.id,
        role="user",
        question=question,
        document_ids_json=json.dumps(active_document_ids),
    )
    chat_repo.add_message(
        db,
        conversation_id=conversation.id,
        role="assistant",
        answer=generation.answer,
        retrieved_chunks_json=json.dumps([c.model_dump() for c in citations]),
        document_ids_json=json.dumps(active_document_ids),
        confidence=generation.confidence,
    )

    return ChatResponse(conversation_id=conversation.id, answer=generation.answer, citations=citations, confidence=generation.confidence)


@router.post("/compare", response_model=ChatResponse)
def compare(payload: CompareRequest, db: Session = Depends(get_db)):
    active_document_ids = _resolve_documents_for_compare(db, payload.document_ids)
    if len(active_document_ids) < 2:
        raise HTTPException(status_code=400, detail="Select at least two documents to compare.")

    docs = [doc_repo.get(db, doc_id) for doc_id in active_document_ids]
    docs = [doc for doc in docs if doc is not None]
    if len(docs) < 2:
        raise HTTPException(status_code=404, detail="Need at least two existing documents to compare")

    question = payload.question or "Compare the documents on their key themes, methods, findings, and differences."
    hits = []
    for doc in docs:
        hits.extend(retrieval_service.search(db, question, top_k=3, document_ids=[doc.id]))
    context_blocks = retrieval_service.build_context(hits, max_chunks=8)
    generation = generation_service.generate(question, context_blocks, mode="compare")
    citations = [citation_service.chunk_to_source(hit.chunk, hit.document, score=hit.score) for hit in hits[:8]]
    conversation = chat_repo.create_conversation(db, title="Comparison")

    chat_repo.add_message(
        db,
        conversation_id=conversation.id,
        role="user",
        question=question,
        document_ids_json=json.dumps(active_document_ids),
    )
    chat_repo.add_message(
        db,
        conversation_id=conversation.id,
        role="assistant",
        answer=generation.answer,
        retrieved_chunks_json=json.dumps([c.model_dump() for c in citations]),
        document_ids_json=json.dumps(active_document_ids),
        confidence=generation.confidence,
    )

    return ChatResponse(conversation_id=conversation.id, answer=generation.answer, citations=citations, confidence=generation.confidence)


@router.post("/feedback", response_model=FeedbackResponse)
def feedback(payload: FeedbackRequest, db: Session = Depends(get_db)):
    convo = chat_repo.get_conversation(db, payload.conversation_id)
    if convo is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return FeedbackResponse(ok=True, detail="Feedback received")
