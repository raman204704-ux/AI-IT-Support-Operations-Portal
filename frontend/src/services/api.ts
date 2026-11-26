import {
  User,
  AdminUserDetail,
  ConversationSummary,
  ConversationDetail,
  Ticket,
  DashboardStats,
  AIActivityItem,
  PaginatedResponse,
} from '../types';

const API_BASE = '/api/v1';

function getHeaders(isJson = true): HeadersInit {
  const token = localStorage.getItem('it_support_token');
  const headers: Record<string, string> = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMsg = `Request failed (${res.status})`;
    try {
      const errData = await res.json();
      if (errData && errData.detail) {
        errMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
      }
    } catch {}
    throw new Error(errMsg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Authentication
  auth: {
    async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return handleResponse(res);
    },
    async register(data: { email: string; password: string; full_name: string; department: string; role: string }): Promise<User> {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    async getMe(): Promise<User> {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Chat (Employee)
  chat: {
    async sendMessage(message: string, conversationId?: number): Promise<{
      conversation_id: number;
      message_id: number;
      content: string;
      troubleshooting_steps?: string;
      suggest_ticket: boolean;
    }> {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message, conversation_id: conversationId }),
      });
      return handleResponse(res);
    },
    async sendFeedback(conversationId: number, resolved: boolean): Promise<{
      success: boolean;
      message: string;
      is_resolved: boolean;
      suggest_ticket: boolean;
    }> {
      const res = await fetch(`${API_BASE}/chat/feedback`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ conversation_id: conversationId, resolved }),
      });
      return handleResponse(res);
    },
    async getConversations(): Promise<ConversationSummary[]> {
      const res = await fetch(`${API_BASE}/chat/conversations`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    async getConversation(id: number): Promise<ConversationDetail> {
      const res = await fetch(`${API_BASE}/chat/conversations/${id}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    async createConversation(): Promise<ConversationDetail> {
      const res = await fetch(`${API_BASE}/chat/conversations`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    async deleteConversation(id: number): Promise<void> {
      const res = await fetch(`${API_BASE}/chat/conversations/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Tickets (Employee)
  tickets: {
    async createTicket(data: {
      conversation_id?: number;
      title: string;
      description: string;
      category: string;
      priority: string;
    }): Promise<Ticket> {
      const res = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    async getTickets(): Promise<Ticket[]> {
      const res = await fetch(`${API_BASE}/tickets`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    async getTicket(id: number): Promise<Ticket> {
      const res = await fetch(`${API_BASE}/tickets/${id}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Admin Portal — all endpoints hit the real backend, all require admin JWT
  admin: {
    // Dashboard
    async getDashboardStats(): Promise<DashboardStats> {
      const res = await fetch(`${API_BASE}/admin/dashboard/stats`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    // ---- Users ----
    async getUsers(params?: {
      page?: number;
      page_size?: number;
      search?: string;
      role?: string;
      is_active?: boolean;
    }): Promise<PaginatedResponse<AdminUserDetail>> {
      const qs = new URLSearchParams();
      if (params?.page) qs.set('page', String(params.page));
      if (params?.page_size) qs.set('page_size', String(params.page_size));
      if (params?.search) qs.set('search', params.search);
      if (params?.role) qs.set('role', params.role);
      if (params?.is_active !== undefined) qs.set('is_active', String(params.is_active));
      const res = await fetch(`${API_BASE}/admin/users?${qs}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    async getUser(id: number): Promise<AdminUserDetail> {
      const res = await fetch(`${API_BASE}/admin/users/${id}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    async createUser(data: {
      email: string;
      full_name: string;
      password: string;
      department: string;
      role: string;
    }): Promise<User> {
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    async updateUser(id: number, data: {
      full_name?: string;
      department?: string;
      role?: string;
      is_active?: boolean;
      password?: string;
    }): Promise<User> {
      const res = await fetch(`${API_BASE}/admin/users/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    async deleteUser(id: number): Promise<void> {
      const res = await fetch(`${API_BASE}/admin/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    async bulkUserAction(ids: number[], action: string): Promise<{ affected: number }> {
      const res = await fetch(`${API_BASE}/admin/users/bulk`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ids, action }),
      });
      return handleResponse(res);
    },

    // ---- Conversations ----
    async getConversations(params?: {
      page?: number;
      page_size?: number;
      search?: string;
      status?: string;
    }): Promise<PaginatedResponse<ConversationSummary>> {
      const qs = new URLSearchParams();
      if (params?.page) qs.set('page', String(params.page));
      if (params?.page_size) qs.set('page_size', String(params.page_size));
      if (params?.search) qs.set('search', params.search);
      if (params?.status && params.status !== 'ALL') qs.set('status', params.status);
      const res = await fetch(`${API_BASE}/admin/conversations?${qs}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    async getConversation(id: number): Promise<ConversationDetail> {
      const res = await fetch(`${API_BASE}/admin/conversations/${id}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    async deleteConversation(id: number): Promise<void> {
      const res = await fetch(`${API_BASE}/admin/conversations/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    // ---- Tickets ----
    async getTickets(params?: {
      page?: number;
      page_size?: number;
      search?: string;
      status?: string;
      priority?: string;
      category?: string;
    }): Promise<PaginatedResponse<Ticket>> {
      const qs = new URLSearchParams();
      if (params?.page) qs.set('page', String(params.page));
      if (params?.page_size) qs.set('page_size', String(params.page_size));
      if (params?.search) qs.set('search', params.search);
      if (params?.status && params.status !== 'ALL') qs.set('status', params.status);
      if (params?.priority && params.priority !== 'ALL') qs.set('priority', params.priority);
      if (params?.category && params.category !== 'ALL') qs.set('category', params.category);
      const res = await fetch(`${API_BASE}/admin/tickets?${qs}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    async getTicket(id: number): Promise<Ticket> {
      const res = await fetch(`${API_BASE}/admin/tickets/${id}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    async updateTicket(id: number, data: {
      status?: string;
      priority?: string;
      resolution_notes?: string;
      assigned_to_admin_id?: number | null;
      title?: string;
      description?: string;
      category?: string;
    }): Promise<Ticket> {
      const res = await fetch(`${API_BASE}/admin/tickets/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    async deleteTicket(id: number): Promise<void> {
      const res = await fetch(`${API_BASE}/admin/tickets/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    async bulkTicketAction(ids: number[], action: string, assigned_to_admin_id?: number): Promise<{ affected: number }> {
      const res = await fetch(`${API_BASE}/admin/tickets/bulk`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ids, action, assigned_to_admin_id }),
      });
      return handleResponse(res);
    },

    // ---- AI Activity ----
    async getAIActivity(params?: {
      page?: number;
      page_size?: number;
      category?: string;
      suggest_ticket?: boolean;
    }): Promise<PaginatedResponse<AIActivityItem>> {
      const qs = new URLSearchParams();
      if (params?.page) qs.set('page', String(params.page));
      if (params?.page_size) qs.set('page_size', String(params.page_size));
      if (params?.category && params.category !== 'ALL') qs.set('category', params.category);
      if (params?.suggest_ticket !== undefined) qs.set('suggest_ticket', String(params.suggest_ticket));
      const res = await fetch(`${API_BASE}/admin/ai-activity?${qs}`, { headers: getHeaders() });
      return handleResponse(res);
    },
  },
};
