# Local fetch fix

This patch keeps the existing RAG app but changes the browser-to-backend path for local development.

## What changed
- Frontend API calls now go through `/api/backend` by default when the backend URL points to localhost.
- Next.js rewrites `/api/backend/:path*` to the FastAPI backend.
- This avoids CORS/preflight issues that commonly surface as `Failed to fetch`.
- Chroma is pinned to `1.5.9` and `chroma-hnswlib` to `0.7.6`.
- SQLAlchemy models are imported before `create_all()` so tables are reliably created on startup.

## Why
- The UI can load even if the backend is not yet available.
- Same-origin proxying makes local testing simpler and more reliable.
- The deployment path still works because the rewrite destination can point to the real backend URL.
