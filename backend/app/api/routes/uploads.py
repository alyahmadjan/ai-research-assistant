from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import get_settings
from app.core.security import validate_file_extension
from app.models.schemas import UploadResponse
from app.repositories.document_repo import DocumentRepository
from app.services.indexing_service import IndexingService
from app.utils.file_helpers import ensure_directories, safe_storage_name, save_upload_file

router = APIRouter(tags=["uploads"])
settings = get_settings()
doc_repo = DocumentRepository()
indexing_service = IndexingService()


@router.post("/upload", response_model=list[UploadResponse])
async def upload_documents(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    ensure_directories()
    responses = []

    for upload in files:
        validate_file_extension(upload.filename or "")
        contents = await upload.read()
        if len(contents) > settings.max_upload_bytes:
            raise HTTPException(status_code=413, detail=f"File too large. Max size is {settings.max_upload_mb} MB")
        await upload.seek(0)

        stored_name = safe_storage_name(upload.filename or "document")
        destination = settings.upload_path / stored_name
        await save_upload_file(upload, destination)

        doc = doc_repo.create(
            db,
            filename=upload.filename or stored_name,
            file_type=Path(upload.filename or stored_name).suffix.lower().lstrip("."),
            original_path=str(destination),
            status="queued",
        )
        background_tasks.add_task(indexing_service.process_file_background, doc.id, str(destination))
        responses.append(
            UploadResponse(
                document_id=doc.id,
                filename=doc.filename,
                status=doc.status,
                pages=doc.pages,
                chunks_created=doc.chunks_created,
            )
        )

    return responses
