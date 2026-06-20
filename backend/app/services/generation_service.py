from __future__ import annotations

from dataclasses import dataclass

from app.core.config import get_settings

# Free deployment change:
# We replace the hosted LLM dependency with a compact local text-to-text model.
# This keeps the backend usable without OpenAI/Claude keys.
try:
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
except Exception:  # pragma: no cover
    AutoModelForSeq2SeqLM = None
    AutoTokenizer = None


@dataclass
class GenerationResult:
    answer: str
    confidence: str = "medium"


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
                # Added: load a small instruction-following model that works on CPU.
                self._tokenizer = AutoTokenizer.from_pretrained(self.settings.local_llm_model)
                self._model = AutoModelForSeq2SeqLM.from_pretrained(self.settings.local_llm_model)
            except Exception:
                self._tokenizer = None
                self._model = None
        return self._tokenizer, self._model

    def build_prompt(self, question: str, context_blocks: list[str], mode: str = "answer") -> str:
        # Added: keep the prompt compact so a small local model can handle it.
        trimmed_context = context_blocks[:5]
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

    def _fallback_answer(self, context_blocks: list[str]) -> str:
        joined = " ".join(context_blocks).strip()
        if not joined:
            return "I could not find enough supporting context in the uploaded documents to answer confidently."
        return (
            "I used the retrieved passages, but the local model could not be loaded. "
            f"Relevant context summary: {joined[:900]}"
        )

    def generate(self, question: str, context_blocks: list[str], mode: str = "answer") -> GenerationResult:
        prompt = self.build_prompt(question, context_blocks, mode=mode)
        tokenizer, model = self._load_local_model()

        if tokenizer is not None and model is not None:
            try:
                # Added: generate locally so the app works without an API key.
                inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=1024)
                output_ids = model.generate(
                    **inputs,
                    max_new_tokens=256,
                    num_beams=2,
                    do_sample=False,
                )
                answer = tokenizer.decode(output_ids[0], skip_special_tokens=True).strip()
                if answer:
                    return GenerationResult(answer=answer, confidence="high")
            except Exception:
                # Skipped: model/runtime issues should not break chat.
                pass

        return GenerationResult(answer=self._fallback_answer(context_blocks), confidence="medium")
