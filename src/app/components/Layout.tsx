import { useEffect, useState } from 'react';
import { useAuth, Page } from '../App';
import { MOBILE_PRIMARY_NAV } from '../mobile/navigation';
import { NotificationCenter } from './NotificationCenter';
import { getDueNotificationRecords, setupNotificationDeepLinkListener } from '../../utils/notifications';
import {
  LayoutDashboard, CheckSquare, Activity, BookOpen, Dumbbell,
  Languages, Zap, GraduationCap, Target, Calendar, Handshake,
  NotebookPen, BarChart3, Bot, Eye, FolderLock, Moon, Sun,
  Menu, LogOut, ChevronLeft, Bell, User, Wallet, Home,
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
  account: 'حسابي',
};

const MOBILE_ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  dashboard: Home,
  tasks: CheckSquare,
  habits: Activity,
  goals: Target,
  account: User,
};

interface LayoutProps {
  page: Page;
  setPage: (p: Page) => void;
  children: React.ReactNode;
}

export function Layout({ page, setPage, children }: LayoutProps) {
  const { user, logout, darkMode, toggleDark } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'مستخدم';
  const userId = user?.id || '';

  useEffect(() => {
    if (!userId) return;
    const refresh = () => setUnreadCount(getDueNotificationRecords(userId).filter(item => !item.read).length);
    refresh();
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener('lifeos:notifications-changed', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('lifeos:notifications-changed', refresh);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cleanup = () => {};
    setupNotificationDeepLinkListener(userId, nextPage => {
      setPage(nextPage);
      setNotificationsOpen(false);
    }).then(fn => { cleanup = fn; });
    return () => cleanup();
  }, [userId, setPage]);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">LO</div>
        {sidebarOpen && (
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold leading-tight text-sidebar-foreground">LifeOS</h1>
            <p className="truncate text-xs text-muted-foreground">نظام إدارة الحياة</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
              page === item.id
                ? 'bg-primary/10 font-semibold text-primary'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            }`}
          >
            <span style={{ color: page === item.id ? item.color : undefined }} className="flex-shrink-0 transition-colors">{item.icon}</span>
            {sidebarOpen && <span className="truncate">{item.label}</span>}
            {page === item.id && sidebarOpen && <span className="mr-auto h-1.5 w-1.5 rounded-full bg-primary" />}
          </button>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className={`flex items-center gap-3 ${sidebarOpen ? '' : 'justify-center'}`}>
          <button onClick={() => setPage('account')} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
            {userName.charAt(0).toUpperCase()}
          </button>
          {sidebarOpen && (
            <>
              <button onClick={() => setPage('account')} className="min-w-0 flex-1 text-right">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{userName}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </button>
              <button onClick={logout} className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"><LogOut size={16} /></button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background" dir="rtl">
      <aside className={`hidden flex-shrink-0 flex-col border-l border-sidebar-border bg-sidebar transition-all duration-300 md:flex ${sidebarOpen ? 'w-64' : 'w-16'}`}>
        {sidebarContent}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[60px] flex-shrink-0 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur-md md:h-14 md:px-6">
          <button className="hidden rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted md:flex" onClick={() => setSidebarOpen(s => !s)}>
            {sidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-foreground md:font-semibold">{page === 'dashboard' ? <><span className="md:hidden">LifeOS</span><span className="hidden md:inline">{PAGE_TITLES[page]}</span></> : PAGE_TITLES[page]}</h2>
            {page === 'dashboard' && <p className="text-[10px] text-muted-foreground md:hidden">نظام إدارة حياتك</p>}
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            <button onClick={toggleDark} className="hidden rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted md:block">{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button onClick={() => setNotificationsOpen(true)} className="relative rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-muted">
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute -left-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
            <button onClick={() => setPage('account')} className={`flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-bold transition ${page === 'account' ? 'bg-primary text-white' : 'bg-primary/15 text-primary'}`}>
              {userName.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-28 md:p-6">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 shadow-[0_-10px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto grid max-w-md grid-cols-5 px-1 py-1.5">
          {MOBILE_PRIMARY_NAV.map(item => {
            const Icon = MOBILE_ICONS[item.id] || Home;
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => setPage(item.id)} className="flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1 transition active:scale-95">
                <span className={`flex h-8 min-w-11 items-center justify-center rounded-2xl transition-all ${active ? 'bg-primary/12 text-primary' : 'text-muted-foreground'}`}><Icon size={20} strokeWidth={active ? 2.5 : 2} /></span>
                <span className={`text-[10px] ${active ? 'font-bold text-primary' : 'font-medium text-muted-foreground'}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <NotificationCenter userId={userId} open={notificationsOpen} onClose={() => setNotificationsOpen(false)} onNavigate={next => setPage(next)} />
    </div>
  );
}
