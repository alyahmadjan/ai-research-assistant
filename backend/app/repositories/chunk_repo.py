from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.chunk import Chunk


class ChunkRepository:
    def add_many(self, db: Session, chunks: list[Chunk]) -> None:
        db.add_all(chunks)
        db.commit()

    def list_for_document(self, db: Session, document_id: str) -> list[Chunk]:
        stmt = select(Chunk).where(Chunk.document_id == document_id).order_by(Chunk.chunk_index.asc())
        return list(db.scalars(stmt).all())

    def delete_for_document(self, db: Session, document_id: str) -> int:
        stmt = delete(Chunk).where(Chunk.document_id == document_id)
        result = db.execute(stmt)
        db.commit()
        return result.rowcount or 0

    def list_by_ids(self, db: Session, chunk_ids: list[str]) -> list[Chunk]:
        if not chunk_ids:
            return []
        stmt = select(Chunk).where(Chunk.id.in_(chunk_ids))
        return list(db.scalars(stmt).all())
