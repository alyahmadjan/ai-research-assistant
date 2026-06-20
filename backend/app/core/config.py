from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="AI Research Assistant", alias="APP_NAME")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    database_url: str = Field(default="sqlite:///./data/app.db", alias="DATABASE_URL")
    chroma_dir: str = Field(default="./data/chroma", alias="CHROMA_DIR")
    upload_dir: str = Field(default="./data/uploads", alias="UPLOAD_DIR")

    # Free deployment change:
    # Keep a local model as the default so the app runs without any paid LLM key.
    local_llm_model: str = Field(default="google/flan-t5-small", alias="LOCAL_LLM_MODEL")

    # Skipped from the free path:
    # The original codebase supported OpenAI configuration here, but the no-key
    # deployment path does not need those fields.
    max_upload_mb: int = Field(default=25, alias="MAX_UPLOAD_MB")
    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")

    @property
    def allowed_cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return int(self.max_upload_mb * 1024 * 1024)

    @property
    def chroma_path(self) -> Path:
        return Path(self.chroma_dir)

    @property
    def upload_path(self) -> Path:
        return Path(self.upload_dir)


@lru_cache
def get_settings() -> Settings:
    return Settings()
