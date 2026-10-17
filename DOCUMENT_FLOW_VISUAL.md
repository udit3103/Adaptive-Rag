# Document Flow

```text
                    Streamlit UI
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
           Add chunks to in-memory FAISS
                        |
                        | query/session_id
                        v
                 FastAPI query endpoint
                        |
           LangGraph routes the question
             /              |             \
            v               v              v
     FAISS retrieval   General LLM     Tavily search
            \               |              /
             \              |             /
                        v
                  Answer to chat UI
```

The FAISS index is empty until a document is uploaded. Subsequent uploads add chunks to the existing index. The index and default in-memory chat history are lost when the API process restarts.
