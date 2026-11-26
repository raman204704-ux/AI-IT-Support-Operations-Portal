import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Conversation, Message, ConversationStatus
from app.schemas import (
    ChatRequest,
    ChatResponse,
    SolutionFeedbackRequest,
    ConversationSummary,
    ConversationDetail,
)
from app.auth import get_current_user
from app.workflow.graph import run_support_workflow

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
def send_chat_message(
    chat_in: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Primary endpoint for Employee AI IT Support Chat:
    1. Finds or creates a conversation.
    2. Saves employee's question.
    3. Triggers LangGraph Groq LLM workflow (Query Processing -> Generation -> Save).
    4. Returns troubleshooting steps.
    """
    conv = None
    if chat_in.conversation_id:
        conv = (
            db.query(Conversation)
            .filter(
                Conversation.id == chat_in.conversation_id,
                Conversation.user_id == current_user.id,
            )
            .first()
        )
        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied.",
            )
    else:
        short_title = (
            chat_in.message[:45] + "..."
            if len(chat_in.message) > 45
            else chat_in.message
        )
        conv = Conversation(
            user_id=current_user.id,
            title=short_title or "New IT Support Chat",
            status=ConversationStatus.ACTIVE.value,
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

    user_msg = Message(
        conversation_id=conv.id,
        sender="user",
        content=chat_in.message.strip(),
    )
    db.add(user_msg)
    conv.updated_at = datetime.datetime.utcnow()
    db.commit()

    past_msgs = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc())
        .all()
    )
    history = [{"sender": m.sender, "content": m.content} for m in past_msgs[:-1]]

    final_state = run_support_workflow(
        db=db,
        user_id=current_user.id,
        conversation_id=conv.id,
        query=chat_in.message.strip(),
        history=history,
    )

    return ChatResponse(
        conversation_id=conv.id,
        message_id=final_state.get("saved_message_id", 0),
        content=final_state.get("response_content", ""),
        troubleshooting_steps=final_state.get("troubleshooting_steps"),
        suggest_ticket=True,
    )


@router.post("/feedback")
def submit_solution_feedback(
    feedback: SolutionFeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Handles employee feedback:
    - 'Yes, problem solved' -> marks conversation resolved.
    - 'No, problem still exists' -> marks ticket recommended.
    """
    conv = (
        db.query(Conversation)
        .filter(
            Conversation.id == feedback.conversation_id,
            Conversation.user_id == current_user.id,
        )
        .first()
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    if feedback.resolved:
        conv.is_resolved = True
        conv.status = ConversationStatus.RESOLVED.value
        conv.resolved_at = datetime.datetime.utcnow()
        db.commit()
        return {
            "success": True,
            "message": "Thank you! We're glad your IT issue was resolved.",
            "is_resolved": True,
            "suggest_ticket": False,
        }
    else:
        conv.is_resolved = False
        db.commit()
        return {
            "success": True,
            "message": "We apologize that the issue persists. You can raise an IT support ticket below.",
            "is_resolved": False,
            "suggest_ticket": True,
        }


@router.get("/conversations", response_model=List[ConversationSummary])
def get_user_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns list of all conversations for the logged in employee."""
    convs = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )

    results = []
    for c in convs:
        results.append(
            ConversationSummary(
                id=c.id,
                title=c.title,
                status=c.status,
                is_resolved=c.is_resolved,
                created_at=c.created_at,
                updated_at=c.updated_at,
                message_count=len(c.messages),
                user_id=c.user_id,
                user_name=current_user.full_name,
                user_email=current_user.email,
                user_department=current_user.department,
            )
        )
    return results


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation_detail(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves full conversation history and messages."""
    conv = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
        .first()
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return ConversationDetail(
        id=conv.id,
        user_id=conv.user_id,
        title=conv.title,
        status=conv.status,
        is_resolved=conv.is_resolved,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=conv.messages,
        user_name=current_user.full_name,
        user_email=current_user.email,
    )


@router.post("/conversations", response_model=ConversationDetail)
def create_new_conversation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Initializes a new blank conversation session."""
    conv = Conversation(
        user_id=current_user.id,
        title="New IT Support Chat",
        status=ConversationStatus.ACTIVE.value,
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    return ConversationDetail(
        id=conv.id,
        user_id=conv.user_id,
        title=conv.title,
        status=conv.status,
        is_resolved=conv.is_resolved,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[],
        user_name=current_user.full_name,
        user_email=current_user.email,
    )


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deletes an employee's conversation."""
    conv = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
        .first()
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    db.delete(conv)
    db.commit()
    return {"success": True, "message": "Conversation deleted successfully."}
