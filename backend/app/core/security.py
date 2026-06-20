from fastapi import HTTPException, status
from pathlib import Path

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".docx", ".html", ".htm"}


def validate_file_extension(filename: str) -> None:
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {suffix}. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )
