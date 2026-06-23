from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.schemas import ChunkOut, ConversationMessageOut, ConversationOut, DocumentOut
from app.repositories.chunk_repo import ChunkRepository
from app.repositories.chat_repo import ChatRepository
from app.repositories.document_repo import DocumentRepository
from app.services.citation_service import CitationService
from app.services.retrieval_service import RetrievalService

router = APIRouter(tags=["documents"])
doc_repo = DocumentRepository()
chunk_repo = ChunkRepository()
chat_repo = ChatRepository()
citation_service = CitationService()
retrieval_service = RetrievalService()


@router.get("/documents", response_model=list[DocumentOut])
def list_documents(offset: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return doc_repo.list_documents(db, offset=offset, limit=limit)  # renamed to avoid shadowing built-in list


@router.get("/documents/{document_id}", response_model=DocumentOut)
def get_document(document_id: str, db: Session = Depends(get_db)):
    document = doc_repo.get(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.delete("/documents/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    document = doc_repo.get(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    retrieval_service.delete_document_vectors(document_id)
    chunk_repo.delete_for_document(db, document_id)
    path = Path(document.original_path)
    if path.exists():
        try:
            path.unlink()
        except OSError:
            pass
    doc_repo.delete(db, document)
    return {"ok": True}


@router.post("/documents/{document_id}/process")
async def process_document(document_id: str, db: Session = Depends(get_db)):
    document = doc_repo.get(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if not Path(document.original_path).exists():
        raise HTTPException(status_code=404, detail="File missing on disk")
    from app.services.indexing_service import IndexingService
    IndexingService().process_file_background(document.id, document.original_path)
    return {"ok": True, "status": "processed"}


@router.get("/documents/{document_id}/chunks", response_model=list[ChunkOut])
def get_document_chunks(document_id: str, db: Session = Depends(get_db)):
    document = doc_repo.get(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return chunk_repo.list_for_document(db, document_id)


@router.get("/chat/{conversation_id}", response_model=ConversationOut)
def get_conversation(conversation_id: str, db: Session = Depends(get_db)):
    convo = chat_repo.get_conversation(db, conversation_id)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = []
    for msg in chat_repo.list_messages(db, conversation_id):
        citations = citation_service.deserialize_sources(msg.retrieved_chunks_json)
        messages.append(
            ConversationMessageOut(
                role=msg.role,
                question=msg.question,
                answer=msg.answer,
                citations=citations,
                confidence=msg.confidence,
                created_at=msg.created_at,
            )
        )
    return ConversationOut(
        conversation_id=convo.id,
        title=convo.title,
        messages=messages,
        created_at=convo.created_at,
        updated_at=convo.updated_at,
    )
