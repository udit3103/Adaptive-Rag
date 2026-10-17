# Document Upload and Retrieval

The application accepts PDF and TXT uploads through `POST /rag/documents/upload` or the Streamlit sidebar. Include a short document description in the `X-Description` header.

## Ingestion

1. The API validates the filename extension and loads the document.
2. The text is split into overlapping chunks (1,000 characters with 150 characters of overlap).
3. The supplied description is attached to each chunk as metadata.
4. OpenAI embeddings are created and the chunks are added to the process-wide FAISS index.
5. Later requests can retrieve the uploaded content through the LangGraph workflow.

The index is created on the first successful upload. API startup does not make an embedding request or initialize a placeholder index. Additional uploads are added to the existing index.

## Storage and limits

- FAISS vectors and uploaded documents are held in API process memory and are lost when the API restarts.
- A running Streamlit app and API must use the same API process for uploads and retrieval.
- Chat history is also in memory by default. MongoDB chat history is optional and configured through `CHAT_HISTORY_BACKEND` and `MONGODB_URL`.
- PDF extraction quality depends on the PDF containing extractable text; scanned pages may require OCR, which is not included.

## Example

```powershell
curl.exe -X POST http://127.0.0.1:8000/rag/documents/upload `
  -H "X-Description: Python programming guide" `
  -F "file=@python_guide.pdf"
```

The OpenAI API key must be configured before uploading because indexing requires embeddings. See [README.md](README.md) for installation and configuration instructions.
