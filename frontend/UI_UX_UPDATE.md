# UI/UX and response quality update

## What changed
- The answer generator now falls back to a question-aware, document-aware extractive engine when the local LLM cannot load.
- Summarize and compare now log the user prompt in history, not only the assistant response.
- The upload flow remembers the most recent upload so Ask/Summarize works without manual selection.
- The interface was rebuilt to be cleaner, more guided, and easier to use.

## Why the repeated response happened
The local model path was failing, so the app always used the same fallback summary of the same retrieved chunks. The new fallback uses the actual question and mode, so responses vary with the user intent.
