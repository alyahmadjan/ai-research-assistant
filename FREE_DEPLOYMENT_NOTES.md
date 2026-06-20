# Free deployment notes

This version of the repo is adjusted for a no-paid-key deployment path.

## What changed from the original codebase

- Removed the need for OpenAI API keys in the runtime path.
- Kept the original RAG flow, document processing, citations, and chat history.
- Switched answer generation to a local Hugging Face model.
- Kept embeddings local with SentenceTransformers.
- Added comments in code where OpenAI-backed lines were skipped or replaced.
- Updated the docs to describe the free deployment path.

## Important limitation

The free-tier deployment path is best for demos and client showcases. If the host restarts or sleeps, local disk contents may not persist. For durable storage, move uploads/chunks/chat history to Supabase later.
