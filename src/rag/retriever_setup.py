"""
Retriever setup and in-memory FAISS vector store configuration.
"""

from langchain_community.vectorstores import FAISS
from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from langchain_core.tools import create_retriever_tool
from langchain_openai import OpenAIEmbeddings

_faiss_vectorstore: FAISS | None = None
_embeddings: OpenAIEmbeddings | None = None


def _get_embeddings() -> OpenAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = OpenAIEmbeddings()
    return _embeddings


class _FAISSRetriever(BaseRetriever):
    """Retriever that starts empty and uses the current in-memory FAISS index."""

    def _get_relevant_documents(
        self,
        query: str,
        *,
        run_manager: CallbackManagerForRetrieverRun,
    ) -> list[Document]:
        if _faiss_vectorstore is None:
            return []
        return _faiss_vectorstore.similarity_search(query)


def retriever_chain(chunks: list[Document]) -> bool:
    """
    Add document chunks to the in-memory FAISS index.

    Args:
        chunks: Document chunks to index.

    Returns:
        True when all chunks have been indexed.
    """
    global _faiss_vectorstore

    if not chunks:
        raise ValueError("The uploaded document did not contain any text to index.")

    if _faiss_vectorstore is None:
        _faiss_vectorstore = FAISS.from_documents(chunks, _get_embeddings())
    else:
        _faiss_vectorstore.add_documents(chunks)
    return True


def get_retriever():
    """
    Create a retriever tool backed by the current FAISS index.

    The retriever is empty until the first document is uploaded, avoiding
    embedding requests during API startup.
    """
    return create_retriever_tool(
        _FAISSRetriever(),
        "retriever_customer_uploaded_documents",
        "Use this tool only to answer questions about documents uploaded by the user.",
    )
