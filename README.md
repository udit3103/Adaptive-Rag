# Adaptive RAG

An adaptive retrieval-augmented generation app built by **Udit Tiwari**. The Next.js web interface runs on Vercel and calls a separately hosted FastAPI service. Uploaded PDF and TXT documents are embedded with OpenAI and stored persistently in Qdrant.

## What it does

- Routes questions to uploaded-document retrieval, general answers, or web search.
- Uploads PDF and TXT documents up to 4 MB and indexes chunks in Qdrant Cloud.
- Keeps the OpenAI key and API-to-API secret on the server; the browser never receives them.
- Offers a responsive web UI and FastAPI OpenAPI docs.

## Architecture

```text
Browser ──> Next.js web app on Vercel ──> FastAPI on Render
                                                ├── OpenAI (chat + embeddings)
                                                ├── Qdrant Cloud (persistent vectors)
                                                └── Tavily (optional web search)
```

The Next.js server routes proxy chat and uploads, so browser requests do not expose the Python API token. A secure, HTTP-only browser cookie scopes uploaded documents to that browser session in Qdrant. Qdrant Cloud keeps document embeddings across API restarts. Chat history uses process memory by default and is not persistent.

## Deploy

### 1. Create persistent vector storage

Create a Qdrant Cloud cluster and API key. Keep its HTTPS cluster URL and key private; add them as Render environment secrets, not to GitHub.

### 2. Deploy the Python API

In Render, create a **Blueprint** for this repository. Render reads [`render.yaml`](render.yaml). Configure these secret values when prompted:

- `OPENAI_API_KEY`: a valid OpenAI key (rotate any key previously pasted into a chat).
- `RAG_API_TOKEN`: a newly generated random secret, at least 32 random bytes. Use the **same** value in Render and Vercel.
- `QDRANT_URL` and `QDRANT_API_KEY`: credentials for the Qdrant Cloud cluster.
- `TAVILY_API_KEY`: optional; web-search queries require it.

Wait for Render to deploy. The service health endpoint is `/`; API docs are at `/docs`. The first uploaded document creates the configured Qdrant collection.

### 3. Deploy the Next.js app to Vercel

1. In Vercel, choose **Add New → Project** and import `udit3103/Adaptive-Rag` from GitHub.
2. Keep the project root directory as `./` and the framework as Next.js.
3. Add these environment variables for **Production** (and Preview if desired):

   | Variable | Value |
   | --- | --- |
   | `RAG_API_URL` | The Render service URL, e.g. `https://adaptive-rag-api.onrender.com` |
   | `RAG_API_TOKEN` | The same random secret configured on Render |

4. Deploy and open the Vercel URL.

Do not add `OPENAI_API_KEY` to Vercel: OpenAI calls happen in the Python API. Keep all secrets in hosting-provider environment settings and never commit `.env`.

### 4. Local development

Create `.env` from `.env.example`, then set an OpenAI key, Qdrant cluster credentials, and a random `RAG_API_TOKEN`. Use the same token for the Next.js proxy and API. The `.env` values are loaded automatically for local development.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm ci
```

Start the API and UI in separate terminals:

```powershell
.\.venv\Scripts\python.exe -m uvicorn src.main:app --reload
```

```powershell
npm run dev
```

Open <http://localhost:3000>. FastAPI health and interactive API docs are at <http://127.0.0.1:8000/> and <http://127.0.0.1:8000/docs>.

## Configuration

| Variable | Service | Required |
| --- | --- | --- |
| `OPENAI_API_KEY` | Render / local API | Yes, for LLM responses and embeddings |
| `RAG_API_TOKEN` | Render and Vercel | Yes; use the same unpredictable secret for the API proxy |
| `QDRANT_URL` | Render / local API | Yes, for document upload and retrieval |
| `QDRANT_API_KEY` | Render / local API | Yes for Qdrant Cloud |
| `QDRANT_COLLECTION` | Render / local API | No; defaults to `adaptive-rag-documents` |
| `TAVILY_API_KEY` | Render / local API | Optional; required for web search |
| `RAG_API_URL` | Vercel / local Next.js | Yes; the deployed FastAPI service URL |
| `CHAT_HISTORY_BACKEND` | Render / local API | No; defaults to in-memory history |
| `MONGODB_URL` | Render / local API | Only if MongoDB chat history is enabled |

## Limitations

- Vercel hosts the web UI; the Python API is hosted separately on Render.
- Qdrant Cloud persists the vector index. In-memory chat history resets when the API restarts.
- Render's free web service may sleep while idle, so the first request can be slow.
- The demo has no account system. The Next.js proxy applies best-effort in-memory per-IP limits (20 queries/minute and 3 uploads/hour); these are not distributed quotas and may reset when serverless instances restart. The HTTP-only browser cookie scopes document retrieval, but is not a substitute for production authentication. Protect API credentials, monitor provider usage, and avoid uploading sensitive documents.
- Provider usage may incur charges.
- PDF extraction reads embedded text; scanned documents need OCR, which is not included.

## Project layout

```text
app/                Next.js UI and server-side API proxy
src/                FastAPI API and adaptive RAG workflow
streamlit_app/      Legacy local Streamlit UI
render.yaml         Render API service blueprint
requirements.txt    Python API dependencies
package.json        Next.js frontend dependencies and commands
```

See [documentation index](DOCUMENTATION_INDEX.md), [document upload flow](DOCUMENT_UPLOAD_FLOW.md), and [MIT License](LICENSE).
