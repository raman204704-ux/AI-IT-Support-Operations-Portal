import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bot, Ticket, MessageSquare, LogOut, LayoutDashboard, Users, Cpu, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenLogin }) => {
  const { user, logout } = useAuth();
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-slate-100 tracking-tight">AI IT Support</span>
              {user?.role === 'admin' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium border border-amber-500/20">
                  Admin Panel
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Intelligent Troubleshooting & Ticket System</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        {user && (
          <nav className="hidden md:flex items-center space-x-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60">
            {user.role === 'employee' ? (
              <>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    activeTab === 'chat'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/50'
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>AI Support Chat</span>
                </button>
                <button
                  onClick={() => setActiveTab('my-tickets')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    activeTab === 'my-tickets'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/50'
                  }`}
                >
                  <Ticket className="h-4 w-4" />
                  <span>My Tickets</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('admin-dashboard')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    activeTab === 'admin-dashboard'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/50'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveTab('admin-users')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    activeTab === 'admin-users'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/50'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>Users</span>
                </button>
                <button
                  onClick={() => setActiveTab('admin-tickets')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    activeTab === 'admin-tickets'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/50'
                  }`}
                >
                  <Ticket className="h-4 w-4" />
                  <span>Tickets</span>
                </button>
                <button
                  onClick={() => setActiveTab('admin-chats')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    activeTab === 'admin-chats'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/50'
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Conversations</span>
                </button>
                <button
                  onClick={() => setActiveTab('admin-ai')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    activeTab === 'admin-ai'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/50'
                  }`}
                >
                  <Cpu className="h-4 w-4" />
                  <span>AI Monitor</span>
                </button>
              </>
            )}
          </nav>
        )}

        {/* Theme Toggle + User Info + Logout */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-slate-200">{user.full_name}</div>
                <div className="text-xs text-slate-400 flex items-center justify-end space-x-1">
                  <span>{user.department}</span>
                  <span className="text-slate-600">•</span>
                  <span className={`capitalize font-semibold ${user.role === 'admin' ? 'text-amber-400' : 'text-indigo-400'}`}>
                    {user.role}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Mobile Nav */}
      {user && (
        <div className="md:hidden flex overflow-x-auto border-t border-slate-800 p-2 space-x-2 bg-slate-900">
          {user.role === 'employee' ? (
            <>
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                AI Chat
              </button>
              <button
                onClick={() => setActiveTab('my-tickets')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  activeTab === 'my-tickets' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                My Tickets
              </button>
            </>
          ) : (
            <>
              {['admin-dashboard', 'admin-users', 'admin-tickets', 'admin-chats', 'admin-ai'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                    activeTab === tab ? 'bg-amber-600 text-white' : 'text-slate-400'
                  }`}
                >
                  {tab === 'admin-dashboard' ? 'Dashboard'
                    : tab === 'admin-users' ? 'Users'
                    : tab === 'admin-tickets' ? 'Tickets'
                    : tab === 'admin-chats' ? 'Conversations'
                    : 'AI Monitor'}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </header>
  );
};
