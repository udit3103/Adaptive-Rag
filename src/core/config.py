"""
Core configuration and environment settings.
"""

import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    TAVILY_API_KEY: str = os.getenv("TAVILY_API_KEY", "")
    RAG_API_TOKEN: str = os.getenv("RAG_API_TOKEN", "")
    QDRANT_URL: str = os.getenv("QDRANT_URL", "")
    QDRANT_API_KEY: str = os.getenv("QDRANT_API_KEY", "")
    QDRANT_COLLECTION: str = os.getenv(
        "QDRANT_COLLECTION", "adaptive-rag-documents"
    )
    CHAT_HISTORY_BACKEND: str = os.getenv("CHAT_HISTORY_BACKEND", "memory").lower()
    MONGODB_URL: str = os.getenv("MONGODB_URL", "")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "adaptive_rag")


settings = Settings()
