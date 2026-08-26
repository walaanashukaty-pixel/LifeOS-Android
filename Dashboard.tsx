import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useAuth, Page } from '../App';
import {
  CheckCircle2, Percent, BookOpen, Dumbbell,
  TrendingUp, Flame, Star, ArrowLeft, Loader2,
  Target, Activity, Sparkles, Check, X,
  RotateCcw
} from 'lucide-react';

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-emerald-500',
};

interface DashboardProps {
  setPage: (p: Page) => void;
}

const QUOTES = [
  'من جدّ وجد، ومن زرع حصد.',
  'النجاح ليس نهائياً، والفشل ليس مميتاً — المهم هو الشجاعة على الاستمرار.',
  'ابدأ بما تستطيع، واستخدم ما لديك، وافعل ما تستطيع.',
  'الطريق إلى النجاح مليء بالنساء والرجال الذين دفعوا ثمن الانجازات بالعمل الجاد.',
  'لا تقل "لا أستطيع" قبل أن تجرب.',
  'كل يوم هو فرصة جديدة لتكون أفضل من أمس.',
];

const AYAHS = [
  { text: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', source: 'سورة الشرح: 5' },
  { text: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', source: 'سورة الطلاق: 3' },
  { text: 'إِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ', source: 'سورة التوبة: 120' },
  { text: 'وَقُل رَّبِّ زِدْنِي عِلْمًا', source: 'سورة طه: 114' },
];

export function Dashboard({ setPage }: DashboardProps) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];
  const quoteIndex = new Date().getDay();
  const ayahIndex = new Date().getDate() % AYAHS.length;
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'مستخدم';

  useEffect(() => {
    Promise.all([
      api('/analytics').catch(() => null),
      api('/tasks').catch(() => []),
      api('/habits').catch(() => []),
      api('/goals').catch(() => []),
    ]).then(([a, t, h, g]) => {
      setAnalytics(a);
      setTasks(Array.isArray(t) ? t : []);
      setHabits(Array.isArray(h) ? h : []);
      setGoals(Array.isArray(g) ? g : []);
      setLoading(false);
    });
  }, []);

  const todayTasks = tasks.filter(t => {
    if (t.recurrence === 'daily') return true;
    if (t.recurrence === 'weekly') return new Date(t.startDate || t.createdAt).getDay() === new Date().getDay();
    if (t.recurrence === 'monthly') return new Date(t.startDate || t.createdAt).getDate() === new Date().getDate();
    const start = t.startDate || t.createdAt?.split('T')[0];
    const end   = t.endDate;
    if (start && start > today) return false;
    if (end   && end   < today) return false;
    return true;
  });
  const completedToday = todayTasks.filter(t => t.completions?.some((c: any) => c.date === today && c.status === 'completed')).length;
  const totalToday = todayTasks.length;
  const completionPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  const streakDays = habits.reduce((max, h) => {
    const streak = calcStreak(h.logs || []);
    return streak > max ? streak : max;
  }, 0);

  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const count = tasks.filter(t => t.completions?.some((c: any) => c.date === dateStr && c.status === 'completed')).length;
    return {
      label: ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب'][d.getDay()],
      count,
      isToday: i === 6,
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary mx-auto mb-3" size={32} />
          <p className="text-muted-foreground">جارٍ تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مرحباً، {userName} 👋</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl text-sm font-medium">
          <Flame size={16} />
          <span>{streakDays} يوم متتالي</span>
        </div>
      </div>

      {/* Today Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<CheckCircle2 size={20} />}
          label="مكتمل اليوم"
          value={String(completedToday)}
          color="text-primary"
          bg="bg-primary/10"
          sub={`من ${totalToday} مهمة`}
        />
        <StatCard
          icon={<Percent size={20} />}
          label="نسبة الإنجاز"
          value={`${completionPct}%`}
          color="text-blue-500"
          bg="bg-blue-500/10"
          progress={completionPct}
        />
        <StatCard
          icon={<BookOpen size={20} />}
          label="صفحات القرآن"
          value={String(analytics?.quran?.pagestoday || 0)}
          color="text-amber-500"
          bg="bg-amber-500/10"
          sub="اليوم"
        />
        <StatCard
          icon={<Dumbbell size={20} />}
          label="التمارين"
          value={String(analytics?.workouts?.total || 0)}
          color="text-red-500"
          bg="bg-red-500/10"
          sub="الإجمالي"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Chart — pure CSS, no recharts */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-foreground">نشاط الأسبوع</h3>
            <TrendingUp size={16} className="text-muted-foreground" />
          </div>
          <WeekBarChart data={weekData} />
        </div>

        {/* Inspiration */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-primary/20 to-emerald-600/10 rounded-2xl border border-primary/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-primary" />
              <span className="text-sm font-medium text-primary">آية اليوم</span>
            </div>
            <p className="text-foreground font-semibold text-lg leading-relaxed mb-1">
              ﴿{AYAHS[ayahIndex].text}﴾
            </p>
            <p className="text-sm text-muted-foreground">{AYAHS[ayahIndex].source}</p>
          </div>
          <div className="bg-gradient-to-br from-accent/10 to-amber-500/5 rounded-2xl border border-accent/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Star size={16} className="text-accent" />
              <span className="text-sm font-medium text-accent">اقتباس اليوم</span>
            </div>
            <p className="text-foreground text-sm leading-relaxed">{QUOTES[quoteIndex]}</p>
          </div>
        </div>
      </div>

      {/* Today Tasks + Goals + Habits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Today's Tasks mini-list */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 size={16} className="text-blue-500" /> مهام اليوم
            </h3>
            <button onClick={() => setPage('tasks')} className="text-xs text-primary hover:underline flex items-center gap-1">
              عرض الكل <ArrowLeft size={12} />
            </button>
          </div>
          {todayTasks.length === 0 ? (
            <EmptyState label="لا مهام لليوم" action="أضف مهمة" onClick={() => setPage('tasks')} />
          ) : (
            <div className="space-y-2">
              {todayTasks.slice(0, 6).map((t: any) => {
                const isCompleted = t.completions?.some((c: any) => c.date === today && c.status === 'completed');
                const isMissed    = t.completions?.some((c: any) => c.date === today && c.status === 'incomplete');
                return (
                  <div key={t.id} className={`flex items-center gap-3 py-2 px-3 rounded-xl transition-colors ${isCompleted ? 'bg-emerald-500/5' : isMissed ? 'bg-red-500/5' : 'hover:bg-muted/50'}`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority] || 'bg-muted-foreground'}`} />
                    <span className={`flex-1 text-sm truncate ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {t.title}
                    </span>
                    {isCompleted ? (
                      <Check size={13} className="text-emerald-500 flex-shrink-0" />
                    ) : isMissed ? (
                      <X size={13} className="text-red-500 flex-shrink-0" />
                    ) : t.recurrence ? (
                      <RotateCcw size={11} className="text-blue-400 flex-shrink-0" />
                    ) : t.endDate ? (
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {new Date(t.endDate).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                      </span>
                    ) : null}
                  </div>
                );
              })}
              {todayTasks.length > 6 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{todayTasks.length - 6} مهام أخرى
                </p>
              )}
            </div>
          )}
        </div>

        {/* Goals */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Target size={16} className="text-pink-500" /> الأهداف
            </h3>
            <button onClick={() => setPage('goals')} className="text-xs text-primary hover:underline flex items-center gap-1">
              عرض الكل <ArrowLeft size={12} />
            </button>
          </div>
          {goals.length === 0 ? (
            <EmptyState label="لا توجد أهداف بعد" action="أضف هدفاً" onClick={() => setPage('goals')} />
          ) : (
            <div className="space-y-3">
              {goals.slice(0, 4).map((g: any) => (
                <div key={g.id} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground font-medium truncate">{g.title}</span>
                    <span className="text-muted-foreground flex-shrink-0 mr-2">{g.progress || 0}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${g.progress || 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Habits */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Activity size={16} className="text-purple-500" /> العادات اليومية
          </h3>
          <button onClick={() => setPage('habits')} className="text-xs text-primary hover:underline flex items-center gap-1">
            عرض الكل <ArrowLeft size={12} />
          </button>
        </div>
        {habits.length === 0 ? (
          <EmptyState label="لا توجد عادات بعد" action="أضف عادة" onClick={() => setPage('habits')} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {habits.slice(0, 6).map((h: any, i) => {
              const done = h.logs?.some((l: any) => l.date === today && l.completed);
              return (
                <div key={h.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${done ? 'border-primary/20 bg-primary/5' : 'border-border'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {done ? <CheckCircle2 size={13} /> : <span className="text-xs text-muted-foreground">{i + 1}</span>}
                  </div>
                  <span className={`text-sm flex-1 truncate ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{h.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{calcStreak(h.logs || [])}🔥</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickStat label="إجمالي المهام" value={String(tasks.length)} icon={<CheckCircle2 size={16} />} color="#3b82f6" onClick={() => setPage('tasks')} />
        <QuickStat label="العادات" value={String(habits.length)} icon={<Activity size={16} />} color="#8b5cf6" onClick={() => setPage('habits')} />
        <QuickStat label="الأهداف" value={String(goals.length)} icon={<Target size={16} />} color="#ec4899" onClick={() => setPage('goals')} />
        <QuickStat label="التمارين" value={String(analytics?.workouts?.total || 0)} icon={<Dumbbell size={16} />} color="#ef4444" onClick={() => setPage('fitness')} />
      </div>
    </div>
  );
}

function WeekBarChart({ data }: { data: { label: string; count: number; isToday: boolean }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="flex items-end gap-1.5 h-36">
      {data.map((d, i) => {
        const heightPct = Math.max((d.count / max) * 100, 3);
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end cursor-default"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="relative w-full flex flex-col items-center justify-end" style={{ height: '112px' }}>
              {hovered === i && (
                <div className="absolute bottom-full mb-2 z-10 bg-popover border border-border text-foreground text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg pointer-events-none">
                  {d.count} مهمة
                </div>
              )}
              <div
                className="w-full rounded-t-lg transition-all duration-300"
                style={{
                  height: `${heightPct}%`,
                  background: d.isToday
                    ? '#10b981'
                    : hovered === i
                    ? '#10b98166'
                    : '#10b98122',
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground select-none">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ icon, label, value, color, bg, sub, progress }: any) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className={`w-9 h-9 rounded-xl ${bg} ${color} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
      {progress !== undefined && (
        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

function QuickStat({ label, value, icon, color, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="bg-card rounded-2xl border border-border p-4 text-right hover:border-primary/30 transition-all hover:shadow-sm group"
    >
      <div className="flex items-center justify-between mb-2">
        <span style={{ color }} className="opacity-70 group-hover:opacity-100 transition-opacity">{icon}</span>
        <span className="text-xl font-bold text-foreground">{value}</span>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </button>
  );
}

function EmptyState({ label, action, onClick }: { label: string; action: string; onClick: () => void }) {
  return (
    <div className="text-center py-6">
      <p className="text-sm text-muted-foreground mb-2">{label}</p>
      <button onClick={onClick} className="text-xs text-primary hover:underline">{action}</button>
    </div>
  );
}

function calcStreak(logs: Array<{ date: string; completed: boolean }>) {
  if (!logs.length) return 0;
  const sorted = logs.filter(l => l.completed).map(l => l.date).sort().reverse();
  if (!sorted.length) return 0;
  let streak = 0;
  let current = new Date();
  for (const dateStr of sorted) {
    const d = new Date(dateStr);
    const diff = Math.floor((current.getTime() - d.getTime()) / 86400000);
    if (diff <= 1) { streak++; current = d; }
    else break;
  }
  return streak;
}
