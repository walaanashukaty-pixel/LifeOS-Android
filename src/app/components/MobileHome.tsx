import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
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
import { SectionHeading } from './ui/LifeOSPrimitives';
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
  const reduceMotion = useReducedMotion();
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
    const nextTask = todayTasks.find(task => !task?.completions?.some?.((c: any) => c.date === today && c.status === 'completed'));
    return { todayTasks, doneTasks, doneHabits, progress, todayEvents, activeGoal, nextTask };
  }, [tasks, habits, goals, events, today]);

  return (
    <motion.div
      className="lifeos-page-shell md:hidden max-w-lg mx-auto space-y-6 pb-3"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.section
        className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-card p-5 shadow-sm"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.985, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: reduceMotion ? 0 : 0.03, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="absolute -left-10 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-2xl"
          animate={reduceMotion ? undefined : { x: [0, 6, 0], y: [0, 4, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-12 -right-8 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl"
          animate={reduceMotion ? undefined : { x: [0, -5, 0], y: [0, -3, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-primary">يومك في مكان واحد</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">أهلاً، {userName} 👋</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
              <motion.div
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-sm font-black text-white shadow-lg shadow-primary/20"
                initial={reduceMotion ? false : { scale: 0.85, rotate: -4 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 24, delay: 0.08 }}
              >LO</motion.div>
          </div>

          <div className="mt-5 rounded-[22px] border border-border/70 bg-background/75 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <DailyProgressRing value={summary.progress} reduceMotion={!!reduceMotion} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-primary">تقدم اليوم</p>
                <motion.p
                  key={summary.progress}
                  className="mt-0.5 text-base font-black tracking-tight text-foreground"
                  initial={reduceMotion ? false : { opacity: 0.5, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {summary.progress === 100 ? 'أنجزت يومك بالكامل ✨' : summary.progress >= 60 ? 'أنت قريب من إنهاء يومك' : 'خطوة صغيرة الآن تصنع فرقًا'}
                </motion.p>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{summary.doneTasks + summary.doneHabits} إنجاز من أصل {summary.todayTasks.length + habits.filter(habit => habitOccursToday(habit, today)).length} عناصر اليوم</p>
              </div>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={reduceMotion ? false : { width: 0 }}
                animate={{ width: `${summary.progress}%` }}
                transition={{ duration: reduceMotion ? 0.12 : 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <SummaryCell icon={<CheckCircle2 size={15} />} value={`${summary.doneTasks}/${summary.todayTasks.length}`} label="المهام" />
              <SummaryCell icon={<Activity size={15} />} value={`${summary.doneHabits}/${habits.filter(habit => habitOccursToday(habit, today)).length}`} label="العادات" />
              <SummaryCell icon={<CalendarClock size={15} />} value={String(summary.todayEvents)} label="المواعيد" />
            </div>
          </div>
        </div>
      </motion.section>

      {summary.nextTask && (
        <motion.button
          onClick={() => setPage('tasks')}
          whileTap={reduceMotion ? undefined : { scale: 0.985 }}
          className="lifeos-panel flex w-full items-center gap-3 p-3.5 text-right"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
            <CheckSquare size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold text-blue-500">التالي اليوم</p>
            <p className="mt-0.5 truncate text-sm font-bold text-foreground">{summary.nextTask.title}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{summary.nextTask.category || 'مهمة اليوم'}{summary.nextTask.plannedTime ? ` • ${summary.nextTask.plannedTime}` : ''}</p>
          </div>
          <ArrowLeft size={16} className="text-muted-foreground" />
        </motion.button>
      )}

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

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduceMotion ? 0 : 0.1, duration: 0.3 }}
      >
        <SectionHeading
          title="الوصول السريع"
          description="أهم أقسام يومك، بدون خطوات إضافية"
          trailing={<Sparkles size={17} className="text-primary" />}
        />
        <div className="grid grid-cols-2 gap-3">
          {MOBILE_SECTION_ITEMS.filter(item => ['tasks', 'habits', 'goals', 'events'].includes(item.id)).map(item => (
            <SectionCard key={item.id} item={item} onClick={() => setPage(item.id)} compact reduceMotion={!!reduceMotion} />
          ))}
        </div>
      </motion.section>

      {summary.activeGoal && (
        <motion.button
          onClick={() => setPage('goals')}
          whileTap={reduceMotion ? undefined : { scale: 0.985 }}
          whileHover={reduceMotion ? undefined : { y: -1 }}
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
                <motion.div
                  className="h-full rounded-full bg-pink-500"
                  initial={reduceMotion ? false : { width: 0 }}
                  animate={{ width: `${goalProgress(summary.activeGoal)}%` }}
                  transition={{ duration: reduceMotion ? 0.15 : 0.75, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
            <ArrowLeft size={16} className="text-muted-foreground" />
          </div>
        </motion.button>
      )}

      <motion.section
        className="space-y-5"
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduceMotion ? 0 : 0.16, duration: 0.32 }}
      >
        <SectionHeading title="كل أقسام LifeOS" description="كل أدوات حياتك مرتبة حسب المجال" />
        {MOBILE_GROUPS.map(group => {
          const items = MOBILE_SECTION_ITEMS.filter(item => item.group === group.id);
          if (!items.length) return null;
          return (
            <div key={group.id}>
              <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{group.label}</p>
              <div className="grid grid-cols-2 gap-3">
                {items.map(item => <SectionCard key={item.id} item={item} onClick={() => setPage(item.id)} reduceMotion={!!reduceMotion} />)}
              </div>
            </div>
          );
        })}
      </motion.section>

      {loading && <p className="py-2 text-center text-xs text-muted-foreground">جارٍ تحديث ملخص اليوم...</p>}
    </motion.div>
  );
}

function DailyProgressRing({ value, reduceMotion }: { value: number; reduceMotion: boolean }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className="relative flex h-[76px] w-[76px] flex-shrink-0 items-center justify-center">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r="31" fill="none" stroke="currentColor" strokeWidth="7" className="text-muted" />
        <motion.circle
          cx="40" cy="40" r="31" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round"
          className="text-primary" pathLength="1"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: safeValue / 100 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.85, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute text-sm font-black text-foreground">{safeValue}%</span>
    </div>
  );
}

function SummaryCell({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <motion.div whileHover={{ y: -1 }} className="rounded-xl bg-card px-2.5 py-2.5 text-center">
      <div className="mb-1 flex items-center justify-center gap-1 text-primary">{icon}<span className="text-sm font-bold text-foreground">{value}</span></div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </motion.div>
  );
}

function SectionCard({ item, onClick, compact = false, reduceMotion = false }: { item: (typeof MOBILE_SECTION_ITEMS)[number]; onClick: () => void; compact?: boolean; reduceMotion?: boolean }) {
  const Icon = ICONS[item.icon] || Sparkles;
  return (
    <motion.button
      onClick={onClick}
      whileTap={reduceMotion ? undefined : { scale: 0.965 }}
      whileHover={reduceMotion ? undefined : { y: -2, scale: 1.005 }}
      transition={{ type: 'spring', stiffness: 430, damping: 30 }}
      className={`lifeos-panel group w-full text-right transition-all active:scale-[0.98] ${compact ? 'p-3.5' : 'p-4 min-h-[128px]'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60" style={{ backgroundColor: `${item.color}18`, color: item.color }}>
          <motion.span whileHover={reduceMotion ? undefined : { rotate: -4, scale: 1.08 }} className="flex">
            <Icon size={19} strokeWidth={2.2} />
          </motion.span>
        </div>
        <ArrowLeft size={14} className="mt-1 text-muted-foreground/70 transition-transform group-active:-translate-x-0.5" />
      </div>
      <p className="mt-3 text-sm font-bold text-foreground">{item.shortLabel || item.label}</p>
      {!compact && <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">{item.description}</p>}
    </motion.button>
  );
}
