"""
Retriever setup and persistent Qdrant vector store configuration.
"""

from contextvars import ContextVar
from threading import Lock

from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from langchain_core.tools import create_retriever_tool
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient, models

from src.core.config import settings

EMBEDDING_DIMENSIONS = 1536
_initialization_lock = Lock()
_qdrant_client: QdrantClient | None = None
_qdrant_vectorstore: QdrantVectorStore | None = None
_embeddings: OpenAIEmbeddings | None = None
current_user_id: ContextVar[str | None] = ContextVar(
    "current_user_id",
    default=None,
)


def _get_embeddings() -> OpenAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    return _embeddings


def _get_vectorstore(*, create_if_missing: bool) -> QdrantVectorStore | None:
    global _qdrant_client, _qdrant_vectorstore

    if not settings.QDRANT_URL:
        return None
    if _qdrant_vectorstore is not None:
        return _qdrant_vectorstore

    with _initialization_lock:
        if _qdrant_vectorstore is not None:
            return _qdrant_vectorstore

        if _qdrant_client is None:
            _qdrant_client = QdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY or None,
            )

        collection_exists = _qdrant_client.collection_exists(
            collection_name=settings.QDRANT_COLLECTION
        )
        if not collection_exists and not create_if_missing:
            return None
        if not collection_exists:
            _qdrant_client.create_collection(
                collection_name=settings.QDRANT_COLLECTION,
                vectors_config=models.VectorParams(
                    size=EMBEDDING_DIMENSIONS,
                    distance=models.Distance.COSINE,
                ),
            )

        _qdrant_vectorstore = QdrantVectorStore(
            client=_qdrant_client,
            collection_name=settings.QDRANT_COLLECTION,
            embedding=_get_embeddings(),
        )
        return _qdrant_vectorstore


class _QdrantRetriever(BaseRetriever):
    """Retriever backed by the configured persistent Qdrant collection."""

    def _get_relevant_documents(
        self,
        query: str,
        *,
        run_manager: CallbackManagerForRetrieverRun,
    ) -> list[Document]:
        vectorstore = _get_vectorstore(create_if_missing=False)
        owner_id = current_user_id.get()
        if vectorstore is None or owner_id is None:
            return []
        owner_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="metadata.owner_id",
                    match=models.MatchValue(value=owner_id),
                )
            ]
        )
        return vectorstore.similarity_search(query, filter=owner_filter)


def retriever_chain(chunks: list[Document], owner_id: str) -> bool:
    """
    Add document chunks to the persistent Qdrant collection.

    Args:
        chunks: Document chunks to index.

    Returns:
        True when all chunks have been indexed.
    """
    if not chunks:
        raise ValueError("The uploaded document did not contain any text to index.")
    if not owner_id:
        raise ValueError("An owner ID is required to index documents.")
    for chunk in chunks:
        chunk.metadata["owner_id"] = owner_id

    vectorstore = _get_vectorstore(create_if_missing=True)
    if vectorstore is None:
        raise RuntimeError("QDRANT_URL must be configured before indexing documents.")
    vectorstore.add_documents(chunks)
    return True


def get_retriever():
    """
    Create a retriever tool backed by the configured Qdrant collection.

    The collection is created on the first document upload, avoiding a database
    connection or embedding request during API startup.
    """
    return create_retriever_tool(
        _QdrantRetriever(),
        "retriever_customer_uploaded_documents",
        "Use this tool only to answer questions about documents uploaded by the user.",
    )
