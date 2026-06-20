from __future__ import annotations

import hashlib
from typing import Sequence

import numpy as np

# Free deployment change:
# The OpenAI embedding path is intentionally removed so the app can run locally
# and on free hosts without any API key.
try:
    from sentence_transformers import SentenceTransformer
except Exception:  # pragma: no cover
    SentenceTransformer = None

from app.core.config import get_settings


class EmbeddingService:
    def __init__(self):
        self.settings = get_settings()
        self._model = None

    def _local_model(self):
        if self._model is None and SentenceTransformer is not None:
            try:
                # Added: a compact local embedding model keeps retrieval offline.
                self._model = SentenceTransformer("all-MiniLM-L6-v2")
            except Exception:
                self._model = None
        return self._model

    def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        model = self._local_model()
        if model is not None:
            vectors = model.encode(list(texts), normalize_embeddings=True)
            return [vec.tolist() for vec in vectors]

        # Skipped: if the sentence-transformers model cannot load, the app still
        # works with a deterministic fallback embedding.
        return [self._fallback_embed(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        return self.embed_texts([text])[0]

    def _fallback_embed(self, text: str, dim: int = 384) -> list[float]:
        vec = np.zeros(dim, dtype=np.float32)
        tokens = [t.lower() for t in text.split()]
        for token in tokens:
            h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
            vec[h % dim] += 1.0
        norm = float(np.linalg.norm(vec))
        if norm > 0:
            vec /= norm
        return vec.tolist()
