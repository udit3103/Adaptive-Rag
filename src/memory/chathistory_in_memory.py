"""
In-memory chat history storage.
"""

from langchain_core.messages import BaseMessage


class InMemoryChatMessageHistory:
    """Async-compatible history for a single in-memory session."""

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.messages: list[BaseMessage] = []

    async def add_message(self, message: BaseMessage) -> None:
        """Store a message for this session."""
        self.messages.append(message)

    async def get_messages(self) -> list[BaseMessage]:
        """Return this session's messages in order."""
        return list(self.messages)

    async def clear(self) -> None:
        """Remove all messages for this session."""
        self.messages.clear()


class ChatInMemoryHistory:
    """Factory for in-memory chat histories."""

    store: dict[str, InMemoryChatMessageHistory] = {}

    @classmethod
    def get_session_history(
        cls,
        session_id: str,
        config: dict | None = None,
    ) -> InMemoryChatMessageHistory:
        """Get or create an in-memory history for a session."""
        if session_id not in cls.store:
            cls.store[session_id] = InMemoryChatMessageHistory(session_id)
        return cls.store[session_id]

    @classmethod
    def clear_history(cls, session_id: str) -> None:
        """Delete a session's in-memory history."""
        cls.store.pop(session_id, None)
