import { useEffect, useMemo, useState } from 'react';
import { api } from '../../utils/api';
import { isTaskOnDate } from '../../utils/task-date';
import { occursOnDate } from '../../utils/recurrence';
import { localDateKey } from '../../utils/ads/reward-policy';
import { useAuth, type Page } from '../App';
import { useMonetization } from '../monetization/MonetizationProvider';
import { ProAIHomeSection } from '../agent/ProAIHomeSection';
import { ProDashboardInsightCard } from '../pro/ProDashboardInsightCard.tsx';
import { buildProDashboardInsight } from '../pro/pro-dashboard-model.ts';
import { queueAgentLaunch } from '../agent/agent-launch';
import { buildPhase2Launch, type AgentLaunchRequest } from '../agent/phase2-modes';
import { MOBILE_GROUPS, MOBILE_SECTION_ITEMS } from '../mobile/navigation';
import {
  Activity, BarChart3, BookOpen, Bot, Calendar, CheckSquare, Dumbbell, Eye,
  FolderLock, GraduationCap, Handshake, Languages, NotebookPen, Target, Wallet,
  Zap, ArrowLeft, Sparkles, Flame, CheckCircle2, CalendarClock,
} from 'lucide-react';

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>> = {
  activity: Activity,
  'bar-chart-3': BarChart3,
  'book-open': BookOpen,
  bot: Bot,
  calendar: Calendar,
  'check-square': CheckSquare,
  dumbbell: Dumbbell,
  eye: Eye,
  'folder-lock': FolderLock,
  'graduation-cap': GraduationCap,
  handshake: Handshake,
  languages: Languages,
  'notebook-pen': NotebookPen,
  target: Target,
  wallet: Wallet,
  zap: Zap,
};


function habitOccursToday(habit: any, today: string): boolean {
  return occursOnDate({ anchorDate: habit?.startDate || habit?.createdAt?.slice?.(0, 10) || today, targetDate: today, recurrence: habit?.recurrence || 'daily', repeatDays: habit?.repeatDays, recurrenceEndDate: habit?.recurrenceEndDate });
}

function habitDoneToday(habit: any, today: string): boolean {
  return habitOccursToday(habit, today) && !!habit?.logs?.some?.((log: any) => log.date === today && log.completed);
}

function goalProgress(goal: any): number {
  const raw = Number(goal?.progress ?? goal?.percentage ?? 0);
  return Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
}

export function MobileHome({ setPage }: { setPage: (page: Page) => void }) {
  const { user } = useAuth();
  const { proExperienceEnabled, proPreviewActive } = useMonetization();
  const [tasks, setTasks] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const today = localDateKey();
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'مستخدم';

  useEffect(() => {
    Promise.all([
      api('/tasks').catch(() => []),
      api('/habits').catch(() => []),
      api('/goals').catch(() => []),
      api('/events').catch(() => []),
    ]).then(([taskData, habitData, goalData, eventData]) => {
      setTasks(Array.isArray(taskData) ? taskData : []);
      setHabits(Array.isArray(habitData) ? habitData : []);
      setGoals(Array.isArray(goalData) ? goalData : []);
      setEvents(Array.isArray(eventData) ? eventData : []);
      setLoading(false);
    });
  }, []);

  function launchProAI(launch: AgentLaunchRequest) {
    queueAgentLaunch(launch);
    setPage('ai');
  }

  const proInsight = useMemo(() => buildProDashboardInsight({ date: today, tasks, events }), [today, tasks, events]);

  const summary = useMemo(() => {
    const todayTasks = tasks.filter(task => isTaskOnDate(task, today));
    const doneTasks = todayTasks.filter(task => task?.completions?.some?.((c: any) => c.date === today && c.status === 'completed')).length;
    const todayHabits = habits.filter(habit => habitOccursToday(habit, today));
    const doneHabits = todayHabits.filter(habit => habitDoneToday(habit, today)).length;
    const total = todayTasks.length + todayHabits.length;
    const done = doneTasks + doneHabits;
    const progress = total ? Math.round((done / total) * 100) : 0;
    const todayEvents = events.filter(event => occursOnDate({ anchorDate: event?.date || '', targetDate: today, recurrence: event?.recurrence, repeatDays: event?.repeatDays, recurrenceEndDate: event?.recurrenceEndDate })).length;
    const activeGoal = [...goals].sort((a, b) => goalProgress(b) - goalProgress(a))[0];
    return { todayTasks, doneTasks, doneHabits, progress, todayEvents, activeGoal };
  }, [tasks, habits, goals, events, today]);

  return (
    <div className="md:hidden max-w-md mx-auto space-y-5 pb-2">
      <section className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-card p-5 shadow-sm">
        <div className="absolute -left-10 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
        <div className="absolute -bottom-12 -right-8 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-primary">يومك في مكان واحد</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">أهلاً، {userName} 👋</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-sm font-black text-white shadow-lg shadow-primary/20">LO</div>
          </div>

          <div className="mt-5 rounded-2xl border border-border/70 bg-background/70 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">تقدم اليوم</p>
                <p className="mt-0.5 text-2xl font-bold text-foreground">{summary.progress}%</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                <Flame size={14} /> استمر
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${summary.progress}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <SummaryCell icon={<CheckCircle2 size={15} />} value={`${summary.doneTasks}/${summary.todayTasks.length}`} label="المهام" />
              <SummaryCell icon={<Activity size={15} />} value={`${summary.doneHabits}/${habits.length}`} label="العادات" />
              <SummaryCell icon={<CalendarClock size={15} />} value={String(summary.todayEvents)} label="مواعيد اليوم" />
            </div>
          </div>
        </div>
      </section>

      {proPreviewActive && (
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] px-4 py-3 text-xs leading-5 text-primary">
          <span className="font-black">معاينة LifeOS Pro</span> — الواجهة فقط متاحة للفحص؛ ما في خطط أو إجراءات AI وهمية.
        </div>
      )}

      {proExperienceEnabled && (
        <ProDashboardInsightCard
          insight={proInsight}
          onPlanDay={() => launchProAI(buildPhase2Launch('day_plan'))}
          onAskLifeOS={() => setPage('ai')}
        />
      )}

      {proExperienceEnabled && <ProAIHomeSection onLaunch={launchProAI} compact />}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">الوصول السريع</p>
            <p className="text-xs text-muted-foreground">الأشياء التي تحتاجها كل يوم</p>
          </div>
          <Sparkles size={17} className="text-primary" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {MOBILE_SECTION_ITEMS.filter(item => ['tasks', 'habits', 'goals', 'events'].includes(item.id)).map(item => (
            <SectionCard key={item.id} item={item} onClick={() => setPage(item.id)} compact />
          ))}
        </div>
      </section>

      {summary.activeGoal && (
        <button
          onClick={() => setPage('goals')}
          className="w-full rounded-2xl border border-border bg-card p-4 text-right shadow-sm transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-500"><Target size={20} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-foreground">{summary.activeGoal.title || summary.activeGoal.name || 'هدفك الحالي'}</p>
                <span className="text-xs font-bold text-pink-500">{goalProgress(summary.activeGoal)}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-pink-500" style={{ width: `${goalProgress(summary.activeGoal)}%` }} />
              </div>
            </div>
            <ArrowLeft size={16} className="text-muted-foreground" />
          </div>
        </button>
      )}

      <section className="space-y-5">
        <div>
          <p className="text-sm font-bold text-foreground">كل أقسام LifeOS</p>
          <p className="text-xs text-muted-foreground">ادخل لأي قسم مباشرة — بدون قوائم جانبية</p>
        </div>
        {MOBILE_GROUPS.map(group => {
          const items = MOBILE_SECTION_ITEMS.filter(item => item.group === group.id);
          if (!items.length) return null;
          return (
            <div key={group.id}>
              <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{group.label}</p>
              <div className="grid grid-cols-2 gap-3">
                {items.map(item => <SectionCard key={item.id} item={item} onClick={() => setPage(item.id)} />)}
              </div>
            </div>
          );
        })}
      </section>

      {loading && <p className="py-2 text-center text-xs text-muted-foreground">جارٍ تحديث ملخص اليوم...</p>}
    </div>
  );
}

function SummaryCell({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-card px-2.5 py-2.5 text-center">
      <div className="mb-1 flex items-center justify-center gap-1 text-primary">{icon}<span className="text-sm font-bold text-foreground">{value}</span></div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionCard({ item, onClick, compact = false }: { item: (typeof MOBILE_SECTION_ITEMS)[number]; onClick: () => void; compact?: boolean }) {
  const Icon = ICONS[item.icon] || Sparkles;
  return (
    <button
      onClick={onClick}
      className={`group w-full rounded-2xl border border-border bg-card text-right shadow-sm transition-all active:scale-[0.98] ${compact ? 'p-3.5' : 'p-4 min-h-[128px]'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: `${item.color}18`, color: item.color }}>
          <Icon size={19} strokeWidth={2.2} />
        </div>
        <ArrowLeft size={14} className="mt-1 text-muted-foreground/70 transition-transform group-active:-translate-x-0.5" />
      </div>
      <p className="mt-3 text-sm font-bold text-foreground">{item.shortLabel || item.label}</p>
      {!compact && <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">{item.description}</p>}
    </button>
  );
}
