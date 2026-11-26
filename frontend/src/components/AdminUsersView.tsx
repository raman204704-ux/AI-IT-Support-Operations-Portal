import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { AdminUserDetail } from '../types';
import {
  Users, Search, RefreshCw, ChevronLeft, ChevronRight,
  Plus, Edit2, Trash2, CheckCircle, XCircle, Shield, User,
  X, AlertTriangle, Eye, EyeOff,
} from 'lucide-react';

function RoleBadge({ role }: { role: string }) {
  return role === 'admin' ? (
    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
      <Shield className="h-2.5 w-2.5" />
      <span>Admin</span>
    </span>
  ) : (
    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
      <User className="h-2.5 w-2.5" />
      <span>Employee</span>
    </span>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center space-x-1 text-[10px] font-semibold ${active ? 'text-emerald-400' : 'text-rose-400'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
      <span>{active ? 'Active' : 'Inactive'}</span>
    </span>
  );
}

interface UserFormData {
  email: string;
  full_name: string;
  department: string;
  role: string;
  password: string;
  is_active: boolean;
}

const EMPTY_FORM: UserFormData = {
  email: '', full_name: '', department: 'General', role: 'employee', password: '', is_active: true,
};

export const AdminUsersView: React.FC = () => {
  const [data, setData] = useState<{ items: AdminUserDetail[]; total: number; total_pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Selected user for detail pane
  const [selected, setSelected] = useState<AdminUserDetail | null>(null);

  // Create/Edit modal
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  // Bulk selection
  const [selected_ids, setSelectedIds] = useState<number[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.admin.getUsers({
        page,
        page_size: pageSize,
        search: search || undefined,
        role: roleFilter || undefined,
      });
      setData(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  // debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModal('create');
  };

  const openEdit = (u: AdminUserDetail) => {
    setForm({ email: u.email, full_name: u.full_name, department: u.department, role: u.role, password: '', is_active: u.is_active });
    setFormError(null);
    setModal('edit');
    setSelected(u);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      if (modal === 'create') {
        await api.admin.createUser(form);
      } else if (selected) {
        const payload: any = { full_name: form.full_name, department: form.department, role: form.role, is_active: form.is_active };
        if (form.password) payload.password = form.password;
        await api.admin.updateUser(selected.id, payload);
      }
      setModal(null);
      setSelected(null);
      load();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (u: AdminUserDetail) => {
    if (!confirm(`Permanently delete user "${u.full_name}" and all their data? This cannot be undone.`)) return;
    try {
      await api.admin.deleteUser(u.id);
      if (selected?.id === u.id) setSelected(null);
      load();
    } catch (e: any) {
      alert('Delete failed: ' + e.message);
    }
  };

  const handleBulk = async (action: string) => {
    if (selected_ids.length === 0) return;
    if (!confirm(`${action} ${selected_ids.length} user(s)?`)) return;
    try {
      const res = await api.admin.bulkUserAction(selected_ids, action);
      alert(`${res.affected} user(s) affected.`);
      setSelectedIds([]);
      load();
    } catch (e: any) {
      alert('Bulk action failed: ' + e.message);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const items = data?.items ?? [];

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-slate-800 bg-slate-900/60 py-6 px-3 space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-3 mb-2">IT Administration</div>
        {[
          { tab: 'admin-dashboard', label: 'Overview' },
          { tab: 'admin-users', label: 'User Management', active: true },
          { tab: 'admin-tickets', label: 'Ticket Management' },
          { tab: 'admin-chats', label: 'Conversations' },
          { tab: 'admin-ai', label: 'AI Activity' },
        ].map(({ tab, label, active }) => (
          <button
            key={tab}
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-admin', { detail: tab }))}
            className={`flex items-center space-x-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium transition text-left
              ${active ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'}`}
          >
            <span>{label}</span>
          </button>
        ))}
      </aside>

      <main className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center space-x-2">
              <Users className="h-6 w-6 text-sky-400" />
              <span>User Management</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {data ? `${data.total} user(s) registered` : 'Loading...'}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition shadow"
          >
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by name, email, department..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Roles</option>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
          <button onClick={load} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Bulk Actions */}
        {selected_ids.length > 0 && (
          <div className="flex items-center space-x-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs">
            <span className="text-amber-300 font-semibold">{selected_ids.length} selected</span>
            <button onClick={() => handleBulk('activate')} className="px-3 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 transition">Activate</button>
            <button onClick={() => handleBulk('deactivate')} className="px-3 py-1 rounded-lg bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600 transition">Deactivate</button>
            <button onClick={() => handleBulk('delete')} className="px-3 py-1 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30 transition">Delete</button>
            <button onClick={() => setSelectedIds([])} className="ml-auto text-slate-400 hover:text-slate-100"><X className="h-4 w-4" /></button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/60">
                <th className="px-4 py-3 text-left w-8">
                  <input type="checkbox" className="accent-amber-500"
                    checked={selected_ids.length === items.length && items.length > 0}
                    onChange={e => setSelectedIds(e.target.checked ? items.map(i => i.id) : [])}
                  />
                </th>
                <th className="px-4 py-3 text-left text-slate-400 font-semibold">Name / Email</th>
                <th className="px-4 py-3 text-left text-slate-400 font-semibold">Department</th>
                <th className="px-4 py-3 text-left text-slate-400 font-semibold">Role</th>
                <th className="px-4 py-3 text-left text-slate-400 font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-slate-400 font-semibold">Convs / Tickets</th>
                <th className="px-4 py-3 text-left text-slate-400 font-semibold">Joined</th>
                <th className="px-4 py-3 text-right text-slate-400 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">Loading users...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">No users found.</td></tr>
              ) : items.map(u => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition group">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="accent-amber-500"
                      checked={selected_ids.includes(u.id)}
                      onChange={() => toggleSelect(u.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-100">{u.full_name}</div>
                    <div className="text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{u.department}</td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3"><StatusDot active={u.is_active} /></td>
                  <td className="px-4 py-3 text-slate-400">
                    {u.conversation_count} / {u.ticket_count}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => openEdit(u)} title="Edit" className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-100">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(u)} title="Delete" className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.total)} of {data.total}</span>
              <div className="flex items-center space-x-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                <span className="px-2">Page {page} / {data.total_pages}</span>
                <button disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-slate-100">{modal === 'create' ? 'Add New User' : 'Edit User'}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-100"><X className="h-5 w-5" /></button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Full Name *</label>
                  <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500" />
                </div>
                {modal === 'create' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Email *</label>
                    <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Department</label>
                  <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Role</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500">
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {modal === 'create' ? 'Password *' : 'New Password (leave blank to keep)'}
                  </label>
                  <div className="relative">
                    <input
                      required={modal === 'create'}
                      type={showPwd ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      minLength={6}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 pr-10"
                    />
                    <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300">
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {modal === 'edit' && (
                  <div className="col-span-2 flex items-center space-x-3">
                    <label className="text-xs font-medium text-slate-400">Account Status</label>
                    <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition
                        ${form.is_active
                          ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-600/20 text-rose-400 border-rose-500/30'}`}>
                      {form.is_active ? <><CheckCircle className="h-3.5 w-3.5" /><span>Active</span></> : <><XCircle className="h-3.5 w-3.5" /><span>Inactive</span></>}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setModal(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition shadow">
                  {formLoading ? 'Saving...' : modal === 'create' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
