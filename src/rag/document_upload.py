"""
Document upload and processing module.
"""

import os
import tempfile
from pathlib import Path

from fastapi import File, HTTPException, UploadFile
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from src.core.config import settings
from src.rag.retriever_setup import retriever_chain


def documents(description: str, file: UploadFile = File(...), owner_id: str = ""):
    """
    Process and upload a document for RAG.

    Validates file type, loads content, enhances description, chunks documents,
    and stores them in the vector database.

    Args:
        description: User-provided document description.
        file: The uploaded file (PDF or TXT).

    Returns:
        Boolean indicating success of the upload process.

    Raises:
        HTTPException: If file type is not supported or loading fails.
    """
    filename = file.filename
    if not filename or Path(filename).suffix.lower() not in {".pdf", ".txt"}:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and TXT files are supported"
        )

    file_bytes = file.file.read()

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=Path(filename).suffix.lower()
    ) as tmp_file:
        tmp_file.write(file_bytes)
        tmp_path = tmp_file.name

    if Path(filename).suffix.lower() == ".pdf":
        loader = PyPDFLoader(tmp_path)
    else:
        loader = TextLoader(tmp_path, encoding="utf-8")

    try:
        docs = loader.load()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading file: {e}"
        )
    finally:
        os.unlink(tmp_path)

    # Split documents into chunks
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150
    )
    chunks = splitter.split_documents(docs)
    for chunk in chunks:
        chunk.metadata["description"] = description.strip()

    if not settings.QDRANT_URL:
        raise HTTPException(
            status_code=503,
            detail="Document indexing is unavailable: configure QDRANT_URL.",
        )
    return retriever_chain(chunks, owner_id)
