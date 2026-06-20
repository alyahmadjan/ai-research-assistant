# Infrastructure notes

This folder contains deployment-oriented helpers for the portfolio project.

## Free deployment mapping

- Backend container: Hugging Face Docker Spaces
- Frontend: Vercel
- Upload storage: local runtime storage for the free demo path
- Vector store: Chroma for local dev and free demo use

## Later upgrade path

- Move uploads to Supabase Storage or S3
- Move vectors to pgvector or a managed vector DB
- Add background job processing if ingestion volume grows
