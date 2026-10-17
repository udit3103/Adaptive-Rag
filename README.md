# Adaptive RAG - Agentic AI Chatbot

[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-API-green.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-Web-black.svg)](https://nextjs.org/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Workflow-orange.svg)](https://python.langchain.com/docs/langgraph/)
[![Qdrant](https://img.shields.io/badge/Qdrant-Persistent%20Vectors-purple.svg)](https://qdrant.tech/)

**Live demo:** <https://adaptive-rag-orcin.vercel.app/>

**Source:** <https://github.com/udit3103/Adaptive-Rag>

## 📋 Overview

**Adaptive RAG** is a retrieval-augmented generation application with a Next.js web interface and a FastAPI backend. It routes questions to uploaded-document retrieval, general knowledge, or web search, then returns an answer through an adaptive LangGraph workflow.

The web interface is hosted on Vercel. The Python API is hosted separately on Render, and uploaded document embeddings are stored in Qdrant Cloud so they persist across API restarts. OpenAI provides chat responses and document embeddings; Tavily can optionally provide web-search results.

## 🎯 Key Features

### 🧠 Intelligent Query Routing

- **Adaptive classification:** Routes each question to the processing path selected by the workflow.
- **Three query paths:**
  - **Index:** Looks for relevant documents uploaded by the current browser.
  - **General:** Answers with the language model's general knowledge.
  - **Search:** Uses Tavily for queries that need web results.

### 📚 Advanced RAG Pipeline

- **Document processing:** Loads PDF and TXT files and splits text into overlapping chunks.
- **Persistent vector search:** Creates embeddings with OpenAI and stores them in Qdrant.
- **Owner-scoped retrieval:** Filters document search using a server-managed browser identity.
- **Relevance grading and query rewriting:** LangGraph can assess retrieved context and refine a query before producing an answer.

### 🤖 Agentic AI Architecture

- **LangGraph workflow:** Coordinates classification, retrieval, grading, query rewriting, web search, and answer generation.
- **ReAct tools:** Integrates retrieval and optional web-search tools into the workflow.
- **OpenAI models:** The chat workflow uses `gpt-4o`; embeddings use `text-embedding-3-small`.

### 💾 State Management

- **Persistent documents:** Qdrant stores vectorized document chunks across API restarts.
- **Session chat history:** In-memory history is used by default and resets when the API process restarts.
- **Optional MongoDB history:** Configure MongoDB when durable chat history is needed.
- **Browser-scoped document access:** An HTTP-only cookie scopes the Next.js browser session's retrieval.

### 🎨 User Interface

- **Next.js web app:** Responsive chat and document-upload interface deployed on Vercel.
- **File support:** PDF and TXT uploads up to 4 MB through the web interface.
- **Legacy local UI:** A Streamlit client remains available for local use; the deployed app uses Next.js.
- **Readable error states:** Displays actionable errors for unavailable API responses and exhausted OpenAI API quota.

### ⚡ API-First Architecture

- **FastAPI backend:** Exposes health, chat-query, and document-upload endpoints.
- **Server-side proxy:** Next.js forwards requests to FastAPI without exposing the shared API token in browser code.
- **Protected routes:** Chat and upload endpoints require a shared Bearer token.
- **Interactive API docs:** FastAPI exposes Swagger UI at `/docs` and ReDoc at `/redoc`.

---

## 🏗️ Architecture

### System Components

```text
┌──────────────────────────────────────────────────────────────────────┐
│                         User's browser                               │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Next.js web app on Vercel                                      │  │
│  │ • Chat interface                                               │  │
│  │ • PDF/TXT upload (up to 4 MB)                                   │  │
│  │ • HTTP-only browser owner cookie                               │  │
│  └────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ Same-origin server-side proxy
                                │ RAG_API_TOKEN (server only)
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     FastAPI service on Render                       │
│  • Authenticated query endpoint                                      │
│  • Authenticated document upload endpoint                            │
│  • LangGraph adaptive RAG workflow                                   │
└──────────────┬─────────────────────────┬─────────────────────────────┘
               │                         │
               ▼                         ▼
┌────────────────────────┐   ┌────────────────────────────────────────┐
│ OpenAI                 │   │ Qdrant Cloud                           │
│ • gpt-4o chat          │   │ • Persistent document vectors           │
│ • text-embedding-3-    │   │ • Owner-filtered retrieval              │
│   small embeddings     │   └────────────────────────────────────────┘
└────────────────────────┘
               │
               ▼
┌────────────────────────┐
│ Tavily (optional)      │
│ • Web search results   │
└────────────────────────┘
```

The `OPENAI_API_KEY`, `QDRANT_API_KEY`, and `RAG_API_TOKEN` are configured as server-side environment variables. Do not place them in browser code or commit them to GitHub. Qdrant's collection is created on the first successful document upload.

### Graph Nodes

1. **`query_analysis`**: Inspects the incoming question and classifies its route.
2. **`retriever`**: Searches the current owner's documents when the workflow selects document retrieval.
3. **`grade`**: Evaluates whether retrieved context is relevant to the question.
4. **`rewrite`**: Rephrases a question when a better retrieval query is needed.
5. **`generate`**: Produces an answer using the selected context.
6. **`web_search`**: Uses Tavily for queries routed to current web information.
7. **`general_llm`**: Answers questions routed to general knowledge.

---

## 📦 Project Structure

```text
Adaptive-Rag/
├── app/                              # Next.js interface and server-side API routes
│   ├── api/
│   │   ├── documents/                # Document-upload proxy
│   │   ├── query/                    # Query proxy
│   │   ├── session/                  # Browser session cookie endpoint
│   │   ├── rate-limit.ts             # Best-effort proxy rate limits
│   │   └── upstream-response.ts      # Upstream JSON/error normalization
│   ├── page.tsx                      # Main chat and upload interface
│   └── ...                           # Layout, styling, and UI assets
├── src/                              # FastAPI service and RAG workflow
│   ├── api/
│   │   └── routes.py                 # Health-protected query/upload routes
│   ├── config/
│   │   ├── prompts.yaml              # RAG prompts
│   │   └── settings.py               # Workflow configuration
│   ├── core/
│   │   └── config.py                 # Environment-based settings
│   ├── db/
│   │   └── mongo_client.py           # Optional MongoDB client
│   ├── llms/
│   │   └── openai.py                 # OpenAI chat model
│   ├── memory/
│   │   ├── chat_history_mongo.py     # Chat-history backend selector
│   │   └── chathistory_in_memory.py  # Default in-memory history
│   ├── models/                       # API schemas and graph state models
│   ├── rag/
│   │   ├── document_upload.py        # File loading, chunking, ingestion
│   │   ├── graph_builder.py          # LangGraph workflow
│   │   ├── retriever_setup.py        # Qdrant vector store and retriever
│   │   └── reAct_agent.py            # Retrieval agent
│   └── tools/                        # Routing and workflow tools
├── streamlit_app/                    # Optional legacy local Streamlit client
├── .env.example                      # Safe local environment template
├── .python-version                   # Render Python version pin
├── render.yaml                       # Render Blueprint for the API
├── requirements.txt                  # Python dependencies
├── package.json                      # Next.js dependencies and commands
├── DOCUMENTATION_INDEX.md            # Documentation index
├── DOCUMENT_UPLOAD_FLOW.md           # Upload and retrieval flow
└── QDRANT_SETUP_GUIDE.md              # Qdrant Cloud setup instructions
```

---

## 🔌 API Endpoints

### Base URLs

Local development:

```text
Web app: http://localhost:3000
FastAPI: http://127.0.0.1:8000
```

Production:

```text
Web app: https://adaptive-rag-orcin.vercel.app
FastAPI: https://adaptive-rag-api-ozc3.onrender.com
```

### 1. Health Endpoint

**Check whether the FastAPI service is running**

```http
GET /
```

No authentication is required for the health check. Example response:

```json
{
  "message": "Adaptive RAG API is running"
}
```

This endpoint confirms the API process is responding; it does not verify OpenAI billing or Qdrant connectivity.

### 2. Query Endpoint

**Process a RAG query and return an answer**

```http
POST /rag/query
Authorization: Bearer <RAG_API_TOKEN>
Content-Type: application/json
```

Request body:

```json
{
  "query": "What is the main topic of the document?",
  "session_id": "user_session_123"
}
```

Example response:

```json
{
  "result": {
    "type": "ai",
    "content": "Based on the document, the main topic is..."
  }
}
```

**Parameters:**

- `query` (string, required): The user's question.
- `session_id` (string, required): Identifier for the in-memory or MongoDB chat session.
- `user_id` (string, optional): Owner identifier forwarded by the Next.js proxy. The API uses this to scope document retrieval.
- `Authorization` (header, required): `Bearer <RAG_API_TOKEN>`.

**Typical status codes:**

- `200`: Query completed.
- `401`: Missing or invalid API token.
- `422`: Invalid request body.
- `503`: API token configuration is missing or OpenAI quota/rate limits prevent processing.

### 3. Document Upload Endpoint

**Upload a PDF or TXT file for RAG indexing**

```http
POST /rag/documents/upload
Authorization: Bearer <RAG_API_TOKEN>
X-Description: Brief description of the document
X-User-ID: <browser-owner-id>
Content-Type: multipart/form-data
```

Form data:

```text
file: <PDF or TXT file>
```

Example response:

```json
{
  "status": true
}
```

**Headers and parameters:**

- `Authorization` (header, required): `Bearer <RAG_API_TOKEN>`.
- `X-Description` (header, required): Short description attached to each chunk.
- `X-User-ID` (header, required): Owner identifier used to scope retrieval.
- `file` (form field, required): PDF or plain text document.

The web interface accepts PDF/TXT files no larger than 4 MB. Supported extensions are `.pdf` and `.txt`. The API needs `OPENAI_API_KEY` and Qdrant configuration to index a document.

**Typical status codes:**

- `200`: Document indexed.
- `400`: Unsupported file type or document cannot be processed.
- `401`: Missing or invalid API token.
- `422`: Required upload field or header is missing.
- `503`: OpenAI quota/rate limits or required vector configuration are unavailable.

---

## 📖 Usage Guide

### 1. Prerequisites

```text
Python 3.11.9
Node.js 22 or newer and npm
OpenAI API key with available API billing/credits
Qdrant Cloud cluster URL and API key
RAG_API_TOKEN (a private random shared secret)
Tavily API key (optional, for web search)
MongoDB (optional, for persistent chat history)
```

The Vercel web application and Render API are already deployed. You only need to run the local installation below for local development.

### 2. Installation

#### Windows PowerShell

```powershell
# Clone the repository
git clone https://github.com/udit3103/Adaptive-Rag.git
Set-Location Adaptive-Rag

# Create and prepare the Python environment
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# Install the web application dependencies
npm ci

# Create your local environment file
Copy-Item .env.example .env
```

#### macOS / Linux

```bash
# Clone the repository
git clone https://github.com/udit3103/Adaptive-Rag.git
cd Adaptive-Rag

# Create and prepare the Python environment
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# Install the web application dependencies
npm ci

# Create your local environment file
cp .env.example .env
```

### 3. Environment Configuration

Edit `.env` in the project root. Use a Qdrant Cloud URL and credentials for document persistence. For local development, `RAG_API_URL` should point to the local FastAPI service.

```env
# OpenAI chat and embeddings
OPENAI_API_KEY=your_openai_api_key

# Optional web search
TAVILY_API_KEY=

# Shared secret between the Next.js proxy and FastAPI
RAG_API_TOKEN=generate_a_long_random_secret

# Persistent Qdrant vector storage
QDRANT_URL=https://your-cluster-id.region.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION=adaptive-rag-documents

# Chat history (memory by default)
CHAT_HISTORY_BACKEND=memory
MONGODB_URL=
MONGODB_DB_NAME=adaptive_rag

# Local FastAPI address used by the Next.js server
RAG_API_URL=http://127.0.0.1:8000
```

Do not use the example values above as credentials. Keep `.env` private and do not commit API keys or tokens. For MongoDB-backed history, set `CHAT_HISTORY_BACKEND=mongodb` and configure `MONGODB_URL`.

### 4. Running the Application

Start the services in separate terminals from the project root.

#### FastAPI Backend

Windows PowerShell:

```powershell
.\.venv\Scripts\python.exe -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

macOS / Linux:

```bash
source .venv/bin/activate
python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

#### Next.js Web App

```bash
npm run dev
```

#### Optional Streamlit Client

For the legacy local Streamlit UI, run:

```powershell
.\.venv\Scripts\python.exe -m streamlit run streamlit_app/home.py
```

**Access the application:**

- Next.js web interface: <http://localhost:3000>
- Legacy Streamlit interface: <http://localhost:8501>
- API health check: <http://127.0.0.1:8000/>
- Swagger API documentation: <http://127.0.0.1:8000/docs>
- ReDoc API documentation: <http://127.0.0.1:8000/redoc>

### 5. Example Usage

#### Using the deployed web interface

1. Open <https://adaptive-rag-orcin.vercel.app/>.
2. Ask a general question, or select a PDF/TXT file and provide a brief description.
3. Upload the document to index it in Qdrant.
4. Ask a question about the uploaded material.

Document indexing and chat require an OpenAI API key with available API billing/credits. Web-search queries additionally require `TAVILY_API_KEY`.

#### Using cURL from Windows PowerShell

Set your private token in the terminal environment (do not paste it into source code):

```powershell
$env:RAG_API_TOKEN = "your_private_token"
```

Upload a document:

```powershell
curl.exe -X POST http://127.0.0.1:8000/rag/documents/upload `
  -H "Authorization: Bearer $env:RAG_API_TOKEN" `
  -H "X-Description: Sample document about Python" `
  -H "X-User-ID: local-test-user" `
  -F "file=@document.pdf"
```

Query the RAG system:

```powershell
curl.exe -X POST http://127.0.0.1:8000/rag/query `
  -H "Authorization: Bearer $env:RAG_API_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"query":"Tell me about Python","session_id":"user_123","user_id":"local-test-user"}'
```

#### Using Python

```python
import os

import requests

response = requests.post(
    "http://127.0.0.1:8000/rag/query",
    headers={"Authorization": f"Bearer {os.environ['RAG_API_TOKEN']}"},
    json={
        "query": "What is Python?",
        "session_id": "user_123",
        "user_id": "local-test-user",
    },
    timeout=60,
)
response.raise_for_status()
print(response.json())
```

---

## 🔧 Configuration

### Key Configuration Files

#### `src/core/config.py`

Loads application settings from environment variables (and `.env` for local development), including:

```text
OPENAI_API_KEY       OpenAI chat and embedding authentication
TAVILY_API_KEY       Optional web-search authentication
RAG_API_TOKEN        Shared proxy-to-API authentication
QDRANT_URL           Qdrant vector database endpoint
QDRANT_API_KEY       Qdrant Cloud authentication
QDRANT_COLLECTION    Vector collection name
CHAT_HISTORY_BACKEND In-memory or MongoDB chat history
MONGODB_URL          Optional MongoDB connection
MONGODB_DB_NAME      MongoDB database name
```

#### `src/config/prompts.yaml`

Contains workflow prompt templates used for:

- **System instructions:** Guidance for the agent workflow.
- **Query classification:** Selects document, general, or web-search handling.
- **Relevance grading:** Evaluates retrieved context.
- **Query rewriting:** Refines a query when additional retrieval is needed.
- **Answer generation:** Produces a final response from context.

### Query Routing Logic

The workflow classifies queries and routes them to the relevant path:

```text
Incoming question
├── "index"   → Owner-scoped Qdrant retrieval
├── "general" → General OpenAI response
└── "search"  → Tavily web search (requires TAVILY_API_KEY)
```

When a question is classified for document retrieval, the workflow retrieves only chunks associated with the current browser owner. If relevant context is not found, the workflow can grade or rewrite the query before generating an answer.

---

## 🧪 Testing the API

### Using FastAPI Interactive Documentation

1. Start the FastAPI service locally.
2. Navigate to <http://127.0.0.1:8000/docs>.
3. Expand an endpoint and select **Try it out**.
4. Add `Authorization: Bearer <RAG_API_TOKEN>` to protected requests.
5. Provide the request body or upload fields and select **Execute**.

The health endpoint `/` does not require a token. Query and upload endpoints do.

### Example Test Cases

**Test 1: General question**

```json
{
  "query": "What is machine learning?",
  "session_id": "test_user_1"
}
```

**Test 2: Question about uploaded documents**

```json
{
  "query": "What topics are covered in the uploaded document?",
  "session_id": "test_user_1",
  "user_id": "local-test-user"
}
```

**Test 3: Missing API token**

A request to `/rag/query` without a valid Bearer token should receive `401 Unauthorized`.

### Frontend Checks

Run the frontend test suite, TypeScript check, and production build from the repository root:

```bash
npm test
npm run typecheck
npm run build
```

---

## 🔐 Security Considerations

- Store provider keys and `RAG_API_TOKEN` in environment variables or hosting-provider secret settings.
- Never commit `.env`, OpenAI keys, Qdrant keys, or API tokens to GitHub.
- Do not add `OPENAI_API_KEY` or Qdrant credentials to Vercel. They belong only in the Python API environment.
- Use the same private `RAG_API_TOKEN` on Render and Vercel.
- The Next.js server-side proxy keeps the shared token out of browser JavaScript.
- FastAPI query and upload endpoints require Bearer-token authentication.
- The HTTP-only browser cookie provides owner-scoped document retrieval; it is not full account authentication or an identity-verification system.
- Best-effort proxy rate limits are in-memory and may reset across serverless instances. They are not durable quotas.
- Use HTTPS for deployed service communication, monitor provider usage, and avoid uploading sensitive documents to the demo.
- Rotate any key that has been exposed and update it directly in the relevant hosting-provider dashboard.

---

## 🚀 Deployment

The deployed architecture uses Vercel for the web interface, Render for the Python API, and Qdrant Cloud for persistent vector storage.

### Local Development

```powershell
# Run FastAPI with auto-reload
.\.venv\Scripts\python.exe -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# In a separate terminal, start Next.js
npm run dev
```

### Production Deployment

#### 1. Configure Qdrant Cloud

1. Create a Qdrant Cloud cluster and API key.
2. Copy the cluster HTTPS URL.
3. Keep both the URL and key private; the API creates its collection on the first upload.

#### 2. Deploy the FastAPI service on Render

1. Create a Render Blueprint from `udit3103/Adaptive-Rag`; Render reads [`render.yaml`](render.yaml).
2. Set these Render environment variables:
   - `OPENAI_API_KEY`
   - `RAG_API_TOKEN`
   - `QDRANT_URL`
   - `QDRANT_API_KEY`
   - `TAVILY_API_KEY` (optional)
3. Use a long random `RAG_API_TOKEN`. Keep it available so the same value can be configured in Vercel.
4. Wait for the service to show **Live** and verify the `/` health endpoint.

#### 3. Configure and deploy the Next.js app on Vercel

1. Import the GitHub repository `udit3103/Adaptive-Rag`.
2. Set the project root directory to `./` and use the Next.js framework preset.
3. Add the following Vercel project environment variables for Production (and Preview if needed):

   | Variable | Value |
   | --- | --- |
   | `RAG_API_URL` | Your Render service URL, such as `https://adaptive-rag-api.onrender.com` |
   | `RAG_API_TOKEN` | Exactly the same private token configured on Render |

4. Save the variables and deploy or redeploy the Vercel project.
5. Open the Vercel production URL and try a question.

Do not add `OPENAI_API_KEY`, `QDRANT_URL`, or `QDRANT_API_KEY` to Vercel. Those values are only for the FastAPI service.

### Docker Support (Optional)

This repository currently deploys the Next.js and FastAPI services separately using Vercel and Render. No Dockerfile or Docker Compose deployment is included.

---

## 📊 Performance and Service Limitations

- **Document chunking:** Uses 1,000-character chunks with 150 characters of overlap.
- **Embedding model:** OpenAI `text-embedding-3-small` produces 1,536-dimensional vectors.
- **Persistent retrieval:** Qdrant stores indexed chunks across FastAPI restarts.
- **Chat history:** In-memory history resets when the API restarts; MongoDB is an optional alternative.
- **Render free service:** May spin down during inactivity, so the first request can be delayed.
- **OpenAI quota:** Chat responses and document indexing both depend on OpenAI API access and billing. A ChatGPT subscription does not include API credits. An `insufficient_quota` response means the API account needs billing/credits or its limits adjusted.
- **Rate limits:** The Next.js proxy has best-effort, per-process limits of 20 queries per minute and 3 uploads per hour; these are not durable distributed quotas.
- **PDF extraction:** Text extraction works on PDFs with embedded text. Scanned documents need OCR, which is not included.
- **Provider costs:** OpenAI, Tavily, Qdrant, and hosting usage may incur charges. Monitor each provider account.

---

## 🤝 Contributing

Contributions are welcome. Please:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/YourFeature`).
3. Follow the repository's code conventions and keep secrets out of changes.
4. Add or update focused tests and documentation where appropriate.
5. Run the frontend checks and relevant Python checks.
6. Open a pull request describing the change.

### Code Quality

- Follow the existing Python and TypeScript conventions.
- Keep API secrets and local `.env` files out of commits.
- Add tests for new behavior.
- Update directly related deployment or setup documentation.
- Run `npm test`, `npm run typecheck`, and `npm run build` for frontend changes.

---

## 📚 Technology Stack

| Component | Technology | Usage |
|-----------|-----------|-------|
| **Web interface** | Next.js 16 / React 19 | Browser UI and server-side API proxy |
| **API framework** | FastAPI | Python query and document-upload endpoints |
| **ASGI server** | Uvicorn | Runs the FastAPI application |
| **Workflow orchestration** | LangGraph | Adaptive query and retrieval workflow |
| **LLM integration** | LangChain OpenAI | Chat and embedding model access |
| **Chat model** | OpenAI `gpt-4o` | Classification, responses, workflow prompts |
| **Embedding model** | OpenAI `text-embedding-3-small` | Document chunk embeddings |
| **Vector database** | Qdrant Cloud | Persistent document vector storage |
| **Web search** | Tavily | Optional real-time search route |
| **Chat-history storage** | In-memory / MongoDB | Volatile default or optional durable history |
| **Document processing** | LangChain Community / PyPDF | PDF and TXT loading and splitting |
| **Data validation** | Pydantic | API request and workflow schemas |
| **Web hosting** | Vercel | Next.js web interface |
| **API hosting** | Render | FastAPI backend |

---

## 📝 Documentation References

- [Qdrant setup guide](QDRANT_SETUP_GUIDE.md) - Create a Qdrant Cloud cluster and configure the API.
- [Document upload flow](DOCUMENT_UPLOAD_FLOW.md) - Upload, chunking, indexing, and retrieval details.
- [Document flow visual](DOCUMENT_FLOW_VISUAL.md) - Diagrams for the document flow.
- [Quick reference](QUICK_REFERENCE.md) - Common local commands.
- [Code style guide](CODE_STYLE_GUIDE.md) - Repository coding conventions.
- [Documentation index](DOCUMENTATION_INDEX.md) - Documentation navigation.

---

## ❓ FAQ

**Q: Where do I configure the OpenAI key?**

A: Configure `OPENAI_API_KEY` in Render's environment settings for the Python API. Do not add it to Vercel or GitHub.

**Q: Where do I configure the Qdrant API key?**

A: Configure `QDRANT_API_KEY` and `QDRANT_URL` in the Render API service environment. Neither value belongs in browser code.

**Q: What is `RAG_API_TOKEN`?**

A: It is a private shared secret between the Next.js proxy on Vercel and the FastAPI service on Render. Set the exact same value in both provider dashboards.

**Q: Do I need a Qdrant collection before uploading?**

A: No. The API creates the configured collection when the first document is successfully indexed.

**Q: How many documents can I upload?**

A: Upload PDF or TXT files up to 4 MB through the deployed web interface. Each upload is indexed in the shared Qdrant collection with browser-owner metadata.

**Q: Does chat history persist after the API restarts?**

A: Not by default. In-memory chat history is cleared when the API restarts. Configure MongoDB if durable chat history is needed.

**Q: Can I use the app without Tavily?**

A: Yes. `TAVILY_API_KEY` is optional; web-search routing needs it, while document retrieval and general answers do not.

**Q: Why does the app report `insufficient_quota`?**

A: The OpenAI API account has no available API credits or has reached a usage limit. Check API billing and limits at <https://platform.openai.com/settings/organization/billing/>. ChatGPT subscriptions do not supply API credits.

**Q: Why can the first request be slow?**

A: Render's free API service may spin down while idle; it can take time to wake when the next request arrives.

**Q: Does the app have full user accounts?**

A: No. The demo scopes document retrieval to a browser cookie, but it does not provide user login or production-grade authentication.

---

## 💬 Support & Contact

For issues, questions, or suggestions:

- Open an [issue in the project repository](https://github.com/udit3103/Adaptive-Rag/issues).
- Check the linked setup and flow documentation.
- Include relevant error text, but never include API keys, Qdrant credentials, or `RAG_API_TOKEN`.

---

## 🙏 Acknowledgments

- Built with LangChain and LangGraph.
- Persistent vector search powered by Qdrant.
- Language models and embeddings provided by OpenAI.
- Optional web search provided by Tavily.
- Web interface built with Next.js and React.
- Thanks to the open-source community.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Udit Tiwari**

- GitHub: [@udit3103](https://github.com/udit3103)
- Project: [Adaptive RAG](https://github.com/udit3103/Adaptive-Rag)
- Live demo: <https://adaptive-rag-orcin.vercel.app/>

---

## 📈 Project Status

- ✅ Adaptive query-routing workflow implemented.
- ✅ PDF/TXT upload, chunking, and Qdrant indexing implemented.
- ✅ Browser-owner-scoped document retrieval implemented.
- ✅ Next.js frontend deployed on Vercel.
- ✅ FastAPI service deployed on Render.
- ✅ OpenAI and Qdrant credentials are configured on the API service.
- ⚠️ Live AI requests require available OpenAI API billing/credits.
- ⚠️ Chat history is in-memory unless MongoDB is configured.

---

## 🗺️ Roadmap

- [ ] Add production-grade user authentication and authorization.
- [ ] Add durable rate limiting and usage controls.
- [ ] Add document management and deletion controls.
- [ ] Add OCR support for scanned PDF documents.
- [ ] Add additional LLM provider options.
- [ ] Improve long-running task and upload progress reporting.
- [ ] Add expanded integration and end-to-end test coverage.

---

**Last Updated:** October 17, 2026

**Status:** Deployed demo; OpenAI API credits are required for chat and embedding requests.

**Documentation:** Deployment-specific setup and API behavior documented above.
