from pathlib import Path

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.chunk import Chunk
from app.models.document import Document
from app.repositories.chunk_repo import ChunkRepository
from app.repositories.document_repo import DocumentRepository
from app.services.chunking_service import ChunkingService
from app.services.extraction_service import ExtractionService
from app.services.retrieval_service import RetrievalService


class IndexingService:
    def __init__(self):
        self.document_repo = DocumentRepository()
        self.chunk_repo = ChunkRepository()
        self.extraction_service = ExtractionService()
        self.chunking_service = ChunkingService()
        self.retrieval_service = RetrievalService()

    def _process_with_session(self, db: Session, document: Document, path: Path) -> Document:
        extracted = self.extraction_service.extract(path)
        self.document_repo.update_status(
            db,
            document=document,
            status="extracting",
            pages=extracted.pages,
            extracted_text=extracted.text,
        )
        chunk_payloads = self.chunking_service.chunk_text(extracted.text)

        chunk_models = [
            Chunk(
                document_id=document.id,
                chunk_index=payload.chunk_index,
                page_number=payload.page_number,
                text=payload.text,
                metadata_json=payload.metadata_json,
            )
            for payload in chunk_payloads
        ]
        self.chunk_repo.add_many(db, chunk_models)
        self.retrieval_service.index_document_chunks(db, document, chunk_models)
        self.document_repo.update_status(
            db,
            document=document,
            status="processed",
            chunks_created=len(chunk_models),
        )
        return document

    async def process_file(self, db: Session, document: Document, path: Path) -> Document:
        return self._process_with_session(db, document, path)

    def process_file_background(self, document_id: str, path: str) -> None:
        db = SessionLocal()
        try:
            document = self.document_repo.get(db, document_id)
            if document is None:
                return
            self._process_with_session(db, document, Path(path))
        finally:
            db.close()
