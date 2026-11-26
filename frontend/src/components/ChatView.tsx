import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { ConversationSummary, ConversationDetail } from '../types';
import { TicketModal } from './TicketModal';
import {
  Bot,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Ticket,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface ChatViewProps {
  onOpenTicketDesk?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = () => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Ticket modal state
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketInitialTitle, setTicketInitialTitle] = useState('');
  const [ticketInitialDesc, setTicketInitialDesc] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    "My laptop is connected to Wi-Fi, but the internet is not working.",
    "Outlook is not syncing my emails and shows disconnected.",
    "Corporate VPN connection fails with Gateway Unreachable.",
    "How do I install company approved software like Slack or Teams?",
  ];

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      loadConversationDetail(activeConversationId);
    }
  }, [activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, loading]);

  const loadConversations = async () => {
    try {
      const list = await api.chat.getConversations();
      setConversations(list);
      if (list.length > 0 && !activeConversationId) {
        setActiveConversationId(list[0].id);
      }
    } catch (e) {
      console.error("Failed to load conversations:", e);
    }
  };

  const loadConversationDetail = async (id: number) => {
    try {
      const detail = await api.chat.getConversation(id);
      setActiveConversation(detail);
      setFeedbackSuccess(null);
    } catch (e) {
      console.error("Failed to load conversation details:", e);
    }
  };

  const handleStartNewChat = async () => {
    try {
      const newConv = await api.chat.createConversation();
      setConversations([
        {
          id: newConv.id,
          title: newConv.title,
          status: newConv.status,
          is_resolved: newConv.is_resolved,
          created_at: newConv.created_at,
          updated_at: newConv.updated_at,
          message_count: 0,
          user_id: newConv.user_id,
        },
        ...conversations,
      ]);
      setActiveConversationId(newConv.id);
      setActiveConversation(newConv);
    } catch (e) {
      console.error("Failed to start new conversation:", e);
    }
  };

  const handleDeleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await api.chat.deleteConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (activeConversationId === id) {
        if (remaining.length > 0) {
          setActiveConversationId(remaining[0].id);
        } else {
          setActiveConversationId(null);
          setActiveConversation(null);
        }
      }
    } catch (e) {
      console.error("Failed to delete conversation:", e);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    setInputText('');
    setLoading(true);

    try {
      const res = await api.chat.sendMessage(text, activeConversationId || undefined);
      setActiveConversationId(res.conversation_id);
      await loadConversationDetail(res.conversation_id);
      await loadConversations();
    } catch (err: any) {
      alert("Error sending message: " + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (resolved: boolean) => {
    if (!activeConversationId) return;

    try {
      await api.chat.sendFeedback(activeConversationId, resolved);
      if (resolved) {
        setFeedbackSuccess("Great! Your issue has been marked as resolved.");
        await loadConversationDetail(activeConversationId);
        await loadConversations();
      } else {
        // Unresolved -> Open Ticket Form
        const lastUserMsg = activeConversation?.messages
          .filter((m) => m.sender === 'user')
          .slice(-1)[0]?.content || 'IT Problem Unresolved';

        setTicketInitialTitle(activeConversation?.title || 'IT Support Assistance Required');
        setTicketInitialDesc(`Issue reported: "${lastUserMsg}". AI troubleshooting steps were tried but the issue persists.`);
        setTicketModalOpen(true);
      }
    } catch (err: any) {
      alert("Failed to record feedback: " + err.message);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-950 overflow-hidden">
      
      {/* Sidebar: Conversation History */}
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800">
          <button
            onClick={handleStartNewChat}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>New IT Conversation</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <div className="text-xs font-semibold text-slate-500 px-3 py-1 uppercase tracking-wider">
            Previous Inquiries
          </div>

          {conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              No conversations yet. Ask your first IT question!
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer text-sm transition border ${
                    isActive
                      ? 'bg-slate-800 border-indigo-500/40 text-slate-100 shadow-sm'
                      : 'hover:bg-slate-800/50 border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="truncate font-medium">{conv.title}</div>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1">
                      {conv.is_resolved ? (
                        <span className="flex items-center text-emerald-400 text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Solved
                        </span>
                      ) : conv.status === 'ticket_raised' ? (
                        <span className="flex items-center text-amber-400 text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          <Ticket className="h-2.5 w-2.5 mr-1" /> Ticket
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                          Active
                        </span>
                      )}
                      <span>•</span>
                      <span>{new Date(conv.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col bg-slate-950 relative">
        
        {/* Chat Header */}
        <div className="h-14 border-b border-slate-800 bg-slate-900/40 backdrop-blur px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Bot className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                {activeConversation?.title || "New Support Inquiries"}
              </h2>
              <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                <span>Groq LLM Powered Troubleshooting</span>
                {activeConversation?.is_resolved && (
                  <span className="text-emerald-400 font-medium">✓ Resolved</span>
                )}
              </div>
            </div>
          </div>

          {activeConversationId && (
            <button
              onClick={() => {
                setTicketInitialTitle(activeConversation?.title || 'IT Support Ticket');
                setTicketInitialDesc('Manual escalation from chat session #' + activeConversationId);
                setTicketModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition"
            >
              <Ticket className="h-3.5 w-3.5" />
              <span>Raise Ticket</span>
            </button>
          )}
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl w-full mx-auto">
          {!activeConversation || activeConversation.messages.length === 0 ? (
            <div className="py-12 text-center space-y-6">
              <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400 shadow-xl shadow-indigo-500/10">
                <Sparkles className="h-8 w-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-bold text-slate-100 tracking-tight">
                  How can IT Support assist you today?
                </h3>
                <p className="text-sm text-slate-400">
                  Ask any question regarding Wi-Fi, VPN, Outlook sync, software installation, or access permissions.
                </p>
              </div>

              {/* Sample Prompt Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto pt-4 text-left">
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-300 hover:text-slate-100 transition group flex items-start justify-between"
                  >
                    <span>{prompt}</span>
                    <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 shrink-0 ml-2 mt-0.5 transition" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            activeConversation.messages.map((msg, index) => {
              const isUser = msg.sender === 'user';
              const isLastMessage = index === activeConversation.messages.length - 1;

              return (
                <div
                  key={msg.id || index}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}
                >
                  <div className="flex items-center space-x-2 text-xs text-slate-500 px-1">
                    <span className="font-medium text-slate-400">
                      {isUser ? 'You' : 'AI IT Support Assistant'}
                    </span>
                    <span>•</span>
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`rounded-2xl p-4 max-w-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-br-sm shadow-md'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-sm shadow-lg'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>

                  {/* Feedback Card (Shown on the last assistant message) */}
                  {!isUser && isLastMessage && (
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 max-w-xl w-full mt-2 space-y-2.5">
                      <div className="text-xs font-semibold text-slate-300 flex items-center space-x-2">
                        <ShieldCheck className="h-4 w-4 text-indigo-400" />
                        <span>Did this resolve your issue?</span>
                      </div>

                      {feedbackSuccess ? (
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center space-x-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>{feedbackSuccess}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3 pt-1">
                          <button
                            onClick={() => handleFeedback(true)}
                            className="flex items-center space-x-1.5 py-1.5 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Yes, problem solved</span>
                          </button>

                          <button
                            onClick={() => handleFeedback(false)}
                            className="flex items-center space-x-1.5 py-1.5 px-3 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-medium transition"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>No, problem still exists</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })
          )}

          {loading && (
            <div className="flex items-start space-y-2">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-sm text-slate-400 flex items-center space-x-3">
                <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span>Formulating troubleshooting steps with Groq AI...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 backdrop-blur">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="max-w-4xl mx-auto flex items-center space-x-3"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe your IT issue (e.g. My laptop is connected to Wi-Fi, but internet is not working)..."
              disabled={loading}
              className="flex-1 bg-slate-800/90 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/20 flex items-center space-x-2"
            >
              <span>Send</span>
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

      </main>

      {/* Ticket Modal */}
      <TicketModal
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        conversationId={activeConversationId || undefined}
        initialTitle={ticketInitialTitle}
        initialDescription={ticketInitialDesc}
        onTicketCreated={() => {
          if (activeConversationId) {
            loadConversationDetail(activeConversationId);
            loadConversations();
          }
        }}
      />

    </div>
  );
};
