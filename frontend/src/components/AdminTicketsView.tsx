import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Ticket } from '../types';
import {
  Ticket as TicketIcon, Search, RefreshCw, ChevronLeft, ChevronRight,
  MessageSquare, X, AlertTriangle, Edit2, Trash2, CheckCircle2,
  Clock, AlertCircle, User,
} from 'lucide-react';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    IN_PROGRESS: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    RESOLVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${map[status] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>{status.replace('_', ' ')}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    LOW: 'text-slate-400',
    MEDIUM: 'text-sky-400',
    HIGH: 'text-amber-400',
    CRITICAL: 'text-rose-400',
  };
  return <span className={`font-semibold text-[10px] ${map[priority] ?? 'text-slate-400'}`}>{priority}</span>;
}

interface TicketEditForm {
  status: string;
  priority: string;
  resolution_notes: string;
  assigned_to_admin_id: string;
}

export const AdminTicketsView: React.FC = () => {
  const [data, setData] = useState<{ items: Ticket[]; total: number; total_pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Selected ticket for the detail pane
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [editForm, setEditForm] = useState<TicketEditForm>({ status: '', priority: '', resolution_notes: '', assigned_to_admin_id: '' });
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Linked conversation modal
  const [convModal, setConvModal] = useState<any>(null);
  const [convLoading, setConvLoading] = useState(false);

  // Bulk
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.admin.getTickets({
        page, page_size: pageSize,
        search: search || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
      });
      setData(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, priorityFilter, categoryFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSelect = (t: Ticket) => {
    setSelected(t);
    setEditForm({ status: t.status, priority: t.priority, resolution_notes: t.resolution_notes ?? '', assigned_to_admin_id: t.assigned_to_admin_id ? String(t.assigned_to_admin_id) : '' });
    setUpdateError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      const payload: any = {
        status: editForm.status,
        priority: editForm.priority,
        resolution_notes: editForm.resolution_notes,
      };
      if (editForm.assigned_to_admin_id) payload.assigned_to_admin_id = Number(editForm.assigned_to_admin_id);
      const updated = await api.admin.updateTicket(selected.id, payload);
      setSelected(updated);
      setData(d => d ? { ...d, items: d.items.map(i => i.id === updated.id ? updated : i) } : d);
    } catch (e: any) {
      setUpdateError(e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (t: Ticket) => {
    if (!confirm(`Delete ticket ${t.ticket_number}? This cannot be undone.`)) return;
    try {
      await api.admin.deleteTicket(t.id);
      if (selected?.id === t.id) setSelected(null);
      load();
    } catch (e: any) {
      alert('Delete failed: ' + e.message);
    }
  };

  const handleInspectConv = async (convId: number) => {
    setConvLoading(true);
    try {
      const detail = await api.admin.getConversation(convId);
      setConvModal(detail);
    } catch (e: any) {
      alert('Could not load conversation: ' + e.message);
    } finally {
      setConvLoading(false);
    }
  };

  const handleBulk = async (action: string) => {
    if (selectedIds.length === 0) return;
    if (!confirm(`${action} ${selectedIds.length} ticket(s)?`)) return;
    try {
      const res = await api.admin.bulkTicketAction(selectedIds, action);
      alert(`${res.affected} ticket(s) updated.`);
      setSelectedIds([]);
      setSelected(null);
      load();
    } catch (e: any) {
      alert('Bulk action failed: ' + e.message);
    }
  };

  const toggleSelect = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const items = data?.items ?? [];

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar placeholder */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-slate-800 bg-slate-900/60 py-6 px-3 space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-3 mb-2">IT Administration</div>
        {[
          { tab: 'admin-dashboard', label: 'Overview' },
          { tab: 'admin-users', label: 'User Management' },
          { tab: 'admin-tickets', label: 'Ticket Management', active: true },
          { tab: 'admin-chats', label: 'Conversations' },
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
              <TicketIcon className="h-6 w-6 text-amber-400" />
              <span>Ticket Management</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {data ? `${data.total} ticket(s)` : 'Loading...'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by title, description, ticket #..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500">
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1); }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500">
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500">
            <option value="ALL">All Categories</option>
            <option value="Network">Network</option>
            <option value="VPN">VPN</option>
            <option value="Email / Outlook">Email / Outlook</option>
            <option value="Access & Permissions">Access & Permissions</option>
            <option value="Hardware & Printers">Hardware & Printers</option>
            <option value="Software Installation">Software Installation</option>
            <option value="General">General</option>
          </select>
          <button onClick={load} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center space-x-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs">
            <span className="text-amber-300 font-semibold">{selectedIds.length} selected</span>
            <button onClick={() => handleBulk('resolve')} className="px-3 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30">Resolve</button>
            <button onClick={() => handleBulk('in_progress')} className="px-3 py-1 rounded-lg bg-sky-600/20 text-sky-400 border border-sky-500/30 hover:bg-sky-600/30">In Progress</button>
            <button onClick={() => handleBulk('open')} className="px-3 py-1 rounded-lg bg-amber-600/20 text-amber-400 border border-amber-500/30 hover:bg-amber-600/30">Reopen</button>
            <button onClick={() => handleBulk('delete')} className="px-3 py-1 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30">Delete</button>
            <button onClick={() => setSelectedIds([])} className="ml-auto text-slate-400 hover:text-slate-100"><X className="h-4 w-4" /></button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" /><span>{error}</span>
          </div>
        )}

        {/* Two-column layout: list + detail */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

          {/* Ticket Table */}
          <div className="xl:col-span-3 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/60">
                  <th className="px-3 py-3 w-8">
                    <input type="checkbox" className="accent-amber-500"
                      checked={selectedIds.length === items.length && items.length > 0}
                      onChange={e => setSelectedIds(e.target.checked ? items.map(i => i.id) : [])} />
                  </th>
                  <th className="px-3 py-3 text-left text-slate-400 font-semibold">Ticket #</th>
                  <th className="px-3 py-3 text-left text-slate-400 font-semibold">Title</th>
                  <th className="px-3 py-3 text-left text-slate-400 font-semibold">Employee</th>
                  <th className="px-3 py-3 text-left text-slate-400 font-semibold">Status</th>
                  <th className="px-3 py-3 text-left text-slate-400 font-semibold">Priority</th>
                  <th className="px-3 py-3 text-right text-slate-400 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-500">Loading tickets...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-500">No tickets found.</td></tr>
                ) : items.map(t => (
                  <tr key={t.id}
                    onClick={() => handleSelect(t)}
                    className={`cursor-pointer transition group ${selected?.id === t.id ? 'bg-amber-500/5 border-l-2 border-amber-500' : 'hover:bg-slate-800/30'}`}>
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="accent-amber-500"
                        checked={selectedIds.includes(t.id)}
                        onChange={() => toggleSelect(t.id)} />
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-indigo-400 font-bold text-[10px] bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{t.ticket_number}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-100 font-medium max-w-xs truncate">{t.title}</td>
                    <td className="px-3 py-3 text-slate-400">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span className="truncate max-w-[80px]">{t.user_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-3 py-3"><PriorityBadge priority={t.priority} /></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleDelete(t)} title="Delete" className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data && data.total_pages > 1 && (
              <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.total)} of {data.total}</span>
                <div className="flex items-center space-x-1">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                  <span>Page {page} / {data.total_pages}</span>
                  <button disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </div>

          {/* Detail / Edit Pane */}
          <div className="xl:col-span-2">
            {selected ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 sticky top-20">
                {/* Ticket Header */}
                <div className="border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-indigo-400 text-xs font-bold">{selected.ticket_number}</span>
                    <StatusBadge status={selected.status} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 mt-1">{selected.title}</h3>
                </div>

                {/* Employee Info */}
                <div className="bg-slate-800/50 p-3 rounded-lg text-xs space-y-1 border border-slate-700/60">
                  <div className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Submitted by</div>
                  <div className="font-semibold text-slate-100">{selected.user_name}</div>
                  <div className="text-slate-400">{selected.user_email}</div>
                  <div className="text-slate-500">{selected.user_department} · {new Date(selected.created_at).toLocaleString()}</div>
                </div>

                {/* Description */}
                <div>
                  <div className="text-xs font-semibold text-slate-400 mb-1">Description</div>
                  <div className="bg-slate-800/50 p-3 rounded-lg text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto border border-slate-700/40">
                    {selected.description}
                  </div>
                </div>

                {/* Category / Linked conv */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Category: <span className="text-slate-300 font-medium">{selected.category}</span></span>
                  {selected.conversation_id && (
                    <button onClick={() => handleInspectConv(selected.conversation_id!)}
                      disabled={convLoading}
                      className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-medium">
                      <MessageSquare className="h-3 w-3" />
                      <span>{convLoading ? 'Loading...' : 'View Chat'}</span>
                    </button>
                  )}
                </div>

                {/* Assignment info */}
                {selected.assigned_to_name && (
                  <div className="text-xs text-slate-400">
                    Assigned to: <span className="text-amber-400 font-semibold">{selected.assigned_to_name}</span>
                  </div>
                )}

                {/* Edit Form */}
                <form onSubmit={handleUpdate} className="space-y-3 pt-3 border-t border-slate-800">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Update Ticket</div>

                  {updateError && (
                    <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                      <AlertTriangle className="h-3 w-3" /><span>{updateError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">Status</label>
                      <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500">
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">Priority</label>
                      <select value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500">
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">Assign to Admin (User ID)</label>
                    <input type="number" value={editForm.assigned_to_admin_id}
                      onChange={e => setEditForm(f => ({ ...f, assigned_to_admin_id: e.target.value }))}
                      placeholder="Admin user ID..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">Resolution Notes</label>
                    <textarea rows={3} value={editForm.resolution_notes}
                      onChange={e => setEditForm(f => ({ ...f, resolution_notes: e.target.value }))}
                      placeholder="Diagnostic steps taken, root cause, final fix..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 resize-none" />
                  </div>

                  <button type="submit" disabled={updating}
                    className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition">
                    {updating ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-500 text-xs">
                <TicketIcon className="h-10 w-10 mx-auto mb-3 text-slate-700" />
                Select a ticket from the list to view details and update its status.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Linked Conversation Modal */}
      {convModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-indigo-400" />
                  <span>Conversation #{convModal.id}: {convModal.title}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{convModal.user_name} · {convModal.user_email}</p>
              </div>
              <button onClick={() => setConvModal(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {convModal.messages.map((m: any) => (
                <div key={m.id} className={`p-3 rounded-xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-100 ml-8'
                    : 'bg-slate-800/80 border border-slate-700/80 text-slate-200 mr-8'}`}>
                  <div className="font-bold text-[10px] mb-1 text-slate-400">
                    {m.sender === 'user' ? `👤 ${convModal.user_name}` : '🤖 AI Assistant'}
                    <span className="ml-2 font-normal">{new Date(m.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button onClick={() => setConvModal(null)} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
