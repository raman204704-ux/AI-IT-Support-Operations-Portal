export interface User {
  id: number;
  email: string;
  full_name: string;
  department: string;
  role: 'employee' | 'admin';
  is_active?: boolean;
  created_at: string;
}

export interface AdminUserDetail extends User {
  is_active: boolean;
  conversation_count: number;
  ticket_count: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  troubleshooting_steps?: string | null;
  category?: string | null;
  ai_model?: string | null;
  suggest_ticket?: boolean;
  created_at: string;
}

export interface ConversationSummary {
  id: number;
  title: string;
  status: string;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  message_count: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  user_department?: string;
}

export interface ConversationDetail {
  id: number;
  user_id: number;
  title: string;
  status: string;
  is_resolved: boolean;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  messages: Message[];
  user_name?: string;
  user_email?: string;
  user_department?: string;
  linked_ticket_count?: number;
}

export interface Ticket {
  id: number;
  ticket_number: string;
  user_id: number;
  conversation_id?: number | null;
  title: string;
  description: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  resolution_notes?: string | null;
  assigned_to_admin_id?: number | null;
  resolved_by_admin_id?: number | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
  user_department?: string;
  assigned_to_name?: string | null;
}

export interface DashboardStats {
  total_employees: number;
  active_users: number;
  total_conversations: number;
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  resolved_tickets: number;
  total_ai_responses: number;
  recent_activity: RecentActivityItem[];
}

export interface RecentActivityItem {
  type: 'ticket' | 'conversation' | 'ai_response';
  id: number;
  description: string;
  user_name?: string;
  timestamp: string;
  status?: string;
}

export interface AIActivityItem {
  id: number;
  conversation_id: number;
  content: string;
  category?: string | null;
  ai_model?: string | null;
  suggest_ticket: boolean;
  created_at: string;
  user_id: number;
  user_name?: string;
  user_email?: string;
  user_department?: string;
  conversation_title?: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
