# AI Research Assistant (RAG)

A portfolio-ready full-stack application for uploading research documents, indexing them into a vector store, and asking grounded questions with citations.

## What this project does

- Uploads PDF, TXT, DOCX, and optional HTML documents
- Extracts and cleans text
- Chunks documents into retrieval-friendly passages
- Creates embeddings and stores them in a vector database
- Answers questions with retrieval-augmented generation
- Returns citations and source passages
- Keeps chat history
- Exposes production-style API endpoints
- Includes a Next.js UI for upload, document browsing, and chat

## Stack

- **Frontend:** Next.js, React, Tailwind CSS
- **Backend:** FastAPI, SQLAlchemy, SQLite
- **Vector store:** Chroma
- **LLM / embeddings:** Local models only for the free deployment path
- **Document parsing:** pypdf, python-docx, BeautifulSoup

## Architecture choices

This implementation follows the project plan closely and makes a few pragmatic choices:

1. **Local development uses SQLite + Chroma** so the app runs easily on a laptop.
2. **Document processing uses FastAPI BackgroundTasks** for asynchronous ingestion in v1.
3. **The free-deployment branch removes paid API dependencies** and uses a small local model instead of OpenAI so the codebase runs without an API key.
4. **OCR is intentionally not included** because the spec explicitly excludes it from version 1.
5. **Chat history is stored in SQLite** and retrieved by conversation ID.
6. **Summarize and compare endpoints** are implemented with the same RAG pipeline, tuned for those task types.

## Folder structure

```text
ai-research-assistant/
├── frontend/
├── backend/
├── infra/
└── README.md
```

The backend folder matches the document’s architecture: ingestion, chunking, embeddings, indexing, retrieval, generation, chat, projects, and health.

## Local setup

### 1) Backend

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2) Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

### 3) Open the app

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Health check: `http://localhost:8000/health`

## Environment variables

### Backend

- `APP_NAME`
- `ENVIRONMENT`
- `DATABASE_URL`
- `CHROMA_DIR`
- `UPLOAD_DIR`
- `LOCAL_LLM_MODEL`
- `MAX_UPLOAD_MB`
- `CORS_ORIGINS`

### Frontend

- `NEXT_PUBLIC_API_BASE_URL`

## Deployment notes

### Free deployment path
- **Frontend:** Vercel Hobby
- **Backend API:** Hugging Face Docker Space
- **Storage:** local runtime storage for the demo path
- **LLM/embeddings:** fully local, so no API key is required

### Backend
- Build with Docker from `backend/Dockerfile`
- The backend uses a small local model (`google/flan-t5-small` by default) so it can run without OpenAI
- Put any environment overrides in the Space settings
- The current free-tier design is best for a portfolio demo rather than always-on production

### Frontend
- Deploy to Vercel or another Next.js host
- Set `NEXT_PUBLIC_API_BASE_URL` to the backend URL

### Smoke test checklist
- Upload a document
- Confirm it appears in the document list
- Ask a question
- Verify citations point to actual chunks
- Fetch a previous conversation

## API endpoints

Implemented endpoints:

- `GET /health`
- `POST /upload`
- `GET /documents`
- `GET /documents/{document_id}`
- `DELETE /documents/{document_id}`
- `POST /documents/{document_id}/process`
- `GET /documents/{document_id}/chunks`
- `POST /chat`
- `GET /chat/{conversation_id}`
- `POST /search`
- `POST /compare`
- `POST /summarize`
- `POST /feedback`

## Assumptions and gaps handled

- The spec does not mandate a specific vector DB, so this build uses **Chroma** locally.
- The spec does not require auth, so the app is single-user / demo-friendly in v1.
- The spec mentions projects and analytics, but does not require them in the first deliverable; the schema is designed to support them later.
- The spec mentions background jobs; v1 uses background tasks and a status field, which is practical for a portfolio project and simple to run.
- The free-deployment version intentionally skips paid API keys and uses local embeddings plus a local generation model instead.

## Suggested next improvements

- Move ingestion to a task queue such as Celery or RQ
- Add real user accounts
- Add object storage for uploads
- Swap Chroma for a managed vector DB
- Add richer answer evaluation and feedback analytics

> Note: the backend environment template lives at `backend/.env.example`.
