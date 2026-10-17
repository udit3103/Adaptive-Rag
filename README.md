# Adaptive RAG

An adaptive retrieval-augmented generation app with a FastAPI backend and a Streamlit interface. It routes questions to uploaded documents, general-purpose answers, or web search.

**Author:** Udit Tiwari

## Features

- Routes questions to document retrieval, general knowledge, or web search.
- Uploads PDF and TXT files, splits them into chunks, and indexes them with FAISS.
- Provides a chat interface and REST API.
- Keeps chat history in memory by default; MongoDB can be enabled optionally.

## Requirements

- Python 3.11 (recommended)
- An OpenAI API key for LLM responses and document embeddings.
- A Tavily API key for the web-search route only.
- MongoDB is optional; the default in-memory history needs no database service.

## Install

### Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` and set `OPENAI_API_KEY`. Set `TAVILY_API_KEY` if you want to use web search. Never commit `.env` or paste API keys into source files.

### macOS / Linux

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
```

Then edit `.env` with your API keys.

## Run

Start the API and UI in separate terminals from the project root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn src.main:app --reload
```

```powershell
.\.venv\Scripts\python.exe -m streamlit run streamlit_app/home.py
```

Open <http://localhost:8501> for the app and <http://127.0.0.1:8000/docs> for interactive API documentation.

The Streamlit UI generates a session ID automatically; no separate login service is required. If the API runs at a different address, set `RAG_API_URL` in `.env`.

## API

### Ask a question

`POST /rag/query`

```json
{
  "query": "What is the main topic of the uploaded document?",
  "session_id": "your-session-id"
}
```

### Upload a document

`POST /rag/documents/upload` as multipart form data, with the document description in the `X-Description` header:

```powershell
curl.exe -X POST http://127.0.0.1:8000/rag/documents/upload `
  -H "X-Description: A short description of the document" `
  -F "file=@document.pdf"
```

PDF and TXT files are supported. Uploads and FAISS indexes are held in process memory and are lost when the API restarts.

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | Chat completions and document embeddings |
| `TAVILY_API_KEY` | For web search | Search queries routed to Tavily |
| `CHAT_HISTORY_BACKEND` | No | `memory` by default, or `mongodb` |
| `MONGODB_URL` | For MongoDB history | MongoDB connection string |
| `MONGODB_DB_NAME` | No | MongoDB database name (`adaptive_rag` by default) |
| `RAG_API_URL` | No | FastAPI URL used by Streamlit |

For MongoDB-backed history, set `CHAT_HISTORY_BACKEND=mongodb` and configure `MONGODB_URL`. The MongoDB service must be reachable by the API.

## Project layout

```text
src/
  api/          FastAPI endpoints
  config/       Prompts and configuration
  core/         Environment settings
  db/           Optional MongoDB client
  memory/       In-memory and MongoDB chat history
  rag/          Document ingestion, retrieval, and graph workflow
  tools/        LangGraph routing tools
streamlit_app/  Streamlit user interface and API client
```

## Notes

- FAISS is configured in memory; this project does not currently use Qdrant.
- Uploaded document indexes and in-memory conversations are not persistent across API restarts.
- API keys may incur charges with their providers. Keep them private and monitor usage.
- The project is licensed under the MIT License; see [LICENSE](LICENSE).
