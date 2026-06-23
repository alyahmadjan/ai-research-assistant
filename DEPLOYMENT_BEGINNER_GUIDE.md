# Deployment Beginner Guide

This guide assumes you already pushed the project to GitHub and want to deploy the free version without OpenAI/Claude keys.

## 0) What you are deploying
- **Frontend:** Next.js on Vercel
- **Backend:** FastAPI on Hugging Face Docker Space
- **Database:** Supabase Free Postgres
- **Embeddings/index:** stored in the database and rebuilt into Chroma on startup

---

## 1) Supabase: create the project

### Step 1.1 — Sign in
1. Go to Supabase and sign in or create an account.
2. After login, you will land on your dashboard.

### Step 1.2 — Create a new project
1. Click **New project**.
2. Choose your organization.
3. Enter a project name, for example `ai-research-assistant`.
4. Create a strong database password and save it somewhere safe.
5. Select a region close to you.
6. Click **Create new project**.
7. Wait for provisioning to finish.

### Step 1.3 — Find your database connection string
1. Open the project.
2. Go to **Project Settings**.
3. Open **Database**.
4. Find the connection string for the database.
5. Copy the URI.
6. In your backend, this becomes `DATABASE_URL`.

### Step 1.4 — Enable the vector extension
1. In Supabase, open the SQL editor.
2. Run:

```sql
create extension if not exists vector;
```

3. Save it.

### Step 1.5 — Create the tables
Run the backend once locally with the Supabase `DATABASE_URL`, or use SQL editor scripts. The app uses SQLAlchemy models for:
- `documents`
- `chunks`
- `conversations`
- `chat_messages`

The important part is that the `chunks` table now stores `embedding_json`, which lets the vector index rebuild after a restart.

### Step 1.6 — Copy the Supabase variables
You will need:
- `DATABASE_URL`
- optionally `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` if you later add storage/auth

For this codebase, the main one is `DATABASE_URL`.

---

## 2) Backend: prepare it for cloud deployment

### Step 2.1 — Open the backend folder
Your backend is already in the repo under `backend/`.

### Step 2.2 — Set the production database
In `backend/.env` for local testing or in Hugging Face secrets for deployment, set:

```env
DATABASE_URL=postgresql+psycopg2://...your Supabase URI...
```

### Step 2.3 — Keep local files for development
For local testing, you can leave:

```env
DATABASE_URL=sqlite:///./data/app.db
```

### Step 2.4 — What the backend does now
- saves document metadata to the database
- stores chunk text and embeddings in the database
- rebuilds Chroma at startup from saved chunks
- uses local models for embeddings and answer generation

That means if the free host restarts, your data can be rebuilt from Supabase.

### Step 2.5 — Local smoke test before deploy
Run the backend locally first:

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
# .\.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/health`. If it returns `ok`, the backend is working.

---

## 3) Hugging Face Docker Space: beginner steps

### Step 3.1 — Create a Hugging Face account
1. Go to Hugging Face.
2. Sign in or create an account.

### Step 3.2 — Create a new Space
1. Click your profile picture.
2. Choose **New Space**.
3. Give it a name, for example `ai-research-assistant-api`.
4. Choose **Public** if you want a free demo.
5. For SDK, select **Docker**.
6. Create the Space.

### Step 3.3 — Understand what Docker Space means
A Docker Space runs your `Dockerfile`. In this project, that is the backend FastAPI app.

### Step 3.4 — Copy the backend into the Space repo
You said you want to keep GitHub as the source and mirror the backend. That means:
1. Clone the Hugging Face Space repo locally.
2. Copy the contents of your `backend/` folder into the root of the Space repo.
3. Keep the `Dockerfile` in place.
4. Commit and push.

### Step 3.5 — Set Space variables
In the Space settings, open **Variables and Secrets** and add:
- `DATABASE_URL` = your Supabase URI
- `CORS_ORIGINS` = your Vercel URL, for example `https://your-app.vercel.app`
- `LOCAL_LLM_MODEL` = `google/flan-t5-small`
- `APP_NAME` = `AI Research Assistant`

### Step 3.6 — Deploy and watch the logs
1. After push, Hugging Face rebuilds automatically.
2. Open the **Logs** tab.
3. Wait for the app to start.
4. Visit the Space URL.
5. Check `/health`.

If the app fails, the logs usually show exactly which dependency or environment variable is missing.

---

## 4) GitHub mirroring: beginner steps

You said you want GitHub as the source and to mirror the backend. A simple workflow is:

### Step 4.1 — Keep the repo structure
Your GitHub repo stays the main source of truth. The folder structure is:
- `frontend/`
- `backend/`
- `infra/`

### Step 4.2 — Work locally
Make changes locally, test them, then commit to GitHub.

### Step 4.3 — Mirror backend to Hugging Face
Whenever you update the backend:
1. Pull the latest GitHub changes.
2. Copy the updated `backend/` folder into the Hugging Face Space repo.
3. Commit and push to the Space repo.

### Step 4.4 — Keep one source of truth
GitHub remains your source of truth. The Space is the deployment copy.

This avoids confusion when you later change the backend for deployment.

---

## 5) Vercel: beginner steps

### Step 5.1 — Sign in
Go to Vercel and sign in with GitHub.

### Step 5.2 — Import the repo
1. Click **Add New → Project**.
2. Choose your GitHub repository.
3. When Vercel asks for the root directory, set it to `frontend`.

### Step 5.3 — Set environment variables
Add:
- `NEXT_PUBLIC_API_BASE_URL` = your Hugging Face Space URL

### Step 5.4 — Deploy
Click **Deploy**.
Vercel builds the frontend and gives you a public URL.

### Step 5.5 — Test the frontend
1. Open the Vercel URL.
2. Upload a small PDF.
3. Ask a question.
4. Confirm the answer and citations appear.

---

## 6) Full deployment order
1. Create Supabase project.
2. Enable `vector` extension.
3. Copy Supabase `DATABASE_URL`.
4. Set backend to use the Supabase database.
5. Test backend locally.
6. Create Hugging Face Docker Space.
7. Add Space variables.
8. Push backend to the Space repo.
9. Deploy frontend on Vercel.
10. Set `NEXT_PUBLIC_API_BASE_URL`.
11. Set backend `CORS_ORIGINS` to the Vercel domain.
12. Smoke test upload → chat → summarize → compare.

---

## 7) What to do if something fails
- If the frontend says `Failed to fetch`, the backend URL or CORS is wrong.
- If the backend fails to start, check Hugging Face logs.
- If chat works but old documents disappeared, check Supabase `DATABASE_URL`.
- If vectors are missing, restart the backend once so the index rebuild runs.

---

## 8) Local test after deployment changes
You can still run the app locally using SQLite:

```bash
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# in another terminal
cd frontend
npm run dev
```

Set `frontend/.env.local` to:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Then open `http://localhost:3000`.
