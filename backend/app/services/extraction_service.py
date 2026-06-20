from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from bs4 import BeautifulSoup
from docx import Document as DocxDocument
from pypdf import PdfReader

from app.utils.text_cleaning import normalize_text, remove_repeated_headers_footers


@dataclass
class ExtractionResult:
    text: str
    pages: int


class ExtractionService:
    def extract(self, path: Path) -> ExtractionResult:
        suffix = path.suffix.lower()
        if suffix == ".pdf":
            return self._extract_pdf(path)
        if suffix == ".docx":
            return self._extract_docx(path)
        if suffix in {".html", ".htm"}:
            return self._extract_html(path)
        if suffix == ".txt":
            return self._extract_txt(path)
        raise ValueError(f"Unsupported file type: {suffix}")

    def _extract_pdf(self, path: Path) -> ExtractionResult:
        reader = PdfReader(str(path))
        pages = []
        for page in reader.pages:
            pages.append(page.extract_text() or "")
        text = "\n\n".join(pages)
        text = remove_repeated_headers_footers(normalize_text(text))
        return ExtractionResult(text=text, pages=len(reader.pages))

    def _extract_docx(self, path: Path) -> ExtractionResult:
        doc = DocxDocument(str(path))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        text = remove_repeated_headers_footers(normalize_text("\n".join(paragraphs)))
        return ExtractionResult(text=text, pages=max(1, len(paragraphs) // 20 + 1))

    def _extract_html(self, path: Path) -> ExtractionResult:
        soup = BeautifulSoup(path.read_text(encoding="utf-8", errors="ignore"), "lxml")
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()
        text = soup.get_text("\n")
        text = remove_repeated_headers_footers(normalize_text(text))
        return ExtractionResult(text=text, pages=max(1, len(text) // 4000 + 1))

    def _extract_txt(self, path: Path) -> ExtractionResult:
        text = path.read_text(encoding="utf-8", errors="ignore")
        text = remove_repeated_headers_footers(normalize_text(text))
        return ExtractionResult(text=text, pages=max(1, len(text) // 4000 + 1))
