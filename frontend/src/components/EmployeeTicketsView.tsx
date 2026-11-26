import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Ticket } from '../types';
import { Ticket as TicketIcon, Clock, CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';

export const EmployeeTicketsView: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await api.tickets.getTickets();
      setTickets(data);
    } catch (e) {
      console.error("Failed to load tickets:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (filterStatus === 'ALL') return true;
    return t.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3 mr-1" /> Open
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> In Progress
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Resolved
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <span className="text-rose-400 font-bold">Critical</span>;
      case 'HIGH':
        return <span className="text-orange-400 font-semibold">High</span>;
      case 'MEDIUM':
        return <span className="text-amber-400 font-medium">Medium</span>;
      case 'LOW':
        return <span className="text-slate-400">Low</span>;
      default:
        return <span>{priority}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center space-x-2">
            <TicketIcon className="h-6 w-6 text-indigo-400" />
            <span>My Support Tickets</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track unresolved issues escalated to the corporate IT Help Desk
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Tickets</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          <button
            onClick={loadTickets}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading your tickets...</div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <TicketIcon className="h-10 w-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-100">No Tickets Found</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            You don't have any tickets with status "{filterStatus}". If an AI troubleshooting solution doesn't work, you can raise a ticket directly from chat.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition space-y-3 shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                    {ticket.ticket_number}
                  </span>
                  <h3 className="text-base font-semibold text-slate-100">{ticket.title}</h3>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-xs text-slate-400">
                    Priority: {getPriorityBadge(ticket.priority)}
                  </div>
                  {getStatusBadge(ticket.status)}
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">{ticket.description}</p>

              {ticket.resolution_notes && (
                <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                  <span className="font-semibold block">IT Resolution Notes:</span>
                  <p>{ticket.resolution_notes}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/60">
                <div className="flex items-center space-x-3">
                  <span>Category: <strong className="text-slate-400">{ticket.category}</strong></span>
                  {ticket.conversation_id && (
                    <span>• Linked Chat: #{ticket.conversation_id}</span>
                  )}
                </div>
                <span>Created {new Date(ticket.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
