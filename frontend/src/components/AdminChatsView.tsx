import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { ConversationSummary, ConversationDetail } from '../types';
import {
  MessageSquare, Search, RefreshCw, ChevronLeft, ChevronRight,
  X, AlertTriangle, Trash2, User,
} from 'lucide-react';

function StatusBadge({ status, is_resolved }: { status: string; is_resolved: boolean }) {
  if (is_resolved) return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Resolved</span>;
  if (status === 'ticket_raised') return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">Ticket Raised</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">Active</span>;
}

export const AdminChatsView: React.FC = () => {
  const [data, setData] = useState<{ items: ConversationSummary[]; total: number; total_pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [selected, setSelected] = useState<ConversationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.admin.getConversations({
        page, page_size: pageSize,
        search: search || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setData(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSelect = async (id: number) => {
    setDetailLoading(true);
    try {
      const detail = await api.admin.getConversation(id);
      setSelected(detail);
    } catch (e: any) {
      alert('Failed to load conversation: ' + e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (c: ConversationSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete conversation "${c.title}" and all messages? This cannot be undone.`)) return;
    try {
      await api.admin.deleteConversation(c.id);
      if (selected?.id === c.id) setSelected(null);
      load();
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  const items = data?.items ?? [];

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-slate-800 bg-slate-900/60 py-6 px-3 space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-3 mb-2">IT Administration</div>
        {[
          { tab: 'admin-dashboard', label: 'Overview' },
          { tab: 'admin-users', label: 'User Management' },
          { tab: 'admin-tickets', label: 'Ticket Management' },
          { tab: 'admin-chats', label: 'Conversations', active: true },
          { tab: 'admin-ai', label: 'AI Activity' },
        ].map(({ tab, label, active }) => (
          <button key={tab}
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-admin', { detail: tab }))}
            className={`flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium transition text-left
              ${active ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'}`}>
            {label}
          </button>
        ))}
      </aside>

      <main className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center space-x-2">
              <MessageSquare className="h-6 w-6 text-indigo-400" />
              <span>Conversation Management</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {data ? `${data.total} conversation(s) total` : 'Loading...'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by title..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
            <option value="ALL">All Statuses</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="ticket_raised">Ticket Raised</option>
          </select>
          <button onClick={load} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" /><span>{error}</span>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

          {/* Conversation List */}
          <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="border-b border-slate-800 bg-slate-800/60 px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Conversations
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 max-h-[65vh]">
              {loading ? (
                <div className="p-8 text-center text-slate-500 text-xs">Loading conversations...</div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">No conversations found.</div>
              ) : items.map(c => (
                <div key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className={`p-3.5 cursor-pointer transition group ${selected?.id === c.id ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : 'hover:bg-slate-800/40'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1.5 text-xs">
                      <User className="h-3 w-3 text-slate-500" />
                      <span className="font-semibold text-slate-100">{c.user_name ?? 'Unknown'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <StatusBadge status={c.status} is_resolved={c.is_resolved} />
                      <button onClick={e => handleDelete(c, e)}
                        className="p-1 rounded hover:bg-rose-500/20 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-300 font-medium truncate">{c.title}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
                    <span>{c.user_department ?? 'General'} · {c.message_count} msgs</span>
                    <span>{new Date(c.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data && data.total_pages > 1 && (
              <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.total)} of {data.total}</span>
                <div className="flex items-center space-x-1">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1 rounded hover:bg-slate-800 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                  <span>pg {page}/{data.total_pages}</span>
                  <button disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)} className="p-1 rounded hover:bg-slate-800 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </div>

          {/* Conversation Transcript */}
          <div className="xl:col-span-3">
            {detailLoading ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-sm">
                Loading conversation...
              </div>
            ) : selected ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-100">{selected.title}</h2>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <StatusBadge status={selected.status} is_resolved={selected.is_resolved} />
                        <span className="text-xs text-slate-400">{selected.user_name} · {selected.user_email}</span>
                      </div>
                    </div>
                    <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-100 p-1 rounded-lg"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-500 flex flex-wrap gap-3">
                    <span>ID: #{selected.id}</span>
                    <span>Dept: {selected.user_department}</span>
                    <span>Messages: {selected.messages.length}</span>
                    <span>Linked tickets: {selected.linked_ticket_count ?? 0}</span>
                    <span>Created: {new Date(selected.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Messages */}
                <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
                  {selected.messages.length === 0 ? (
                    <div className="text-center text-slate-500 text-xs py-8">No messages in this conversation.</div>
                  ) : selected.messages.map(m => (
                    <div key={m.id}
                      className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-100 ml-8'
                          : 'bg-slate-800/80 border border-slate-700/80 text-slate-200 mr-8'}`}>
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1.5">
                        <span>{m.sender === 'user' ? `👤 ${selected.user_name ?? 'Employee'}` : '🤖 AI IT Assistant'}</span>
                        <span>{new Date(m.created_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="whitespace-pre-wrap">{m.content}</div>
                      {m.category && (
                        <div className="mt-2 text-[10px] text-slate-500">Category: <span className="text-indigo-400">{m.category}</span></div>
                      )}
                      {m.suggest_ticket && (
                        <div className="mt-1 text-[10px] text-amber-400 font-semibold">⚠ AI suggested raising a ticket</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500 text-xs">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 text-slate-700" />
                Select a conversation from the list to view the full transcript.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
