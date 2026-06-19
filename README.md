# AI Research Assistant

A RAG (Retrieval-Augmented Generation) powered assistant for researchers, students, and analysts. Upload PDFs, whitepapers, and reports — then ask questions like *"What are the main findings?"* or *"Compare the arguments across these papers."*

![Architecture](https://via.placeholder.com/800x300?text=Architecture+Diagram)

---

## Features

- Upload PDFs, TXT, and Markdown files
- Ask natural language questions grounded in your documents
- Inline citations with page references
- Select specific documents to scope your queries
- Sources panel showing retrieved chunks with relevance scores
- Duplicate detection — same document won't be ingested twice

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + Python 3.11 |
| RAG pipeline | LangChain |
| Embeddings | OpenAI `text-embedding-3-small` |
| Vector DB | ChromaDB (persistent) |
| LLM | GPT-4o-mini (or Claude via Anthropic) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Deployment | Render (backend) + Vercel (frontend) |

---

## Architecture

```
User uploads PDF
      │
      ▼
Chunk text (800 tokens, 100 overlap)
      │
      ▼
Embed chunks (text-embedding-3-small)
      │
      ▼
Store in ChromaDB with metadata (filename, page)

User asks question
      │
      ▼
Embed question
      │
      ▼
Top-6 cosine similarity search in ChromaDB
      │
      ▼
Build context prompt (question + retrieved chunks)
      │
      ▼
LLM generates grounded answer with citations
```

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 20+
- OpenAI API key (or Anthropic)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

uvicorn main:app --reload
# API running at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# App running at http://localhost:5173
```

### Docker (full stack)

```bash
cp .env.example .env
# Edit .env with your API key

docker-compose up --build
# App at http://localhost
# API at http://localhost:8000
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/upload` | Upload a document (multipart/form-data) |
| GET | `/documents` | List all uploaded documents |
| DELETE | `/documents/{doc_id}` | Remove a document |
| POST | `/query` | Ask a question |

### Query request body
```json
{
  "question": "What are the main findings?",
  "doc_ids": ["uuid-1", "uuid-2"]  // optional, omit to search all
}
```

---

## Deployment

### Backend → Render

1. Push repo to GitHub
2. Go to [render.com](https://render.com) → New Web Service → connect repo
3. Set root directory to `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables in Render dashboard (OPENAI_API_KEY etc.)
7. Add a 1 GB Disk mounted at `/opt/render/project/src/chroma_db`

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → connect repo
2. Set root directory to `frontend`
3. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com`
4. Deploy

---

## Evaluation

Run RAGAS evaluation after ingesting test documents:

```bash
cd backend
python eval.py
```

| Metric | Score |
|--------|-------|
| Faithfulness | — |
| Answer Relevancy | — |
| Context Precision | — |
| Context Recall | — |

*Scores are populated after running `eval.py` with your test documents.*

---

## What I'd improve next

- **Hybrid search** — combine BM25 keyword + vector for better exact-match recall
- **Re-ranking** — use a cross-encoder to re-rank top-k results before generation
- **Streaming responses** — stream LLM output token-by-token for faster perceived response
- **Multi-user sessions** — user accounts so each user has their own document library
- **OCR support** — handle scanned PDFs using Tesseract

---

## Project Structure

```
research-assistant/
├── backend/
│   ├── main.py          # FastAPI app + endpoints
│   ├── ingest.py        # PDF parsing, chunking, embedding, storage
│   ├── retriever.py     # Query embedding, similarity search, LLM call
│   ├── config.py        # Settings and environment variables
│   ├── eval.py          # RAGAS evaluation script
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── components/
│   │       ├── DocumentPanel.jsx
│   │       ├── ChatPanel.jsx
│   │       └── SourcesPanel.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── vercel.json
├── docker-compose.yml
├── render.yaml
└── README.md
```
