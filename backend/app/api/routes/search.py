from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.schemas import SearchRequest, SearchResponse
from app.services.retrieval_service import RetrievalService

router = APIRouter(tags=["search"])
retrieval_service = RetrievalService()


@router.post("/search", response_model=SearchResponse)
def search(payload: SearchRequest, db: Session = Depends(get_db)):
    hits = retrieval_service.search(db, payload.query, top_k=payload.top_k, document_ids=payload.document_ids or None)
    results = [
        retrieval_service.citation_service.chunk_to_source(hit.chunk, hit.document, score=hit.score)
        for hit in hits
    ]
    return SearchResponse(query=payload.query, results=results)
