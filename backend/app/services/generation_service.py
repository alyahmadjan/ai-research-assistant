from __future__ import annotations

import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Iterable

from app.core.config import get_settings

# Free deployment change:
# Keep an optional local model path, but make the app useful even when the model
# cannot download or run on the current machine. The heuristic fallback below
# produces question-aware, document-aware answers without any API key.
try:
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
except Exception:  # pragma: no cover
    AutoModelForSeq2SeqLM = None
    AutoTokenizer = None


STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "can",
    "could",
    "do",
    "does",
    "for",
    "from",
    "how",
    "i",
    "in",
    "is",
    "it",
    "its",
    "of",
    "on",
    "or",
    "our",
    "should",
    "that",
    "the",
    "their",
    "there",
    "these",
    "this",
    "to",
    "was",
    "we",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "will",
    "with",
    "would",
    "you",
}

WORD_RE = re.compile(r"[A-Za-z0-9']+")
SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")
BLOCK_RE = re.compile(r"^\[(?P<header>[^\]]+)\]\s*(?P<body>.*)$", re.DOTALL)


@dataclass
class GenerationResult:
    answer: str
    confidence: str = "medium"


@dataclass
class ContextSnippet:
    document_name: str
    page_label: str
    chunk_label: str
    text: str


class GenerationService:
    def __init__(self):
        self.settings = get_settings()
        self._tokenizer = None
        self._model = None

    def _load_local_model(self):
        if AutoTokenizer is None or AutoModelForSeq2SeqLM is None:
            return None, None

        if self._tokenizer is None or self._model is None:
            try:
                # Added: a compact instruction model can be used locally if it loads.
                self._tokenizer = AutoTokenizer.from_pretrained(self.settings.local_llm_model)
                self._model = AutoModelForSeq2SeqLM.from_pretrained(self.settings.local_llm_model)
            except Exception:
                self._tokenizer = None
                self._model = None
        return self._tokenizer, self._model

    def build_prompt(self, question: str, context_blocks: list[str], mode: str = "answer") -> str:
        trimmed_context = context_blocks[:6]
        context = "\n\n".join(trimmed_context) if trimmed_context else "No relevant context was retrieved."
        return f"""
You are a professional research assistant.

Rules:
- Answer only from the provided context whenever possible.
- If the context does not support the answer, say so clearly.
- Start with a concise answer, then add supporting detail.
- Include source references in the answer naturally.
- Be precise and avoid hallucinations.

Task mode: {mode}
Question: {question}

Context:
{context}

Write the response now.
""".strip()

    def _fallback_answer(self, question: str, context_blocks: list[str], mode: str = "answer") -> str:
        snippets = self._parse_context_blocks(context_blocks)
        if not snippets:
            return "I could not find enough supporting context in the uploaded documents to answer confidently."

        if mode == "summarize":
            return self._summarize_from_context(snippets)
        if mode == "compare":
            return self._compare_from_context(snippets)

        return self._answer_from_context(question, snippets)

    def _parse_context_blocks(self, context_blocks: list[str]) -> list[ContextSnippet]:
        snippets: list[ContextSnippet] = []
        for block in context_blocks:
            match = BLOCK_RE.match(block.strip())
            if match:
                header = match.group("header")
                body = match.group("body").strip()
                parts = [part.strip() for part in header.split("|")]
                document_name = parts[0] if parts else "Source"
                page_label = "n/a"
                chunk_label = "n/a"
                for part in parts[1:]:
                    lower = part.lower()
                    if lower.startswith("page"):
                        page_label = part.replace("page", "").strip() or "n/a"
                    if lower.startswith("chunk"):
                        chunk_label = part.replace("chunk", "").strip() or "n/a"
            else:
                document_name = "Source"
                page_label = "n/a"
                chunk_label = "n/a"
                body = block.strip()

            body = re.sub(r"\s+", " ", body).strip()
            if not body:
                continue
            snippets.append(ContextSnippet(document_name=document_name, page_label=page_label, chunk_label=chunk_label, text=body))
        return snippets

    def _tokenize(self, text: str) -> list[str]:
        return [token.lower() for token in WORD_RE.findall(text)]

    def _content_tokens(self, text: str) -> list[str]:
        return [token for token in self._tokenize(text) if len(token) > 2 and token not in STOPWORDS]

    def _split_sentences(self, text: str) -> list[str]:
        parts = [part.strip() for part in SENTENCE_RE.split(text) if part.strip()]
        return parts if parts else ([text.strip()] if text.strip() else [])

    def _sentence_score(self, sentence: str, keywords: Counter[str], extra_terms: Iterable[str] = ()) -> float:
        sentence_tokens = self._content_tokens(sentence)
        if not sentence_tokens:
            return 0.0
        sentence_counts = Counter(sentence_tokens)
        overlap = 0.0
        for term, weight in keywords.items():
            if term in sentence_counts:
                overlap += weight + min(sentence_counts[term], 3) * 0.5
        for term in extra_terms:
            if term and term in sentence.lower():
                overlap += 0.75
        length = len(sentence_tokens)
        length_bonus = 0.75 if 12 <= length <= 45 else 0.35 if length < 12 else 0.2
        return overlap + length_bonus

    def _extract_keywords(self, question: str, mode: str) -> Counter[str]:
        tokens = self._content_tokens(question)
        if mode == "summarize":
            tokens.extend(["summary", "main", "findings", "conclusions"])
        elif mode == "compare":
            tokens.extend(["compare", "difference", "similarity", "versus", "contrast"])
        elif mode == "answer":
            tokens.extend(["answer", "explain", "findings", "evidence"])
        return Counter(tokens)

    def _best_sentences(self, snippets: list[ContextSnippet], keywords: Counter[str], limit: int = 4) -> list[tuple[ContextSnippet, str, float]]:
        ranked: list[tuple[ContextSnippet, str, float]] = []
        for snippet in snippets:
            sentences = self._split_sentences(snippet.text)
            for sentence in sentences:
                score = self._sentence_score(sentence, keywords, extra_terms=keywords.keys())
                if score > 0:
                    ranked.append((snippet, sentence, score))

        ranked.sort(key=lambda item: item[2], reverse=True)

        selected: list[tuple[ContextSnippet, str, float]] = []
        seen_sentences: set[str] = set()
        for snippet, sentence, score in ranked:
            key = sentence.lower()
            if key in seen_sentences:
                continue
            seen_sentences.add(key)
            selected.append((snippet, sentence, score))
            if len(selected) >= limit:
                break
        return selected

    def _format_citation(self, snippet: ContextSnippet) -> str:
        parts = [snippet.document_name]
        if snippet.page_label and snippet.page_label != "n/a":
            parts.append(f"page {snippet.page_label}")
        if snippet.chunk_label and snippet.chunk_label != "n/a":
            parts.append(f"chunk {snippet.chunk_label}")
        return " • ".join(parts)

    def _answer_from_context(self, question: str, snippets: list[ContextSnippet]) -> str:
        keywords = self._extract_keywords(question, mode="answer")
        selected = self._best_sentences(snippets, keywords, limit=4)
        if not selected:
            selected = self._best_sentences(snippets, Counter(self._content_tokens("document evidence")), limit=3)

        if not selected:
            return "I could not find enough supporting context in the uploaded documents to answer confidently."

        lead = "Based on the retrieved passages, the most relevant answer is:"
        lines = [lead, ""]
        for snippet, sentence, _score in selected[:3]:
            lines.append(f"- {sentence} ({self._format_citation(snippet)})")

        if len(selected) > 3:
            lines.append("")
            lines.append("Additional supporting detail:")
            for snippet, sentence, _score in selected[3:4]:
                lines.append(f"- {sentence} ({self._format_citation(snippet)})")

        return "\n".join(lines).strip()

    def _summarize_from_context(self, snippets: list[ContextSnippet]) -> str:
        by_doc: dict[str, list[ContextSnippet]] = defaultdict(list)
        for snippet in snippets:
            by_doc[snippet.document_name].append(snippet)

        lines = ["Summary of the selected document(s):", ""]
        for doc_name, doc_snippets in by_doc.items():
            keywords = Counter()
            for snip in doc_snippets:
                keywords.update(self._content_tokens(snip.text))
            top_sentences = self._best_sentences(doc_snippets, keywords, limit=2)
            if not top_sentences:
                continue
            lines.append(f"- {doc_name}:")
            for _snippet, sentence, _score in top_sentences:
                lines.append(f"  • {sentence}")
        if len(lines) == 2:
            return "I could not extract a reliable summary from the uploaded documents."
        return "\n".join(lines).strip()

    def _compare_from_context(self, snippets: list[ContextSnippet]) -> str:
        by_doc: dict[str, list[ContextSnippet]] = defaultdict(list)
        for snippet in snippets:
            by_doc[snippet.document_name].append(snippet)

        if len(by_doc) < 2:
            return "Select at least two documents to compare them."

        doc_summaries: dict[str, list[str]] = {}
        doc_keywords: dict[str, Counter[str]] = {}
        for doc_name, doc_snippets in by_doc.items():
            keywords = Counter()
            for snip in doc_snippets:
                keywords.update(self._content_tokens(snip.text))
            doc_keywords[doc_name] = keywords
            best = self._best_sentences(doc_snippets, keywords, limit=2)
            doc_summaries[doc_name] = [sentence for _snip, sentence, _score in best]

        shared = set.intersection(*(set(k.keys()) for k in doc_keywords.values())) if doc_keywords else set()
        shared_terms = [term for term in sorted(shared) if len(term) > 3][:6]

        lines = ["Comparison of the selected document(s):", ""]
        for doc_name, bullets in doc_summaries.items():
            lines.append(f"- {doc_name}:")
            if bullets:
                for sentence in bullets:
                    lines.append(f"  • {sentence}")
            else:
                lines.append("  • No strong comparison sentence was found in the retrieved passages.")

        if shared_terms:
            lines.append("")
            lines.append("Shared themes: " + ", ".join(shared_terms))

        return "\n".join(lines).strip()

    def _confidence_from_snippets(self, snippets: list[ContextSnippet], mode: str, selected: str) -> str:
        if not snippets:
            return "low"
        sentence_count = sum(len(self._split_sentences(snippet.text)) for snippet in snippets)
        if mode == "compare" and len({snippet.document_name for snippet in snippets}) >= 2 and sentence_count >= 6:
            return "high"
        if sentence_count >= 6 or selected == "model":
            return "high"
        if sentence_count >= 3:
            return "medium"
        return "low"

    def generate(self, question: str, context_blocks: list[str], mode: str = "answer") -> GenerationResult:
        prompt = self.build_prompt(question, context_blocks, mode=mode)
        tokenizer, model = self._load_local_model()

        if tokenizer is not None and model is not None:
            try:
                # Added: generate locally so the app can still behave like a normal assistant
                # when the compact model is available.
                inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=1024)
                output_ids = model.generate(
                    **inputs,
                    max_new_tokens=256,
                    num_beams=2,
                    do_sample=False,
                )
                answer = tokenizer.decode(output_ids[0], skip_special_tokens=True).strip()
                if answer:
                    snippets = self._parse_context_blocks(context_blocks)
                    return GenerationResult(answer=answer, confidence=self._confidence_from_snippets(snippets, mode, "model"))
            except Exception:
                # Skipped: model/runtime issues should not break chat.
                pass

        snippets = self._parse_context_blocks(context_blocks)
        answer = self._fallback_answer(question, context_blocks, mode=mode)
        return GenerationResult(answer=answer, confidence=self._confidence_from_snippets(snippets, mode, "fallback"))
