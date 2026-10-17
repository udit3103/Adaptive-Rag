"""
API routes for RAG operations.
"""

import secrets

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from langchain_core.messages import HumanMessage, AIMessage
from openai import RateLimitError
from starlette.concurrency import run_in_threadpool

from src.core.config import settings
from src.memory.chat_history_mongo import ChatHistory
from src.models.query_request import QueryRequest
from src.rag.document_upload import documents
from src.rag.graph_builder import builder
from src.rag.retriever_setup import current_user_id

router = APIRouter()


async def require_api_token(
    authorization: str | None = Header(default=None),
) -> None:
    """Require the shared secret used by the Next.js server-side proxy."""
    if not settings.RAG_API_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="RAG_API_TOKEN is not configured on the API service.",
        )
    expected = f"Bearer {settings.RAG_API_TOKEN}"
    if authorization is None or not secrets.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Invalid API credentials.")


@router.post("/rag/query", dependencies=[Depends(require_api_token)])
async def rag_query(req: QueryRequest):
    """
    Process a RAG query and return the result.

    Args:
        req: The query request containing query text and session_id.

    Returns:
        The generated response from the RAG pipeline.
    """
    chat_history = ChatHistory.get_session_history(req.session_id)
    await chat_history.add_message(HumanMessage(content=req.query))

    messages = await chat_history.get_messages()
    owner_token = current_user_id.set(req.user_id or req.session_id)
    try:
        try:
            result = await run_in_threadpool(builder.invoke, {"messages": messages})
        except RateLimitError as exc:
            raise HTTPException(
                status_code=503,
                detail=(
                    "OpenAI API credits are exhausted or the account is rate-limited. "
                    "Check API billing and limits, then try again."
                ),
            ) from exc
    finally:
        current_user_id.reset(owner_token)
    output_text = result["messages"][-1].content

    # Save assistant message
    await chat_history.add_message(AIMessage(content=output_text))

    return {"result": result["messages"][-1]}


@router.post(
    "/rag/documents/upload",
    dependencies=[Depends(require_api_token)],
)
async def upload_file(
    file: UploadFile = File(...),
    description: str = Header(..., alias="X-Description"),
    owner_id: str = Header(..., alias="X-User-ID"),
):
    """
    Upload a document for RAG processing.

    Args:
        file: The file to upload (PDF or TXT).
        description: Document description provided via header.

    Returns:
        Upload status.
    """
    try:
        status_upload = await run_in_threadpool(
            documents, description, file, owner_id
        )
    except RateLimitError as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "OpenAI API credits are exhausted or the account is rate-limited. "
                "Check API billing and limits, then try again."
            ),
        ) from exc
    return {"status": status_upload}
