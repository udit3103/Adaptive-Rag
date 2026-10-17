# Qdrant Cloud Setup

The deployed app uses Qdrant as persistent vector storage. The API creates the collection on the first successful upload; you do not need to create a collection manually.

## Create a Qdrant Cloud cluster

1. Create an account at <https://cloud.qdrant.io/>.
2. Create a cluster and wait until it is ready.
3. Copy the HTTPS cluster URL and create an API key with access to that cluster.
4. Store both values securely. Do not commit either value to GitHub.

## Configure the API service

Set these environment variables in Render (or in your local `.env` file):

```env
QDRANT_URL=https://your-cluster-id.region.aws.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION=adaptive-rag-documents
```

The embedding model is OpenAI `text-embedding-3-small` (1,536 dimensions). The API creates the collection with cosine-distance search when the first document is indexed.

## Verify

Deploy/restart the API, open the web app, and upload a small PDF or TXT file. The API must also have `OPENAI_API_KEY`, `RAG_API_TOKEN`, and the matching service configuration described in [README.md](README.md).

Uploaded chunks are filtered by a secure, HTTP-only browser owner cookie. Qdrant persists vectors after API restarts. Chat history remains in memory unless MongoDB is configured.
