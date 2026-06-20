from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.chat import ChatMessage, Conversation


class ChatRepository:
    def create_conversation(self, db: Session, title: str = "Research chat") -> Conversation:
        convo = Conversation(title=title)
        db.add(convo)
        db.commit()
        db.refresh(convo)
        return convo

    def get_conversation(self, db: Session, conversation_id: str) -> Conversation | None:
        return db.get(Conversation, conversation_id)

    def add_message(
        self,
        db: Session,
        conversation_id: str,
        role: str,
        question: str | None = None,
        answer: str | None = None,
        retrieved_chunks_json: str = "[]",
        document_ids_json: str = "[]",
        confidence: str = "medium",
    ) -> ChatMessage:
        msg = ChatMessage(
            conversation_id=conversation_id,
            role=role,
            question=question,
            answer=answer,
            retrieved_chunks_json=retrieved_chunks_json,
            document_ids_json=document_ids_json,
            confidence=confidence,
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        return msg

    def list_messages(self, db: Session, conversation_id: str) -> list[ChatMessage]:
        stmt = select(ChatMessage).where(ChatMessage.conversation_id == conversation_id).order_by(ChatMessage.created_at.asc())
        return list(db.scalars(stmt).all())
