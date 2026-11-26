import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { AIActivityItem } from '../types';
import {
  Cpu, RefreshCw, ChevronLeft, ChevronRight, AlertTriangle,
  MessageSquare, User, Ticket,
} from 'lucide-react';

export const AdminAIMonitorView: React.FC = () => {
  const [data, setData] = useState<{ items: AIActivityItem[]; total: number; total_pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [suggestTicketFilter, setSuggestTicketFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [selected, setSelected] = useState<AIActivityItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.admin.getAIActivity({
        page, page_size: pageSize,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        suggest_ticket: suggestTicketFilter === 'yes' ? true : suggestTicketFilter === 'no' ? false : undefined,
      });
      setData(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, categoryFilter, suggestTicketFilter]);

  useEffect(() => { load(); }, [load]);

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
          { tab: 'admin-chats', label: 'Conversations' },
          { tab: 'admin-ai', label: 'AI Activity', active: true },
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
              <Cpu className="h-6 w-6 text-indigo-400" />
              <span>AI Activity Monitor</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Inspect all AI-generated responses, incident categories, and ticket recommendations.
              {data && <span className="ml-1">({data.total} total AI responses)</span>}
            </p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition border border-slate-700">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
            <option value="ALL">All Categories</option>
            <option value="Network">Network</option>
            <option value="VPN">VPN</option>
            <option value="Email / Outlook">Email / Outlook</option>
            <option value="Access & Permissions">Access & Permissions</option>
            <option value="Hardware & Printers">Hardware & Printers</option>
            <option value="Software Installation">Software Installation</option>
            <option value="General">General</option>
          </select>
          <select value={suggestTicketFilter} onChange={e => { setSuggestTicketFilter(e.target.value); setPage(1); }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
            <option value="ALL">All Responses</option>
            <option value="yes">Ticket Suggested</option>
            <option value="no">No Ticket Needed</option>
          </select>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" /><span>{error}</span>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

          {/* AI Response Table */}
          <div className="xl:col-span-3 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/60">
                  <th className="px-4 py-3 text-left text-slate-400 font-semibold">Response ID</th>
                  <th className="px-4 py-3 text-left text-slate-400 font-semibold">Employee</th>
                  <th className="px-4 py-3 text-left text-slate-400 font-semibold">Category</th>
                  <th className="px-4 py-3 text-left text-slate-400 font-semibold">AI Model</th>
                  <th className="px-4 py-3 text-left text-slate-400 font-semibold">Ticket?</th>
                  <th className="px-4 py-3 text-left text-slate-400 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading AI activity...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">No AI responses found.</td></tr>
                ) : items.map(item => (
                  <tr key={item.id}
                    onClick={() => setSelected(item)}
                    className={`cursor-pointer transition ${selected?.id === item.id ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : 'hover:bg-slate-800/30'}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-indigo-400 text-[10px]">MSG-{item.id}</span>
                      <div className="text-slate-500 text-[10px]">Conv #{item.conversation_id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3 text-slate-500" />
                        <span className="text-slate-200 font-medium truncate max-w-[80px]">{item.user_name}</span>
                      </div>
                      <div className="text-slate-500 text-[10px] ml-4">{item.user_department}</div>
                    </td>
                    <td className="px-4 py-3">
                      {item.category ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">{item.category}</span>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[10px] font-mono">{item.ai_model ?? '—'}</td>
                    <td className="px-4 py-3">
                      {item.suggest_ticket ? (
                        <span className="flex items-center space-x-1 text-amber-400 text-[10px] font-semibold">
                          <Ticket className="h-3 w-3" /><span>Yes</span>
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-[10px] font-semibold">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[10px]">
                      {new Date(item.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data && data.total_pages > 1 && (
              <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.total)} of {data.total}</span>
                <div className="flex items-center space-x-1">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                  <span>Page {page} / {data.total_pages}</span>
                  <button disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </div>

          {/* Detail Pane */}
          <div className="xl:col-span-2">
            {selected ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 sticky top-20">
                <div className="border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <Cpu className="h-4 w-4 text-indigo-400" />
                    <span className="font-mono text-xs text-indigo-400 font-bold">MSG-{selected.id}</span>
                    {selected.suggest_ticket && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">Ticket Suggested</span>
                    )}
                  </div>
                </div>

                {/* Metadata */}
                <div className="bg-slate-800/50 p-3 rounded-lg text-xs space-y-1.5 border border-slate-700/60">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <div>
                      <div className="text-slate-500 text-[10px] uppercase tracking-wider">Employee</div>
                      <div className="text-slate-100 font-semibold">{selected.user_name}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px] uppercase tracking-wider">Department</div>
                      <div className="text-slate-300">{selected.user_department}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px] uppercase tracking-wider">Category</div>
                      <div className="text-slate-300">{selected.category ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px] uppercase tracking-wider">AI Model</div>
                      <div className="text-slate-300 font-mono text-[10px]">{selected.ai_model ?? '—'}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-slate-500 text-[10px] uppercase tracking-wider">Conversation</div>
                      <div className="text-indigo-400">#{selected.conversation_id}: {selected.conversation_title}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-slate-500 text-[10px] uppercase tracking-wider">Timestamp</div>
                      <div className="text-slate-300">{new Date(selected.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* AI Response Content */}
                <div>
                  <div className="flex items-center space-x-1.5 mb-2">
                    <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="text-xs font-semibold text-slate-300">AI Response Content</span>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-lg text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto border border-slate-700/40">
                    {selected.content}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-500 text-xs">
                <Cpu className="h-10 w-10 mx-auto mb-3 text-slate-700" />
                Select an AI response from the table to inspect its full content and metadata.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
