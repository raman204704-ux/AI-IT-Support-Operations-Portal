import datetime
import random
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Ticket, Conversation, ConversationStatus, TicketStatus, TicketPriority
from app.schemas import TicketCreate, TicketResponse
from app.auth import get_current_user

router = APIRouter(prefix="/tickets", tags=["Tickets"])


def generate_ticket_number() -> str:
    """Generates an intuitive, readable ticket number like TICK-2026-7841."""
    year = datetime.datetime.utcnow().year
    rand = random.randint(1000, 9999)
    return f"TICK-{year}-{rand}"


@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    ticket_in: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Creates an IT support ticket raised by an employee when the chatbot solution didn't resolve the issue.
    Maintains full linked conversation context for the IT department!
    """
    # Verify linked conversation if provided
    if ticket_in.conversation_id:
        conv = (
            db.query(Conversation)
            .filter(
                Conversation.id == ticket_in.conversation_id,
                Conversation.user_id == current_user.id,
            )
            .first()
        )
        if conv:
            conv.status = ConversationStatus.TICKET_RAISED.value
            db.commit()

    # Priority normalization
    pri = ticket_in.priority.upper() if ticket_in.priority else TicketPriority.MEDIUM.value
    if pri not in [p.value for p in TicketPriority]:
        pri = TicketPriority.MEDIUM.value

    ticket = Ticket(
        ticket_number=generate_ticket_number(),
        user_id=current_user.id,
        conversation_id=ticket_in.conversation_id,
        title=ticket_in.title.strip(),
        description=ticket_in.description.strip(),
        category=ticket_in.category or "General",
        priority=pri,
        status=TicketStatus.OPEN.value,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return TicketResponse(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        user_id=ticket.user_id,
        conversation_id=ticket.conversation_id,
        title=ticket.title,
        description=ticket.description,
        category=ticket.category,
        priority=ticket.priority,
        status=ticket.status,
        resolution_notes=ticket.resolution_notes,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        user_name=current_user.full_name,
        user_email=current_user.email,
        user_department=current_user.department,
    )


@router.get("", response_model=List[TicketResponse])
def get_user_tickets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns list of tickets created by the current employee."""
    tickets = (
        db.query(Ticket)
        .filter(Ticket.user_id == current_user.id)
        .order_by(Ticket.created_at.desc())
        .all()
    )

    results = []
    for t in tickets:
        results.append(
            TicketResponse(
                id=t.id,
                ticket_number=t.ticket_number,
                user_id=t.user_id,
                conversation_id=t.conversation_id,
                title=t.title,
                description=t.description,
                category=t.category,
                priority=t.priority,
                status=t.status,
                resolution_notes=t.resolution_notes,
                created_at=t.created_at,
                updated_at=t.updated_at,
                user_name=current_user.full_name,
                user_email=current_user.email,
                user_department=current_user.department,
            )
        )
    return results


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket_detail(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves single ticket detail for employee."""
    ticket = (
        db.query(Ticket)
        .filter(Ticket.id == ticket_id, Ticket.user_id == current_user.id)
        .first()
    )
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    return TicketResponse(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        user_id=ticket.user_id,
        conversation_id=ticket.conversation_id,
        title=ticket.title,
        description=ticket.description,
        category=ticket.category,
        priority=ticket.priority,
        status=ticket.status,
        resolution_notes=ticket.resolution_notes,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        user_name=current_user.full_name,
        user_email=current_user.email,
        user_department=current_user.department,
    )
