# Free deployment change log

This repo keeps the original RAG product structure, but the runtime path was adjusted so it can deploy without paid LLM keys.

## Files changed and why

- `backend/app/services/generation_service.py`
  - Replaced the hosted OpenAI call with a small local Hugging Face seq2seq model.
  - Added a fallback answer path so chat still works if the local model cannot load.

- `backend/app/services/embedding_service.py`
  - Removed the OpenAI embedding branch from the runtime path.
  - Kept local SentenceTransformers embeddings as the default.

- `backend/app/core/config.py`
  - Added `LOCAL_LLM_MODEL` so the local generation model can be configured by environment variable.

- `backend/requirements.txt`
  - Added `transformers`, `sentencepiece`, and `torch`.
  - Commented out `openai` because the free deployment path does not rely on it.

- `backend/.env.example`
  - Added the local model variable and documented that no API key is required.

- `backend/Dockerfile`
  - Kept a single-worker Uvicorn run command for lighter free-host deployments.

- `README.md`
  - Updated setup and deployment instructions for the no-key path.

- `infra/README.md` and `infra/deploy.yml`
  - Updated the deployment guidance for Hugging Face Spaces + Vercel.

## What was intentionally skipped

- OCR
- Auth
- Multi-tenant permissions
- Paid LLM API usage

Those are outside the v1 scope described in the project plan.
