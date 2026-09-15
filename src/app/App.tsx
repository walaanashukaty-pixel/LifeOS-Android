// LifeOS — main app entry
import { useState, useEffect, createContext, useContext } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { getSession, signOut, subscribeToAuthChanges } from '../utils/auth';
import { AuthPage } from './components/AuthPage';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TasksPage } from './components/TasksPage';
import { HabitsPage } from './components/HabitsPage';
import { ReligiousPage } from './components/ReligiousPage';
import { FitnessPage } from './components/FitnessPage';
import { LanguagesPage } from './components/LanguagesPage';
import { SkillsPage } from './components/SkillsPage';
import { StudyPage } from './components/StudyPage';
import { GoalsPage } from './components/GoalsPage';
import { EventsPage } from './components/EventsPage';
import { AgreementsPage } from './components/AgreementsPage';
import { JournalPage } from './components/JournalPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { AIHubPage } from './agent/AIHubPage';
import { FutureVisionPage } from './components/FutureVisionPage';
import { DocumentVaultPage } from './components/DocumentVaultPage';
import { FinancePage } from './components/FinancePage';
import { MobileHome } from './components/MobileHome';
import { AccountPage } from './components/AccountPage';
import { useIsMobile } from './components/ui/use-mobile';
import { Toaster } from 'sonner';
import { resetSubscriptionIdentity } from '../utils/subscriptions';
import { MonetizationProvider } from './monetization/MonetizationProvider';
import { ConfirmDialogProvider } from './components/ui/ConfirmDialog';

export interface AppUser {
  id: string;
  email: string;
  user_metadata?: { name?: string; full_name?: string; avatar_url?: string };
}

interface AuthContextType {
  user: AppUser | null;
  logout: () => Promise<void>;
  darkMode: boolean;
  toggleDark: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  logout: async () => {},
  darkMode: false,
  toggleDark: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export type Page =
  | 'dashboard' | 'tasks' | 'habits' | 'religious' | 'fitness'
  | 'languages' | 'skills' | 'study' | 'goals' | 'events'
  | 'agreements' | 'journal' | 'analytics' | 'ai' | 'future' | 'documents' | 'finance' | 'account';

export default function App() {
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<Page>('dashboard');
  const [refreshToken, setRefreshToken] = useState(0);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('lifeos_dark') === 'true');

  useEffect(() => {
    let active = true;
    getSession().then(s => {
      if (!active) return;
      if (s?.user) setUser(s.user as AppUser);
      setLoading(false);
    });

    const unsubscribeAuth = subscribeToAuthChanges((_event, session) => {
      if (!active) return;
      setUser(session?.user ? session.user as AppUser : null);
    });
    return () => {
      active = false;
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('lifeos_dark', String(darkMode));
  }, [darkMode]);

  const logout = async () => {
    await resetSubscriptionIdentity();
    await signOut();
    setUser(null);
    setPage('dashboard');
  };

  const toggleDark = () => setDarkMode(d => !d);

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center">
        <motion.div
          aria-hidden="true"
          className="absolute h-64 w-64 rounded-full bg-primary/10 blur-3xl"
          animate={reduceMotion ? undefined : { scale: [0.9, 1.08, 0.9], opacity: [0.45, 0.8, 0.45] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col items-center gap-4"
        >
          <motion.div
            className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-primary text-primary-foreground shadow-xl shadow-primary/20"
            animate={reduceMotion ? undefined : { y: [0, -5, 0], rotate: [0, -2, 2, 0] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-xl font-black tracking-tight">LO</span>
          </motion.div>
          <div className="text-center">
            <p className="text-lg font-black text-foreground">LifeOS</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">نرتّب يومك...</p>
          </div>
          <div className="h-1 w-28 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full w-2/5 rounded-full bg-primary"
              animate={reduceMotion ? { x: 84 } : { x: [-48, 84] }}
              transition={{ duration: 1.05, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthContext.Provider value={{ user, logout, darkMode, toggleDark }}>
        <div className={darkMode ? 'dark' : ''}>
          <AuthPage onSuccess={setUser as any} />
          <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 3200, className: 'lifeos-toast' }} />
        </div>
      </AuthContext.Provider>
    );
  }

  const pageComponents: Record<Page, React.ReactNode> = {
    dashboard: isMobile ? <MobileHome setPage={setPage} /> : <Dashboard setPage={setPage} />,
    tasks: <TasksPage />,
    habits: <HabitsPage />,
    religious: <ReligiousPage />,
    fitness: <FitnessPage />,
    languages: <LanguagesPage />,
    skills: <SkillsPage />,
    study: <StudyPage />,
    goals: <GoalsPage />,
    events: <EventsPage />,
    agreements: <AgreementsPage />,
    journal: <JournalPage />,
    analytics: <AnalyticsPage />,
    ai: <AIHubPage />,
    future: <FutureVisionPage />,
    documents: <DocumentVaultPage />,
    finance: <FinancePage />,
    account: <AccountPage />,
  };

  return (
    <AuthContext.Provider value={{ user, logout, darkMode, toggleDark }}>
      <ConfirmDialogProvider>
        <MonetizationProvider userId={user.id}>
          <Layout page={page} setPage={setPage} onRefresh={() => setRefreshToken(token => token + 1)}>
            <div key={`${page}-${refreshToken}`}>
              {pageComponents[page]}
            </div>
          </Layout>
        </MonetizationProvider>
        <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 3200, className: 'lifeos-toast' }} />
      </ConfirmDialogProvider>
    </AuthContext.Provider>
  );
}
