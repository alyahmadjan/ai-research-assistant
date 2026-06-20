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


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    conversation = chat_repo.get_conversation(db, payload.conversation_id) if payload.conversation_id else None
    if conversation is None:
        conversation = chat_repo.create_conversation(db, title=_conversation_title(payload.question))

    hits = retrieval_service.search(db, payload.question, top_k=6, document_ids=payload.document_ids or None)
    context_blocks = retrieval_service.build_context(hits, max_chunks=5)
    generation = generation_service.generate(payload.question, context_blocks, mode="answer")
    citations = [citation_service.chunk_to_source(hit.chunk, hit.document, score=hit.score) for hit in hits[:5]]

    chat_repo.add_message(
        db,
        conversation_id=conversation.id,
        role="user",
        question=payload.question,
        document_ids_json=json.dumps(payload.document_ids),
    )
    chat_repo.add_message(
        db,
        conversation_id=conversation.id,
        role="assistant",
        answer=generation.answer,
        retrieved_chunks_json=json.dumps([c.model_dump() for c in citations]),
        document_ids_json=json.dumps(payload.document_ids),
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
    docs = [doc_repo.get(db, doc_id) for doc_id in payload.document_ids]
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
    return ChatResponse(conversation_id=conversation.id, answer=generation.answer, citations=citations, confidence=generation.confidence)


@router.post("/compare", response_model=ChatResponse)
def compare(payload: CompareRequest, db: Session = Depends(get_db)):
    docs = [doc_repo.get(db, doc_id) for doc_id in payload.document_ids]
    docs = [doc for doc in docs if doc is not None]
    if len(docs) < 2:
        raise HTTPException(status_code=400, detail="At least two documents are required for comparison")
    question = payload.question or "Compare the documents on their key themes, methods, findings, and differences."
    hits = []
    for doc in docs:
        hits.extend(retrieval_service.search(db, question, top_k=3, document_ids=[doc.id]))
    context_blocks = retrieval_service.build_context(hits, max_chunks=8)
    generation = generation_service.generate(question, context_blocks, mode="compare")
    citations = [citation_service.chunk_to_source(hit.chunk, hit.document, score=hit.score) for hit in hits[:8]]
    conversation = chat_repo.create_conversation(db, title="Comparison")
    return ChatResponse(conversation_id=conversation.id, answer=generation.answer, citations=citations, confidence=generation.confidence)


@router.post("/feedback", response_model=FeedbackResponse)
def feedback(payload: FeedbackRequest, db: Session = Depends(get_db)):
    convo = chat_repo.get_conversation(db, payload.conversation_id)
    if convo is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return FeedbackResponse(ok=True, detail="Feedback received")
