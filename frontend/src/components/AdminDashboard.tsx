import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DashboardStats } from '../types';
import {
  Users, MessageSquare, Ticket, Clock, RefreshCw,
  CheckCircle2, ArrowUpRight, Cpu, Activity, TrendingUp,
  AlertTriangle, User,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigateTab: (tab: string) => void;
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    IN_PROGRESS: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    RESOLVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    active: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    ticket_raised: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${map[status] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.admin.getDashboardStats();
      setStats(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  const total = stats?.total_tickets || 1;
  const pctOpen = Math.round(((stats?.open_tickets ?? 0) / total) * 100);
  const pctIP = Math.round(((stats?.in_progress_tickets ?? 0) / total) * 100);
  const pctDone = Math.round(((stats?.resolved_tickets ?? 0) / total) * 100);

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Admin Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-slate-800 bg-slate-900/60 py-6 px-3 space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-3 mb-2">
          IT Administration
        </div>
        {[
          { tab: 'admin-dashboard', icon: Activity, label: 'Overview' },
          { tab: 'admin-users', icon: Users, label: 'User Management' },
          { tab: 'admin-tickets', icon: Ticket, label: 'Ticket Management' },
          { tab: 'admin-chats', icon: MessageSquare, label: 'Conversations' },
          { tab: 'admin-ai', icon: Cpu, label: 'AI Activity' },
        ].map(({ tab, icon: Icon, label }) => (
          <button
            key={tab}
            onClick={() => onNavigateTab(tab)}
            className={`flex items-center space-x-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium transition text-left
              ${tab === 'admin-dashboard'
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-8 space-y-8">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">IT Admin Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">
              Real-time overview of users, tickets, conversations, and AI activity.
            </p>
          </div>
          <button
            onClick={loadStats}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition border border-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              label: 'Registered Employees',
              value: stats?.total_employees,
              sub: `${stats?.active_users ?? 0} active`,
              icon: Users,
              color: 'sky',
              tab: 'admin-users',
            },
            {
              label: 'Total Conversations',
              value: stats?.total_conversations,
              sub: 'All AI chat sessions',
              icon: MessageSquare,
              color: 'indigo',
              tab: 'admin-chats',
            },
            {
              label: 'Open Tickets',
              value: stats?.open_tickets,
              sub: `${stats?.in_progress_tickets ?? 0} in progress`,
              icon: Clock,
              color: 'amber',
              tab: 'admin-tickets',
            },
            {
              label: 'Resolved Tickets',
              value: stats?.resolved_tickets,
              sub: `of ${stats?.total_tickets ?? 0} total`,
              icon: CheckCircle2,
              color: 'emerald',
              tab: 'admin-tickets',
            },
          ].map(({ label, value, sub, icon: Icon, color, tab }) => (
            <div
              key={label}
              onClick={() => onNavigateTab(tab)}
              className={`bg-slate-900 border border-slate-800 hover:border-${color}-500/40 rounded-xl p-5 cursor-pointer transition group`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400">{label}</span>
                <div className={`h-8 w-8 rounded-lg bg-${color}-500/10 text-${color}-400 flex items-center justify-center`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-100">
                {loading ? <span className="text-slate-600">—</span> : (value ?? 0)}
              </div>
              <div className={`text-[11px] text-${color}-400/80 mt-1 flex items-center`}>
                <span>{sub}</span>
                <ArrowUpRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </div>
            </div>
          ))}
        </div>

        {/* Middle Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Ticket Pipeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-slate-100">Ticket Pipeline</h2>
              </div>
              <button
                onClick={() => onNavigateTab('admin-tickets')}
                className="text-xs text-amber-400 hover:underline"
              >
                Manage →
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'OPEN', value: stats?.open_tickets ?? 0, pct: pctOpen, color: 'bg-amber-400' },
                { label: 'IN PROGRESS', value: stats?.in_progress_tickets ?? 0, pct: pctIP, color: 'bg-sky-400' },
                { label: 'RESOLVED', value: stats?.resolved_tickets ?? 0, pct: pctDone, color: 'bg-emerald-400' },
              ].map(({ label, value, pct, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 font-medium">{label}</span>
                    <span className="text-slate-100 font-bold font-mono">{value} <span className="text-slate-500 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Responses Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-slate-100">AI Support Activity</h2>
              </div>
              <button
                onClick={() => onNavigateTab('admin-ai')}
                className="text-xs text-indigo-400 hover:underline"
              >
                Monitor →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                <div className="text-2xl font-extrabold text-slate-100">
                  {loading ? '—' : stats?.total_ai_responses ?? 0}
                </div>
                <div className="text-[10px] text-indigo-400 mt-0.5">AI Responses</div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                <div className="text-2xl font-extrabold text-slate-100">
                  {loading ? '—' : stats?.total_conversations ?? 0}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Conversations</div>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              {[
                { label: 'LangGraph Workflow', status: 'Active', color: 'text-emerald-400' },
                { label: 'Groq LLM Engine', status: 'Connected', color: 'text-indigo-400' },
                { label: 'SQLite Database', status: 'Synchronized', color: 'text-emerald-400' },
              ].map(({ label, status, color }) => (
                <div key={label} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40">
                  <span className="text-slate-400">{label}</span>
                  <span className={`font-medium flex items-center ${color}`}>
                    <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${color.replace('text-', 'bg-')}`} />
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center space-x-2">
            <Activity className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-100">Recent Activity</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Loading activity...</div>
          ) : (stats?.recent_activity ?? []).length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No recent activity found.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/40">
                  <th className="text-left px-5 py-2.5 text-slate-400 font-semibold">Type</th>
                  <th className="text-left px-5 py-2.5 text-slate-400 font-semibold">Description</th>
                  <th className="text-left px-5 py-2.5 text-slate-400 font-semibold">User</th>
                  <th className="text-left px-5 py-2.5 text-slate-400 font-semibold">Status</th>
                  <th className="text-left px-5 py-2.5 text-slate-400 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(stats?.recent_activity ?? []).map((item, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                        item.type === 'ticket'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-indigo-500/10 text-indigo-400'
                      }`}>
                        {item.type === 'ticket' ? <Ticket className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                        <span>{item.type}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-200 max-w-xs truncate">{item.description}</td>
                    <td className="px-5 py-3 text-slate-400">
                      <div className="flex items-center space-x-1.5">
                        <User className="h-3 w-3" />
                        <span>{item.user_name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {item.status && <StatusBadge status={item.status} />}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{fmt(item.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </main>
    </div>
  );
};
