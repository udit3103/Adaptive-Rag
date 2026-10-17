"""
Chat history storage using MongoDB backend.
"""

from datetime import datetime
from typing import List

from langchain_core.messages import BaseMessage

from src.core.config import settings
from src.memory.chathistory_in_memory import (
    ChatInMemoryHistory,
    InMemoryChatMessageHistory,
)


class MongoDBChatMessageHistory:
    """Chat history backed by MongoDB."""

    def __init__(self, session_id: str):
        """
        Initialize chat history for a session.

        Args:
            session_id: Unique session identifier.
        """
        self.session_id = session_id
        from src.db.mongo_client import db

        self.collection = db["chat_history"]

    async def add_message(self, message: BaseMessage) -> None:
        """
        Save a message to MongoDB.

        Args:
            message: The message to save.
        """
        await self.collection.insert_one({
            "session_id": self.session_id,
            "type": message.type,
            "content": message.content,
            "additional_kwargs": message.additional_kwargs,
            "timestamp": datetime.utcnow(),
        })

    async def get_messages(self) -> List[BaseMessage]:
        """
        Load all messages for a session from MongoDB.

        Returns:
            List of messages in chronological order.
        """
        from langchain_core.messages import messages_from_dict

        cursor = self.collection.find({"session_id": self.session_id}).sort("timestamp", 1)
        docs = await cursor.to_list(length=1000)

        # Convert to BaseMessage objects
        return messages_from_dict([
            {
                "type": d["type"],
                "data": {
                    "content": d["content"],
                    "additional_kwargs": d.get("additional_kwargs", {}),
                }
            }
            for d in docs
        ])

    async def clear(self) -> None:
        """Delete all messages for a session."""
        await self.collection.delete_many({"session_id": self.session_id})


class ChatHistory:
    """Factory for the configured chat history backend."""

    @classmethod
    def get_session_history(
        cls,
        session_id: str,
        config: dict = None
    ) -> InMemoryChatMessageHistory | MongoDBChatMessageHistory:
        """
        Get or create chat history for a session.

        Args:
            session_id: Unique session identifier.
            config: Optional configuration dictionary.

        Returns:
            History instance matching the configured backend.
        """
        if settings.CHAT_HISTORY_BACKEND == "memory":
            return ChatInMemoryHistory.get_session_history(session_id)
        if settings.CHAT_HISTORY_BACKEND == "mongodb":
            if not settings.MONGODB_URL:
                raise ValueError(
                    "MONGODB_URL must be set when CHAT_HISTORY_BACKEND=mongodb"
                )
            return MongoDBChatMessageHistory(session_id)
        raise ValueError(
            "CHAT_HISTORY_BACKEND must be either 'memory' or 'mongodb'"
        )
