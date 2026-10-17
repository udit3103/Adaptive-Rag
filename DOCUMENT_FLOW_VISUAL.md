# Document Flow

```text
                    Next.js web UI
                        |
                        | multipart PDF/TXT + X-Description
                        v
               FastAPI document endpoint
                        |
           Validate extension and load text
                        |
                        v
            Split into overlapping chunks
                        |
              Create OpenAI embeddings
                        |
                        v
           Add owner-scoped chunks to Qdrant
                        |
                        | query/session_id + HTTP-only owner cookie
                        v
                 FastAPI query endpoint
                        |
           LangGraph routes the question
             /              |             \
            v               v              v
     Filtered Qdrant   General LLM     Tavily search
            \               |              /
             \              |             /
                        v
                  Answer to chat UI
```

The Qdrant collection is created on first upload and persists independently of the API process. Retrieval is filtered to the browser's HTTP-only owner cookie. Default in-memory chat history is lost when the API process restarts.
