from __future__ import annotations

import json

from app.models.chunk import Chunk
from app.models.document import Document
from app.models.schemas import ChatSource


class CitationService:
    def chunk_to_source(self, chunk: Chunk, document: Document, score: float | None = None) -> ChatSource:
        preview = chunk.text[:280].replace("\n", " ")
        return ChatSource(
            document_id=document.id,
            document_filename=document.filename,
            page=chunk.page_number,
            chunk_id=chunk.id,
            text_preview=preview,
            score=score,
        )

    def serialize_sources(self, sources: list[ChatSource]) -> str:
        return json.dumps([source.model_dump() for source in sources])

    def deserialize_sources(self, raw: str) -> list[ChatSource]:
        try:
            items = json.loads(raw or "[]")
        except json.JSONDecodeError:
            items = []
        return [ChatSource(**item) for item in items]
