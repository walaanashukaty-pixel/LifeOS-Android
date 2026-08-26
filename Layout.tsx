import { useState } from 'react';
import { useAuth, Page } from '../App';
import {
  LayoutDashboard, CheckSquare, Activity, BookOpen, Dumbbell,
  Languages, Zap, GraduationCap, Target, Calendar, Handshake,
  NotebookPen, BarChart3, Bot, Eye, FolderLock, Moon, Sun,
  Menu, X, LogOut, ChevronLeft, Bell, Search, User, Wallet
} from 'lucide-react';

interface NavItem {
  id: Page;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: <LayoutDashboard size={18} />, color: '#10b981' },
  { id: 'tasks', label: 'المهام اليومية', icon: <CheckSquare size={18} />, color: '#3b82f6' },
  { id: 'habits', label: 'العادات', icon: <Activity size={18} />, color: '#8b5cf6' },
  { id: 'religious', label: 'التقدم الديني', icon: <BookOpen size={18} />, color: '#f59e0b' },
  { id: 'fitness', label: 'اللياقة البدنية', icon: <Dumbbell size={18} />, color: '#ef4444' },
  { id: 'languages', label: 'تعلم اللغات', icon: <Languages size={18} />, color: '#06b6d4' },
  { id: 'skills', label: 'تطوير المهارات', icon: <Zap size={18} />, color: '#f97316' },
  { id: 'study', label: 'الدراسة', icon: <GraduationCap size={18} />, color: '#14b8a6' },
  { id: 'goals', label: 'الأهداف', icon: <Target size={18} />, color: '#ec4899' },
  { id: 'events', label: 'الأحداث والتذكيرات', icon: <Calendar size={18} />, color: '#6366f1' },
  { id: 'agreements', label: 'الاتفاقيات والالتزامات', icon: <Handshake size={18} />, color: '#84cc16' },
  { id: 'journal', label: 'المذكرة اليومية', icon: <NotebookPen size={18} />, color: '#f59e0b' },
  { id: 'analytics', label: 'التحليلات', icon: <BarChart3 size={18} />, color: '#10b981' },
  { id: 'ai', label: 'المساعد الذكي', icon: <Bot size={18} />, color: '#8b5cf6' },
  { id: 'future', label: 'رؤية المستقبل', icon: <Eye size={18} />, color: '#06b6d4' },
  { id: 'documents', label: 'خزنة الوثائق', icon: <FolderLock size={18} />, color: '#f97316' },
  { id: 'finance', label: 'الإدارة المالية', icon: <Wallet size={18} />, color: '#22c55e' },
];

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'لوحة التحكم',
  tasks: 'المهام اليومية',
  habits: 'العادات',
  religious: 'التقدم الديني',
  fitness: 'اللياقة البدنية',
  languages: 'تعلم اللغات',
  skills: 'تطوير المهارات',
  study: 'الدراسة',
  goals: 'الأهداف',
  events: 'الأحداث والتذكيرات',
  agreements: 'الاتفاقيات والالتزامات',
  journal: 'المذكرة اليومية',
  analytics: 'التحليلات',
  ai: 'المساعد الذكي',
  future: 'رؤية المستقبل',
  documents: 'خزنة الوثائق',
  finance: 'الإدارة المالية',
};

interface LayoutProps {
  page: Page;
  setPage: (p: Page) => void;
  children: React.ReactNode;
}

export function Layout({ page, setPage, children }: LayoutProps) {
  const { user, logout, darkMode, toggleDark } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'مستخدم';

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          LO
        </div>
        {sidebarOpen && (
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sidebar-foreground text-base leading-tight">LifeOS</h1>
            <p className="text-xs text-muted-foreground truncate">نظام إدارة الحياة</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => { setPage(item.id); setMobileSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm group ${
              page === item.id
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            }`}
          >
            <span style={{ color: page === item.id ? item.color : undefined }} className="flex-shrink-0 transition-colors">
              {item.icon}
            </span>
            {sidebarOpen && <span className="truncate">{item.label}</span>}
            {page === item.id && sidebarOpen && (
              <span className="mr-auto w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-3">
        <div className={`flex items-center gap-3 ${sidebarOpen ? '' : 'justify-center'}`}>
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          {sidebarOpen && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <button onClick={logout} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded">
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex" dir="rtl">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-sidebar border-l border-sidebar-border transition-all duration-300 flex-shrink-0 ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="absolute right-0 top-0 bottom-0 w-64 bg-sidebar flex flex-col shadow-2xl">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-3 left-3 p-2 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <X size={18} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-card border-b border-border px-4 md:px-6 h-14 flex items-center gap-3 flex-shrink-0 sticky top-0 z-30">
          <button
            className="hidden md:flex p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            onClick={() => setSidebarOpen(s => !s)}
          >
            {sidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
          </button>
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>

          <h2 className="font-semibold text-foreground text-base flex-1">{PAGE_TITLES[page]}</h2>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors relative">
              <Bell size={18} />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold cursor-pointer">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
