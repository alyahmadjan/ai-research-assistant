from pathlib import Path
import uuid

from fastapi import UploadFile

from app.core.config import get_settings

settings = get_settings()


def ensure_directories() -> None:
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    settings.chroma_path.mkdir(parents=True, exist_ok=True)
    Path("data").mkdir(exist_ok=True)


def safe_storage_name(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    return f"{uuid.uuid4().hex}{suffix}"


async def save_upload_file(upload_file: UploadFile, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    contents = await upload_file.read()
    destination.write_bytes(contents)
