from __future__ import annotations

from dataclasses import dataclass

import chromadb
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.chunk import Chunk
from app.models.document import Document
from app.repositories.chunk_repo import ChunkRepository
from app.services.embedding_service import EmbeddingService
from app.services.citation_service import CitationService


@dataclass
class RetrievalHit:
    chunk: Chunk
    document: Document
    score: float


class RetrievalService:
    def __init__(self):
        self.settings = get_settings()
        self.embedding_service = EmbeddingService()
        self.chunk_repo = ChunkRepository()
        self.citation_service = CitationService()
        self._client = chromadb.PersistentClient(path=str(self.settings.chroma_path))
        self._collection = self._client.get_or_create_collection(name="research_chunks", metadata={"hnsw:space": "cosine"})

    def index_document_chunks(self, db: Session, document: Document, chunks: list[Chunk]) -> None:
        if not chunks:
            return
        texts = [chunk.text for chunk in chunks]
        embeddings = self.embedding_service.embed_texts(texts)
        ids = [chunk.id for chunk in chunks]
        metadatas = [
            {
                "document_id": document.id,
                "document_filename": document.filename,
                "page_number": chunk.page_number if chunk.page_number is not None else -1,
                "chunk_index": chunk.chunk_index,
            }
            for chunk in chunks
        ]
        self._collection.upsert(ids=ids, embeddings=embeddings, metadatas=metadatas, documents=texts)
        for chunk in chunks:
            chunk.vector_id = chunk.id
        db.commit()

    def delete_document_vectors(self, document_id: str) -> None:
        try:
            results = self._collection.get(where={"document_id": document_id})
            ids = results.get("ids", [])
            if ids:
                self._collection.delete(ids=ids)
        except Exception:
            pass

    def search(self, db: Session, query: str, top_k: int = 5, document_ids: list[str] | None = None) -> list[RetrievalHit]:
        embedding = self.embedding_service.embed_query(query)
        where = {"document_id": {"$in": document_ids}} if document_ids else None
        results = self._collection.query(
            query_embeddings=[embedding],
            n_results=max(1, top_k),
            where=where,
            include=["documents", "metadatas", "distances"],
        )
        hits: list[RetrievalHit] = []
        ids = results.get("ids", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for chunk_id, distance in zip(ids, distances):
            chunk = db.get(Chunk, chunk_id)
            if not chunk:
                continue
            document = db.get(Document, chunk.document_id)
            if not document:
                continue
            score = 1.0 - float(distance or 0.0)
            hits.append(RetrievalHit(chunk=chunk, document=document, score=score))
        return hits

    def build_context(self, hits: list[RetrievalHit], max_chunks: int = 5) -> list[str]:
        context = []
        for hit in hits[:max_chunks]:
            context.append(
                f"[{hit.document.filename} | page {hit.chunk.page_number or 'n/a'} | chunk {hit.chunk.chunk_index}] {hit.chunk.text}"
            )
        return context
