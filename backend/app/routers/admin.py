import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.database import get_db
from app.models import (
    User,
    UserRole,
    Ticket,
    TicketStatus,
    TicketPriority,
    Conversation,
    ConversationStatus,
    Message,
)
from app.schemas import (
    DashboardStatsResponse,
    RecentActivityItem,
    TicketResponse,
    TicketUpdate,
    TicketBulkAction,
    ConversationSummary,
    ConversationDetail,
    ConversationUpdate,
    MessageResponse,
    UserResponse,
    AdminUserCreate,
    AdminUserUpdate,
    AdminUserDetail,
    BulkActionRequest,
    AIActivityItem,
    PaginatedResponse,
)
from app.auth import require_admin, get_password_hash

router = APIRouter(prefix="/admin", tags=["Admin Portal"])


# =============================================================
# Helper
# =============================================================
def _ticket_to_response(t: Ticket) -> TicketResponse:
    u = t.user
    assigned = t.assigned_to
    return TicketResponse(
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
        assigned_to_admin_id=t.assigned_to_admin_id,
        resolved_by_admin_id=t.resolved_by_admin_id,
        created_at=t.created_at,
        updated_at=t.updated_at,
        user_name=u.full_name if u else "Unknown",
        user_email=u.email if u else "Unknown",
        user_department=u.department if u else "General",
        assigned_to_name=assigned.full_name if assigned else None,
    )


# =============================================================
# 1. Dashboard Statistics
# =============================================================
@router.get("/dashboard/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Returns real metrics for the IT admin dashboard."""
    total_employees = db.query(User).filter(User.role == UserRole.EMPLOYEE.value).count()
    active_users = db.query(User).filter(
        User.role == UserRole.EMPLOYEE.value, User.is_active == True
    ).count()
    total_conversations = db.query(Conversation).count()
    total_tickets = db.query(Ticket).count()
    open_tickets = db.query(Ticket).filter(Ticket.status == TicketStatus.OPEN.value).count()
    in_progress_tickets = db.query(Ticket).filter(Ticket.status == TicketStatus.IN_PROGRESS.value).count()
    resolved_tickets = db.query(Ticket).filter(Ticket.status == TicketStatus.RESOLVED.value).count()
    total_ai_responses = db.query(Message).filter(Message.sender == "assistant").count()

    # Recent activity — last 10 items (tickets + conversations, most recent first)
    recent_tickets = (
        db.query(Ticket).order_by(Ticket.updated_at.desc()).limit(5).all()
    )
    recent_convs = (
        db.query(Conversation).order_by(Conversation.updated_at.desc()).limit(5).all()
    )

    activity: List[RecentActivityItem] = []
    for t in recent_tickets:
        u = t.user
        activity.append(RecentActivityItem(
            type="ticket",
            id=t.id,
            description=f"Ticket #{t.ticket_number}: {t.title}",
            user_name=u.full_name if u else "Unknown",
            timestamp=t.updated_at,
            status=t.status,
        ))
    for c in recent_convs:
        u = c.user
        activity.append(RecentActivityItem(
            type="conversation",
            id=c.id,
            description=c.title,
            user_name=u.full_name if u else "Unknown",
            timestamp=c.updated_at,
            status=c.status,
        ))

    activity.sort(key=lambda x: x.timestamp, reverse=True)
    activity = activity[:10]

    return DashboardStatsResponse(
        total_employees=total_employees,
        active_users=active_users,
        total_conversations=total_conversations,
        total_tickets=total_tickets,
        open_tickets=open_tickets,
        in_progress_tickets=in_progress_tickets,
        resolved_tickets=resolved_tickets,
        total_ai_responses=total_ai_responses,
        recent_activity=activity,
    )


# =============================================================
# 2. User Management
# =============================================================
@router.get("/users", response_model=PaginatedResponse[AdminUserDetail])
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Lists all registered users with pagination, search, and filters."""
    q = db.query(User)
    if search:
        term = f"%{search}%"
        q = q.filter(or_(User.full_name.ilike(term), User.email.ilike(term), User.department.ilike(term)))
    if role:
        q = q.filter(User.role == role.lower())
    if is_active is not None:
        q = q.filter(User.is_active == is_active)

    total = q.count()
    users = q.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for u in users:
        items.append(AdminUserDetail(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            department=u.department,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at,
            conversation_count=len(u.conversations) if u.conversations else 0,
            ticket_count=len(u.tickets) if u.tickets else 0,
        ))

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: AdminUserCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Creates a new user (any role) — admin-only operation."""
    existing = db.query(User).filter(User.email == user_in.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    role_val = UserRole.ADMIN.value if user_in.role.lower() == "admin" else UserRole.EMPLOYEE.value
    user = User(
        email=user_in.email.lower().strip(),
        full_name=user_in.full_name.strip(),
        hashed_password=get_password_hash(user_in.password),
        role=role_val,
        department=user_in.department.strip() or "General",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/users/{user_id}", response_model=AdminUserDetail)
def get_user_detail(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return AdminUserDetail(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        department=user.department,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        conversation_count=len(user.conversations) if user.conversations else 0,
        ticket_count=len(user.tickets) if user.tickets else 0,
    )


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    update_in: AdminUserUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Updates user fields — admin can update name, dept, role, active status, password."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user_id == admin.id and update_in.is_active is False:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account.")
    if user_id == admin.id and update_in.role and update_in.role.lower() != "admin":
        raise HTTPException(status_code=400, detail="You cannot change your own role.")

    if update_in.full_name is not None:
        user.full_name = update_in.full_name.strip()
    if update_in.department is not None:
        user.department = update_in.department.strip() or "General"
    if update_in.role is not None:
        user.role = UserRole.ADMIN.value if update_in.role.lower() == "admin" else UserRole.EMPLOYEE.value
    if update_in.is_active is not None:
        user.is_active = update_in.is_active
    if update_in.password:
        user.hashed_password = get_password_hash(update_in.password)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Permanently deletes a user and all their data."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    db.delete(user)
    db.commit()


@router.post("/users/bulk", status_code=status.HTTP_200_OK)
def bulk_user_action(
    payload: BulkActionRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Bulk activate, deactivate, or delete users."""
    # Never allow operating on self
    ids = [i for i in payload.ids if i != admin.id]
    if not ids:
        return {"affected": 0}

    users = db.query(User).filter(User.id.in_(ids)).all()
    action = payload.action.lower()

    if action == "activate":
        for u in users:
            u.is_active = True
    elif action == "deactivate":
        for u in users:
            u.is_active = False
    elif action == "delete":
        for u in users:
            db.delete(u)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")

    db.commit()
    return {"affected": len(users)}


# =============================================================
# 3. Conversation Management
# =============================================================
@router.get("/conversations", response_model=PaginatedResponse[ConversationSummary])
def list_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    is_resolved: Optional[bool] = Query(None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(Conversation)
    if search:
        term = f"%{search}%"
        q = q.filter(Conversation.title.ilike(term))
    if status_filter and status_filter != "ALL":
        q = q.filter(Conversation.status == status_filter)
    if is_resolved is not None:
        q = q.filter(Conversation.is_resolved == is_resolved)

    total = q.count()
    convs = q.order_by(Conversation.updated_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for c in convs:
        u = c.user
        items.append(ConversationSummary(
            id=c.id,
            title=c.title,
            status=c.status,
            is_resolved=c.is_resolved,
            created_at=c.created_at,
            updated_at=c.updated_at,
            message_count=len(c.messages),
            user_id=c.user_id,
            user_name=u.full_name if u else "Unknown",
            user_email=u.email if u else "Unknown",
            user_department=u.department if u else "General",
        ))

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation_detail(
    conversation_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    u = conv.user
    msgs = [
        MessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            sender=m.sender,
            content=m.content,
            troubleshooting_steps=m.troubleshooting_steps,
            category=m.category,
            ai_model=m.ai_model,
            suggest_ticket=m.suggest_ticket,
            created_at=m.created_at,
        )
        for m in conv.messages
    ]
    return ConversationDetail(
        id=conv.id,
        user_id=conv.user_id,
        title=conv.title,
        status=conv.status,
        is_resolved=conv.is_resolved,
        resolved_at=conv.resolved_at,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=msgs,
        user_name=u.full_name if u else "Unknown",
        user_email=u.email if u else "Unknown",
        user_department=u.department if u else "General",
        linked_ticket_count=len(conv.tickets) if conv.tickets else 0,
    )


@router.patch("/conversations/{conversation_id}", response_model=ConversationSummary)
def update_conversation(
    conversation_id: int,
    update_in: ConversationUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    if update_in.title:
        conv.title = update_in.title.strip()
    if update_in.status:
        conv.status = update_in.status

    conv.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(conv)

    u = conv.user
    return ConversationSummary(
        id=conv.id,
        title=conv.title,
        status=conv.status,
        is_resolved=conv.is_resolved,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=len(conv.messages),
        user_id=conv.user_id,
        user_name=u.full_name if u else "Unknown",
        user_email=u.email if u else "Unknown",
        user_department=u.department if u else "General",
    )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    db.delete(conv)
    db.commit()


# =============================================================
# 4. Ticket Management
# =============================================================
@router.get("/tickets", response_model=PaginatedResponse[TicketResponse])
def list_tickets(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    assigned_to: Optional[int] = Query(None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(Ticket)
    if search:
        term = f"%{search}%"
        q = q.filter(or_(Ticket.title.ilike(term), Ticket.description.ilike(term), Ticket.ticket_number.ilike(term)))
    if status_filter and status_filter.upper() != "ALL":
        q = q.filter(Ticket.status == status_filter.upper())
    if priority and priority.upper() != "ALL":
        q = q.filter(Ticket.priority == priority.upper())
    if category and category != "ALL":
        q = q.filter(Ticket.category == category)
    if assigned_to is not None:
        q = q.filter(Ticket.assigned_to_admin_id == assigned_to)

    total = q.count()
    tickets = q.order_by(Ticket.updated_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=[_ticket_to_response(t) for t in tickets],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
def get_ticket_detail(
    ticket_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    return _ticket_to_response(t)


@router.patch("/tickets/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: int,
    ticket_update: TicketUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Updates ticket status, priority, assignment, resolution notes."""
    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    if ticket_update.title is not None:
        t.title = ticket_update.title
    if ticket_update.description is not None:
        t.description = ticket_update.description
    if ticket_update.category is not None:
        t.category = ticket_update.category
    if ticket_update.status:
        st = ticket_update.status.upper()
        if st in [s.value for s in TicketStatus]:
            t.status = st
            if st == TicketStatus.RESOLVED.value:
                t.resolved_by_admin_id = admin.id
    if ticket_update.priority:
        t.priority = ticket_update.priority.upper()
    if ticket_update.resolution_notes is not None:
        t.resolution_notes = ticket_update.resolution_notes
    if ticket_update.assigned_to_admin_id is not None:
        # Validate the admin exists
        assignee = db.query(User).filter(
            User.id == ticket_update.assigned_to_admin_id,
            User.role == UserRole.ADMIN.value,
        ).first()
        if not assignee:
            raise HTTPException(status_code=400, detail="Assignee must be an existing admin user.")
        t.assigned_to_admin_id = ticket_update.assigned_to_admin_id

    t.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(t)
    return _ticket_to_response(t)


@router.delete("/tickets/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(
    ticket_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    db.delete(t)
    db.commit()


@router.post("/tickets/bulk", status_code=status.HTTP_200_OK)
def bulk_ticket_action(
    payload: TicketBulkAction,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Bulk update ticket status, assign, or delete."""
    tickets = db.query(Ticket).filter(Ticket.id.in_(payload.ids)).all()
    action = payload.action.lower()

    for t in tickets:
        if action == "resolve":
            t.status = TicketStatus.RESOLVED.value
            t.resolved_by_admin_id = admin.id
        elif action == "in_progress":
            t.status = TicketStatus.IN_PROGRESS.value
        elif action == "open":
            t.status = TicketStatus.OPEN.value
        elif action == "assign":
            if payload.assigned_to_admin_id:
                t.assigned_to_admin_id = payload.assigned_to_admin_id
        elif action == "delete":
            db.delete(t)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {action}")
        t.updated_at = datetime.datetime.utcnow()

    db.commit()
    return {"affected": len(tickets)}


# =============================================================
# 5. AI Activity Monitoring
# =============================================================
@router.get("/ai-activity", response_model=PaginatedResponse[AIActivityItem])
def get_ai_activity(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    category: Optional[str] = Query(None),
    suggest_ticket: Optional[bool] = Query(None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Lists AI-generated assistant messages with metadata."""
    q = db.query(Message).filter(Message.sender == "assistant")
    if category and category != "ALL":
        q = q.filter(Message.category == category)
    if suggest_ticket is not None:
        q = q.filter(Message.suggest_ticket == suggest_ticket)

    total = q.count()
    messages = q.order_by(Message.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for m in messages:
        conv = m.conversation
        u = conv.user if conv else None
        items.append(AIActivityItem(
            id=m.id,
            conversation_id=m.conversation_id,
            content=m.content[:500] + "..." if len(m.content) > 500 else m.content,
            category=m.category,
            ai_model=m.ai_model,
            suggest_ticket=m.suggest_ticket,
            created_at=m.created_at,
            user_id=u.id if u else 0,
            user_name=u.full_name if u else "Unknown",
            user_email=u.email if u else "Unknown",
            user_department=u.department if u else "General",
            conversation_title=conv.title if conv else None,
        ))

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )


# =============================================================
# Legacy endpoints (kept for backward compatibility)
# =============================================================
@router.get("/chats")
def get_all_employee_conversations_legacy(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Legacy: use /admin/conversations instead."""
    convs = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
    results = []
    for c in convs:
        u = c.user
        results.append({
            "id": c.id,
            "title": c.title,
            "status": c.status,
            "is_resolved": c.is_resolved,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "message_count": len(c.messages),
            "user_id": c.user_id,
            "user_name": u.full_name if u else "Unknown",
            "user_email": u.email if u else "Unknown",
            "user_department": u.department if u else "General",
        })
    return results


@router.get("/chats/{conversation_id}")
def get_chat_detail_legacy(
    conversation_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Legacy: use /admin/conversations/{id} instead."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    u = conv.user
    return {
        "id": conv.id,
        "user_id": conv.user_id,
        "title": conv.title,
        "status": conv.status,
        "is_resolved": conv.is_resolved,
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
        "messages": [{"id": m.id, "sender": m.sender, "content": m.content, "created_at": m.created_at} for m in conv.messages],
        "user_name": u.full_name if u else "Unknown",
        "user_email": u.email if u else "Unknown",
    }
