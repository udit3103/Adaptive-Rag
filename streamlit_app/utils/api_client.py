"""
API client for communicating with the FastAPI backend.
"""

import os

import requests
from dotenv import load_dotenv

load_dotenv()

API_BASE_URL = os.getenv("RAG_API_URL", "http://127.0.0.1:8000").rstrip("/")
API_TOKEN = os.getenv("RAG_API_TOKEN", "")
REQUEST_TIMEOUT = 120


def _auth_headers() -> dict[str, str]:
    """Return the configured API authentication header."""
    return {"Authorization": f"Bearer {API_TOKEN}"} if API_TOKEN else {}


def query_backend(query: str, session_id: str) -> str:
    """Send a query and return the backend's answer text."""
    response = requests.post(
        f"{API_BASE_URL}/rag/query",
        json={"query": query, "session_id": session_id, "user_id": session_id},
        headers=_auth_headers(),
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()
    return response.json()["result"]["content"]


def document_upload_rag(file, description: str, user_id: str) -> None:
    """Upload a PDF or TXT file and raise when the backend rejects it."""
    response = requests.post(
        f"{API_BASE_URL}/rag/documents/upload",
        files={"file": (file.name, file, file.type)},
        headers={
            **_auth_headers(),
            "X-Description": description,
            "X-User-ID": user_id,
        },
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()
    if not response.json().get("status"):
        raise RuntimeError("The API did not index the uploaded document.")
