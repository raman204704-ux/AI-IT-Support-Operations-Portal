import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { ChatView } from './components/ChatView';
import { EmployeeTicketsView } from './components/EmployeeTicketsView';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminUsersView } from './components/AdminUsersView';
import { AdminTicketsView } from './components/AdminTicketsView';
import { AdminChatsView } from './components/AdminChatsView';
import { AdminAIMonitorView } from './components/AdminAIMonitorView';
import { Bot, Ticket, Cpu, Sparkles, ArrowRight } from 'lucide-react';

export default function App() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);

  // Redirect admin/employee to their default tab on login
  useEffect(() => {
    if (user) {
      if (user.role === 'admin' && !activeTab.startsWith('admin-')) {
        setActiveTab('admin-dashboard');
      } else if (user.role === 'employee' && activeTab.startsWith('admin-')) {
        setActiveTab('chat');
      }
    }
  }, [user?.role]);

  // Listen to sidebar navigation events (from admin sidebar buttons)
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail as string;
      setActiveTab(tab);
    };
    window.addEventListener('navigate-admin', handler);
    return () => window.removeEventListener('navigate-admin', handler);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center space-x-3">
          <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading IT Support Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLogin={() => setLoginModalOpen(true)}
      />

      <div className="flex-1 flex flex-col">
        {!user ? (
          /* Unauthenticated Landing */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">

            <div className="h-20 w-20 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-2xl shadow-indigo-500/20">
              <Bot className="h-10 w-10" />
            </div>

            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-400 font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Enterprise IT Operations Portal</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
                AI-Powered IT Support
              </h1>
              <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
                Empower employees with instant Groq LLM-driven IT troubleshooting and escalate unresolved issues directly to IT support tickets with full chat context.
              </p>
            </div>

            {/* Sign-in Prompt */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-xl space-y-4">
              <p className="text-sm text-slate-400 text-center">
                Sign in with your company credentials to access the portal.
              </p>
              <button
                onClick={() => setLoginModalOpen(true)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-lg shadow-indigo-600/20 group"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">🔐</span>
                  <div className="text-left">
                    <div>Sign In to IT Portal</div>
                    <div className="text-xs text-indigo-200 font-normal">Use your company email & password</div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-indigo-200 group-hover:translate-x-1 transition" />
              </button>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full pt-4 text-left">
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs">
                  <Bot className="h-4 w-4" />
                  <span>LangGraph + Groq LLM</span>
                </div>
                <p className="text-xs text-slate-400">
                  Classifies IT issues and generates fast, step-by-step troubleshooting guidance via Groq.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs">
                  <Ticket className="h-4 w-4" />
                  <span>Integrated Ticketing</span>
                </div>
                <p className="text-xs text-slate-400">
                  Seamlessly escalates unresolved issues with complete chat history attached for IT staff.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs">
                  <Cpu className="h-4 w-4" />
                  <span>IT Admin Panel</span>
                </div>
                <p className="text-xs text-slate-400">
                  Django Admin-inspired interface for real-time ticket lifecycle tracking and conversation monitoring.
                </p>
              </div>
            </div>

          </div>
        ) : (
          /* Authenticated Views */
          <>
            {user.role === 'employee' ? (
              <>
                {activeTab === 'chat' && <ChatView />}
                {activeTab === 'my-tickets' && <EmployeeTicketsView />}
              </>
            ) : (
              /* Admin views — only accessible when role === 'admin' */
              <>
                {activeTab === 'admin-dashboard' && (
                  <AdminDashboard onNavigateTab={(tab) => setActiveTab(tab)} />
                )}
                {activeTab === 'admin-users' && <AdminUsersView />}
                {activeTab === 'admin-tickets' && <AdminTicketsView />}
                {activeTab === 'admin-chats' && <AdminChatsView />}
                {activeTab === 'admin-ai' && <AdminAIMonitorView />}
              </>
            )}
          </>
        )}
      </div>

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />

    </div>
  );
}
