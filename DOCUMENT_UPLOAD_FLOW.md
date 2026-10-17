# Document Upload and Retrieval

The application accepts PDF and TXT uploads through the web app or `POST /rag/documents/upload`. Include a short document description and the browser owner ID in the API headers.

## Ingestion

1. The API validates the filename extension and loads the document.
2. The text is split into overlapping chunks (1,000 characters with 150 characters of overlap).
3. The supplied description and the browser's owner ID are attached to each chunk as metadata.
4. OpenAI embeddings are created and the chunks are added to the persistent Qdrant collection.
5. Later requests search only chunks matching that browser's owner ID through the LangGraph workflow.

The Qdrant collection is created on the first successful upload. API startup does not make an embedding request or initialize a placeholder index. Additional uploads are added to the existing collection.

## Storage and limits

- Qdrant vectors persist independently of API restarts.
- The Next.js proxy uses an HTTP-only browser cookie to keep each browser's documents isolated from other browsers.
- Chat history is also in memory by default. MongoDB chat history is optional and configured through `CHAT_HISTORY_BACKEND` and `MONGODB_URL`.
- PDF extraction quality depends on the PDF containing extractable text; scanned pages may require OCR, which is not included.

## Example

```powershell
curl.exe -X POST http://127.0.0.1:8000/rag/documents/upload `
  -H "X-Description: Python programming guide" `
  -F "file=@python_guide.pdf"
```

The OpenAI API key must be configured before uploading because indexing requires embeddings. See [README.md](README.md) for installation and configuration instructions.
