from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import Document


class DocumentRepository:
    def create(self, db: Session, **kwargs) -> Document:
        doc = Document(**kwargs)
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc

    def get(self, db: Session, document_id: str) -> Document | None:
        return db.get(Document, document_id)

    def list(self, db: Session, offset: int = 0, limit: int = 50) -> list[Document]:
        stmt = select(Document).order_by(Document.created_at.desc()).offset(offset).limit(limit)
        return list(db.scalars(stmt).all())

    def delete(self, db: Session, document: Document) -> None:
        db.delete(document)
        db.commit()

    def update_status(self, db: Session, document: Document, status: str, pages: int | None = None, chunks_created: int | None = None, extracted_text: str | None = None) -> Document:
        document.status = status
        if pages is not None:
            document.pages = pages
        if chunks_created is not None:
            document.chunks_created = chunks_created
        if extracted_text is not None:
            document.extracted_text = extracted_text
        db.commit()
        db.refresh(document)
        return document
