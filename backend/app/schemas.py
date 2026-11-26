from typing import Optional, List, Generic, TypeVar
import datetime
from pydantic import BaseModel, EmailStr, Field

T = TypeVar("T")


# ===================== PAGINATION =====================
class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


# ===================== USER & AUTH =====================
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    department: str = "General"


class UserRegister(UserBase):
    password: str = Field(min_length=6)
    role: str = "employee"  # Ignored on public register — always set to employee


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool = True
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    role: Optional[str] = None


# ===================== ADMIN USER MANAGEMENT =====================
class AdminUserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(min_length=6)
    department: str = "General"
    role: str = "employee"


class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=6)


class AdminUserDetail(BaseModel):
    id: int
    email: str
    full_name: str
    department: str
    role: str
    is_active: bool
    created_at: datetime.datetime
    conversation_count: int = 0
    ticket_count: int = 0

    model_config = {"from_attributes": True}


class BulkActionRequest(BaseModel):
    ids: List[int]
    action: str  # "activate" | "deactivate" | "delete"


# ===================== CHAT =====================
class ChatRequest(BaseModel):
    conversation_id: Optional[int] = None
    message: str = Field(min_length=1)


class ChatResponse(BaseModel):
    conversation_id: int
    message_id: int
    content: str
    troubleshooting_steps: Optional[str] = None
    suggest_ticket: bool = False


class SolutionFeedbackRequest(BaseModel):
    conversation_id: int
    resolved: bool


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender: str
    content: str
    troubleshooting_steps: Optional[str] = None
    category: Optional[str] = None
    ai_model: Optional[str] = None
    suggest_ticket: bool = False
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class ConversationSummary(BaseModel):
    id: int
    title: str
    status: str
    is_resolved: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime
    message_count: int = 0
    user_id: int
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_department: Optional[str] = None

    model_config = {"from_attributes": True}


class ConversationDetail(BaseModel):
    id: int
    user_id: int
    title: str
    status: str
    is_resolved: bool
    resolved_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    messages: List[MessageResponse] = []
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_department: Optional[str] = None
    linked_ticket_count: int = 0

    model_config = {"from_attributes": True}


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None


# ===================== TICKETS =====================
class TicketCreate(BaseModel):
    conversation_id: Optional[int] = None
    title: str
    description: str
    category: str = "General"
    priority: str = "MEDIUM"


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    resolution_notes: Optional[str] = None
    assigned_to_admin_id: Optional[int] = None
    category: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None


class TicketResponse(BaseModel):
    id: int
    ticket_number: str
    user_id: int
    conversation_id: Optional[int] = None
    title: str
    description: str
    category: str
    priority: str
    status: str
    resolution_notes: Optional[str] = None
    assigned_to_admin_id: Optional[int] = None
    resolved_by_admin_id: Optional[int] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_department: Optional[str] = None
    assigned_to_name: Optional[str] = None

    model_config = {"from_attributes": True}


class TicketBulkAction(BaseModel):
    ids: List[int]
    action: str  # "resolve" | "in_progress" | "open" | "delete" | "assign"
    assigned_to_admin_id: Optional[int] = None


# ===================== AI ACTIVITY =====================
class AIActivityItem(BaseModel):
    id: int
    conversation_id: int
    content: str
    category: Optional[str] = None
    ai_model: Optional[str] = None
    suggest_ticket: bool = False
    created_at: datetime.datetime
    user_id: int
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_department: Optional[str] = None
    conversation_title: Optional[str] = None

    model_config = {"from_attributes": True}


# ===================== ADMIN DASHBOARD =====================
class RecentActivityItem(BaseModel):
    type: str  # "ticket" | "conversation" | "ai_response"
    id: int
    description: str
    user_name: Optional[str] = None
    timestamp: datetime.datetime
    status: Optional[str] = None


class DashboardStatsResponse(BaseModel):
    total_employees: int
    total_conversations: int
    total_tickets: int
    open_tickets: int
    in_progress_tickets: int
    resolved_tickets: int
    total_ai_responses: int = 0
    active_users: int = 0
    recent_activity: List[RecentActivityItem] = []
