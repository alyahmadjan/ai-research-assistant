from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ChunkPayload:
    chunk_index: int
    text: str
    page_number: int | None
    metadata_json: str


class ChunkingService:
    def __init__(self, max_chars: int = 1200, overlap: int = 180):
        self.max_chars = max_chars
        self.overlap = overlap

    def chunk_text(self, text: str) -> list[ChunkPayload]:
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        chunks: list[ChunkPayload] = []
        buffer = ""
        chunk_index = 0
        for paragraph in paragraphs:
            candidate = (buffer + "\n\n" + paragraph).strip() if buffer else paragraph
            if len(candidate) <= self.max_chars:
                buffer = candidate
                continue
            if buffer:
                chunks.append(self._make_payload(chunk_index, buffer))
                chunk_index += 1
            if len(paragraph) > self.max_chars:
                start = 0
                while start < len(paragraph):
                    part = paragraph[start:start + self.max_chars]
                    chunks.append(self._make_payload(chunk_index, part))
                    chunk_index += 1
                    start += self.max_chars - self.overlap
                buffer = ""
            else:
                buffer = paragraph
        if buffer:
            chunks.append(self._make_payload(chunk_index, buffer))
        return chunks

    def _make_payload(self, chunk_index: int, text: str, page_number: int | None = None) -> ChunkPayload:
        return ChunkPayload(
            chunk_index=chunk_index,
            text=text.strip(),
            page_number=page_number,
            metadata_json="{}",
        )
