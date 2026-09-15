import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useAuth, Page } from '../App';
import { MOBILE_PRIMARY_NAV } from '../mobile/navigation';
import { NotificationCenter } from './NotificationCenter';
import { useMonetization } from '../monetization/MonetizationProvider';
import { PullToRefresh } from './ui/PullToRefresh';
import { hapticSelection } from '../../utils/haptics';
import { dispatchAndroidBack } from '../../utils/android-back';
import { getDueNotificationRecords, setupNotificationDeepLinkListener } from '../../utils/notifications';
import {
  LayoutDashboard, CheckSquare, Activity, BookOpen, Dumbbell,
  Languages, Zap, GraduationCap, Target, Calendar, Handshake,
  NotebookPen, BarChart3, Bot, Eye, FolderLock, Moon, Sun,
  Menu, LogOut, ChevronLeft, Bell, User, Wallet, Home, WifiOff,
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
  onRefresh?: () => void | Promise<void>;
}

export function Layout({ page, setPage, children, onRefresh }: LayoutProps) {
  const reduceMotion = useReducedMotion();
  const { user, logout, darkMode, toggleDark } = useAuth();
  const { isPro } = useMonetization();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [headerCompact, setHeaderCompact] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [slowNetwork, setSlowNetwork] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  const swipeStart = useRef<{ x: number; y: number; blocked: boolean } | null>(null);
  const pageHistoryRef = useRef<Page[]>([]);
  const lastPageRef = useRef<Page>(page);
  const nativeBackNavigationRef = useRef(false);
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'مستخدم';
  const userId = user?.id || '';


  const navigateWithFeedback = (nextPage: Page) => {
    if (nextPage === page) return;
    hapticSelection();
    setPage(nextPage);
  };

  const handleMainTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 1) return;
    const target = event.target as HTMLElement;
    swipeStart.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
      blocked: !!target.closest('input, textarea, select, [role="dialog"], [data-swipe-block="true"]'),
    };
  };

  const handleMainTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || start.blocked || event.changedTouches.length !== 1) return;

    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 76 || Math.abs(dx) < Math.abs(dy) * 1.35) return;

    const currentIndex = MOBILE_PRIMARY_NAV.findIndex(item => item.id === page);
    if (currentIndex < 0) return;
    const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
    const next = MOBILE_PRIMARY_NAV[nextIndex];
    if (next) navigateWithFeedback(next.id);
  };

  const handleMainScroll = (event: React.UIEvent<HTMLElement>) => {
    const target = event.currentTarget;
    const top = target.scrollTop;
    const compact = top > 28;
    setHeaderCompact(previous => previous === compact ? previous : compact);
  };

  useEffect(() => {
    if (lastPageRef.current === page) return;
    if (!nativeBackNavigationRef.current) {
      const history = pageHistoryRef.current;
      if (history[history.length - 1] !== lastPageRef.current) history.push(lastPageRef.current);
      if (history.length > 24) history.shift();
    } else {
      nativeBackNavigationRef.current = false;
    }
    lastPageRef.current = page;
  }, [page]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let removeListener = () => {};
    CapacitorApp.addListener('backButton', async () => {
      if (dispatchAndroidBack()) return;

      const previousPage = pageHistoryRef.current.pop();
      if (previousPage && previousPage !== page) {
        nativeBackNavigationRef.current = true;
        hapticSelection();
        setPage(previousPage);
        return;
      }

      if (page !== 'dashboard') {
        nativeBackNavigationRef.current = true;
        setPage('dashboard');
        return;
      }

      await CapacitorApp.exitApp();
    }).then(handle => { removeListener = () => void handle.remove(); });
    return () => removeListener();
  }, [page, setPage]);

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
    const updateConnection = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, []);

  useEffect(() => {
    let timer: number | null = null;
    const onActivity = (event: Event) => {
      const pending = Number((event as CustomEvent<{ pending?: number }>).detail?.pending || 0);
      if (pending <= 0) {
        if (timer !== null) window.clearTimeout(timer);
        timer = null;
        setSlowNetwork(false);
        return;
      }
      if (timer === null) timer = window.setTimeout(() => setSlowNetwork(true), 6500);
    };
    window.addEventListener('lifeos:network-activity', onActivity);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener('lifeos:network-activity', onActivity);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const viewport = window.visualViewport;
    let baseline = viewport.height;

    const isEditable = () => {
      const active = document.activeElement as HTMLElement | null;
      return !!active?.matches('input, textarea, select, [contenteditable="true"]');
    };

    const syncKeyboard = () => {
      if (!isEditable()) {
        baseline = Math.max(baseline, viewport.height);
        setKeyboardOpen(false);
        return;
      }
      setKeyboardOpen(baseline - viewport.height > 120);
    };

    const onFocusOut = () => window.setTimeout(() => {
      if (!isEditable()) setKeyboardOpen(false);
    }, 80);

    viewport.addEventListener('resize', syncKeyboard);
    document.addEventListener('focusin', syncKeyboard);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      viewport.removeEventListener('resize', syncKeyboard);
      document.removeEventListener('focusin', syncKeyboard);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

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
            type="button"
            key={item.id}
            aria-current={page === item.id ? 'page' : undefined}
            onClick={() => navigateWithFeedback(item.id)}
            className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
              page === item.id
                ? 'bg-primary/10 font-bold text-primary shadow-[inset_-2px_0_0_var(--primary)]'
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
          <button type="button" aria-label="فتح حسابي" onClick={() => navigateWithFeedback('account')} className="lifeos-touch-target flex flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
            {userName.charAt(0).toUpperCase()}
          </button>
          {sidebarOpen && (
            <>
              <button type="button" onClick={() => navigateWithFeedback('account')} className="min-h-11 min-w-0 flex-1 rounded-lg text-right focus-visible:outline-offset-2">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{userName}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </button>
              <button type="button" aria-label="تسجيل الخروج" onClick={logout} className="lifeos-touch-target flex items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"><LogOut size={16} /></button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="lifeos-app-shell flex bg-background selection:bg-primary/20" dir="rtl">
      <aside className={`hidden flex-shrink-0 flex-col border-l border-sidebar-border bg-sidebar transition-all duration-300 md:flex ${sidebarOpen ? 'w-64' : 'w-16'}`}>
        {sidebarContent}
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header
          className={`lifeos-app-header z-30 flex flex-shrink-0 items-center gap-2.5 border-b px-3 md:h-14 md:px-6 ${headerCompact ? 'border-border/90 bg-card shadow-sm' : 'border-border bg-card'}`}
        >
          <button type="button" aria-label={sidebarOpen ? 'طي القائمة الجانبية' : 'فتح القائمة الجانبية'} className="lifeos-touch-target hidden items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted md:flex" onClick={() => setSidebarOpen(s => !s)}>
            {sidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-extrabold leading-none text-foreground md:text-base md:font-semibold md:leading-normal">{page === 'dashboard' ? <><span className="md:hidden">LifeOS</span><span className="hidden md:inline">{PAGE_TITLES[page]}</span></> : PAGE_TITLES[page]}</h2>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            {isPro && (
              <span className="hidden rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary sm:inline-flex">PRO ✨</span>
            )}
            <button type="button" aria-label={darkMode ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'} onClick={toggleDark} className="lifeos-touch-target hidden items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted md:flex">{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button type="button" aria-label={unreadCount > 0 ? `الإشعارات، ${unreadCount} غير مقروءة` : 'الإشعارات'} onClick={() => setNotificationsOpen(true)} className="lifeos-touch-target relative flex items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted">
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute -left-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
            <button type="button" aria-label="فتح حسابي" aria-current={page === 'account' ? 'page' : undefined} onClick={() => navigateWithFeedback('account')} className={`lifeos-touch-target flex items-center justify-center rounded-2xl text-sm font-bold transition ${page === 'account' ? 'bg-primary text-white' : 'bg-primary/15 text-primary'}`}>
              {userName.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        <AnimatePresence initial={false}>
          {!isOnline && (
            <motion.div
              role="status"
              aria-live="polite"
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            >
              <div className="flex min-h-9 items-center justify-center gap-2 px-4 py-2 text-xs font-bold"><WifiOff size={14} /> أنت غير متصل بالإنترنت — بعض عمليات الحفظ والمزامنة ستنتظر عودة الاتصال.</div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {isOnline && slowNetwork && (
            <motion.div
              role="status"
              aria-live="polite"
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-sky-500/15 bg-sky-500/[0.07] text-sky-700 dark:text-sky-300"
            >
              <div className="flex min-h-9 items-center justify-center gap-2 px-4 py-2 text-xs font-bold">الاتصال بطيء — ما زلنا نحاول إكمال الطلب بأمان.</div>
            </motion.div>
          )}
        </AnimatePresence>

        <main
          ref={mainRef}
          data-keyboard-open={keyboardOpen}
          className="lifeos-main lifeos-scroll-region min-h-0 flex-1 overflow-y-auto px-3 pb-32 pt-3 sm:px-4 md:p-7"
          onTouchStart={handleMainTouchStart}
          onTouchEnd={handleMainTouchEnd}
          onScroll={handleMainScroll}
        >
          <PullToRefresh onRefresh={onRefresh}>
            <AnimatePresence initial={false}>
              <motion.div
                key={page}
                initial={reduceMotion ? false : { opacity: 0, y: 7, scale: 0.997 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -3, scale: 0.999 }}
                transition={{ duration: reduceMotion ? 0.01 : 0.16, ease: [0.22, 1, 0.36, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </PullToRefresh>
        </main>
      </div>

      <nav aria-label="التنقل الرئيسي" data-keyboard-open={keyboardOpen} className="lifeos-bottom-nav pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 md:hidden" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        <div className="pointer-events-auto mx-auto grid max-w-md grid-cols-5 rounded-[26px] border border-border/80 bg-card/90 px-1 py-1.5 shadow-[0_18px_55px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
          {MOBILE_PRIMARY_NAV.map(item => {
            const Icon = MOBILE_ICONS[item.id] || Home;
            const active = page === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
                onClick={() => navigateWithFeedback(item.id)}
                whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                className="flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1"
              >
                <span className={`relative flex h-8 min-w-11 items-center justify-center rounded-2xl ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                  {active && (
                    <motion.span
                      layoutId="lifeos-mobile-nav-active"
                      className="absolute inset-0 rounded-2xl border border-primary/15 bg-primary/12 shadow-sm"
                      transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.7 }}
                    />
                  )}
                  <motion.span
                    className="relative z-10 flex"
                    animate={reduceMotion ? undefined : active ? { scale: 1.08, y: -1 } : { scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  >
                    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                  </motion.span>
                </span>
                <span className={`text-[10px] ${active ? 'font-bold text-primary' : 'font-medium text-muted-foreground'}`}>{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </nav>

      <NotificationCenter userId={userId} open={notificationsOpen} onClose={() => setNotificationsOpen(false)} onNavigate={next => setPage(next)} />
    </div>
  );
}
