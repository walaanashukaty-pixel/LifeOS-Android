// LifeOS — main app entry
import { useState, useEffect, createContext, useContext } from 'react';
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
import { AIAssistantPage } from './components/AIAssistantPage';
import { FutureVisionPage } from './components/FutureVisionPage';
import { DocumentVaultPage } from './components/DocumentVaultPage';
import { FinancePage } from './components/FinancePage';
import { MobileHome } from './components/MobileHome';
import { AccountPage } from './components/AccountPage';
import { useIsMobile } from './components/ui/use-mobile';
import { Toaster } from 'sonner';
import { resetSubscriptionIdentity } from '../utils/subscriptions';
import { MonetizationProvider } from './monetization/MonetizationProvider';

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
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<Page>('dashboard');
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground font-medium">LifeOS يتحمل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthContext.Provider value={{ user, logout, darkMode, toggleDark }}>
        <div className={darkMode ? 'dark' : ''}>
          <AuthPage onSuccess={setUser as any} />
          <Toaster position="top-center" richColors />
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
    ai: <AIAssistantPage />,
    future: <FutureVisionPage />,
    documents: <DocumentVaultPage />,
    finance: <FinancePage />,
    account: <AccountPage />,
  };

  return (
    <AuthContext.Provider value={{ user, logout, darkMode, toggleDark }}>
      <MonetizationProvider userId={user.id}>
        <Layout page={page} setPage={setPage}>
          {pageComponents[page]}
        </Layout>
      </MonetizationProvider>
      <Toaster position="top-center" richColors />
    </AuthContext.Provider>
  );
}
