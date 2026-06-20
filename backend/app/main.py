from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.chat import router as chat_router
from app.api.routes.documents import router as documents_router
from app.api.routes.health import router as health_router
from app.api.routes.search import router as search_router
from app.api.routes.uploads import router as uploads_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db import Base, engine
from app.utils.file_helpers import ensure_directories

settings = get_settings()
configure_logging()

app = FastAPI(title=settings.app_name, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(uploads_router)
app.include_router(documents_router)
app.include_router(chat_router)
app.include_router(search_router)


@app.on_event("startup")
def startup_event() -> None:
    ensure_directories()
    Base.metadata.create_all(bind=engine)
