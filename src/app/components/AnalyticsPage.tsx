import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { api } from '../../utils/api';
import { Activity, BarChart3, Dumbbell, Goal, Sparkles, Target } from 'lucide-react';
import { localDateKey, parseLocalDateKey } from '../../utils/date';
import { ErrorState, LoadingPage, PageHero, SectionHeading, SummaryCard } from './ui/LifeOSPrimitives';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316'];

export function AnalyticsPage() {
  const reduceMotion = useReducedMotion();
  const [data, setData] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [dhikrList, setDhikrList] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setLoading(true);
    setFailed(false);
    Promise.all([
      api('/analytics').catch(() => null),
      api('/tasks').catch(() => []),
      api('/habits').catch(() => []),
      api('/workouts').catch(() => []),
      api('/dhikr').catch(() => []),
      api('/goals').catch(() => []),
    ]).then(([a, t, h, w, d, g]) => {
      setData(a);
      setTasks(Array.isArray(t) ? t : []);
      setHabits(Array.isArray(h) ? h : []);
      setWorkouts(Array.isArray(w) ? w : []);
      setDhikrList(Array.isArray(d) ? d : []);
      setGoals(Array.isArray(g) ? g : []);
      if (!a && !Array.isArray(t)) setFailed(true);
    }).catch(() => setFailed(true)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const analytics = useMemo(() => {
    const tasksByCategory: Record<string, { total: number; completed: number }> = {};
    tasks.forEach(t => {
      const cat = t.category || 'أخرى';
      if (!tasksByCategory[cat]) tasksByCategory[cat] = { total: 0, completed: 0 };
      tasksByCategory[cat].total++;
      if (t.completions?.some((c: any) => c.status === 'completed')) tasksByCategory[cat].completed++;
    });
    const categoryData = Object.entries(tasksByCategory).map(([name, d]) => ({ name, ...d, rate: d.total ? Math.round(d.completed / d.total * 100) : 0 }));

    const weeklyWorkouts = Array.from({ length: 12 }, (_, i) => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (11 - i) * 7);
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);
      const count = workouts.filter(w => { const d = parseLocalDateKey(String(w.date || '')); return !!d && d >= weekStart && d < weekEnd; }).length;
      return { label: `أ${i + 1}`, count };
    });

    const last30 = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (29 - i)); return localDateKey(d); });
    const habitStats = habits.map((h, idx) => {
      const logs = h.logs || [];
      const completed = last30.filter(date => logs.some((l: any) => l.date === date && l.completed)).length;
      return { id: h.id || idx, name: h.name || `عادة ${idx + 1}`, rate: Math.round((completed / 30) * 100) };
    }).sort((a, b) => b.rate - a.rate);

    const goalData = [
      { name: 'قصير المدى', value: goals.filter(g => g.type === 'short').length, color: COLORS[0] },
      { name: 'متوسط المدى', value: goals.filter(g => g.type === 'medium').length, color: COLORS[1] },
      { name: 'طويل المدى', value: goals.filter(g => g.type === 'long').length, color: COLORS[2] },
    ].filter(d => d.value > 0);

    const dhikrData = dhikrList.map((d, i) => ({ name: d.name || `ذكر ${i + 1}`, count: d.count || 0 })).sort((a, b) => b.count - a.count).slice(0, 6);
    const workoutTypes: Record<string, number> = {};
    workouts.forEach(w => { workoutTypes[w.type || 'أخرى'] = (workoutTypes[w.type || 'أخرى'] || 0) + 1; });
    const workoutTypeData = Object.entries(workoutTypes).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));

    const completedTasks = tasks.filter(t => t.completions?.some((c: any) => c.status === 'completed')).length;
    const taskRate = tasks.length ? Math.round(completedTasks / tasks.length * 100) : 0;
    const habitRate = habitStats.length ? Math.round(habitStats.reduce((sum, h) => sum + h.rate, 0) / habitStats.length) : 0;
    const avgGoalProgress = goals.length ? Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length) : 0;
    const totalGoalsCompleted = goals.filter(g => g.progress >= 100).length;
    const totalWorkoutHours = Math.round(workouts.reduce((s, w) => s + (w.duration || 0), 0) / 60);
    const lifeScoreParts = [taskRate, habitRate, avgGoalProgress].filter((_, i) => [tasks.length, habits.length, goals.length][i] > 0);
    const lifeScore = lifeScoreParts.length ? Math.round(lifeScoreParts.reduce((a, b) => a + b, 0) / lifeScoreParts.length) : 0;

    return { categoryData, weeklyWorkouts, habitStats, goalData, dhikrData, workoutTypeData, completedTasks, taskRate, habitRate, avgGoalProgress, totalGoalsCompleted, totalWorkoutHours, lifeScore };
  }, [tasks, habits, workouts, dhikrList, goals]);

  if (loading) return <LoadingPage label="نجمع إشارات التقدم من LifeOS" />;
  if (failed) return <ErrorState title="تعذر بناء لوحة التحليلات" description="لم نتمكن من قراءة بيانات التقدم الآن." onRetry={load} />;

  const maxWeekly = Math.max(...analytics.weeklyWorkouts.map(w => w.count), 1);
  const maxDhikr = Math.max(...analytics.dhikrData.map(d => d.count), 1);
  const maxCatTotal = Math.max(...analytics.categoryData.map(d => d.total), 1);
  const strongestHabit = analytics.habitStats[0];

  return (
    <div className="lifeos-page-shell max-w-5xl space-y-5">
      <PageHero
        eyebrow="LIFE PULSE"
        title="التحليلات"
        description="اقرأ الاتجاه العام لحياتك بدل متابعة أرقام منفصلة: تنفيذ، استمرارية، أهداف وحركة."
        icon={<BarChart3 size={20} />}
        meta={<div className="lifeos-v3-hero-meta"><span className="lifeos-chip">{tasks.length} مهمة</span><span className="lifeos-chip">{habits.length} عادة</span><span className="lifeos-chip">{goals.length} هدف</span></div>}
      />

      <div className="lifeos-v4-life-score">
        <div className="lifeos-v4-score-ring" style={{ '--lifeos-score': `${analytics.lifeScore * 3.6}deg` } as React.CSSProperties}><span>{analytics.lifeScore}<small>%</small></span></div>
        <div className="min-w-0 flex-1"><p className="lifeos-eyebrow">LIFE SCORE</p><h2 className="text-base font-black text-foreground">نبض التقدم الحالي</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">مؤشر مبسط يجمع تنفيذ المهام واستمرارية العادات وتقدم الأهداف. استخدمه كاتجاه، لا كحكم على يومك.</p></div>
        <Sparkles size={20} className="hidden flex-shrink-0 text-primary sm:block" />
      </div>

      <div className="lifeos-v3-summary-grid">
        <SummaryCard value={`${analytics.taskRate}%`} label="تنفيذ المهام" helper={`${analytics.completedTasks}/${tasks.length || 0} مكتملة`} />
        <SummaryCard value={`${analytics.habitRate}%`} label="استمرارية العادات" helper={strongestHabit ? `الأقوى: ${strongestHabit.name}` : 'أضف عادة لبدء القياس'} />
        <SummaryCard value={`${analytics.avgGoalProgress}%`} label="متوسط الأهداف" helper={`${analytics.totalGoalsCompleted} مكتملة`} />
        <SummaryCard value={analytics.totalWorkoutHours} label="ساعات تمرين" helper={`${workouts.length} جلسة مسجلة`} />
      </div>

      <section>
        <SectionHeading title="الصورة المتوازنة" description="أهم الإشارات التي تخبرك أين يوجد زخم وأين تحتاج انتباهًا." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InsightCard icon={<Target size={17} />} title="المهام حسب الفئة" description="قارن حجم الالتزام مع ما أنجزته فعليًا.">
            {analytics.categoryData.length ? analytics.categoryData.map((item, i) => <ProgressRow key={item.name} label={item.name} value={item.completed} total={item.total} percent={(item.completed / maxCatTotal) * 100} color={COLORS[i % COLORS.length]} />) : <EmptyMini text="أضف مهامًا مصنفة لتظهر المقارنة هنا." />}
          </InsightCard>

          <InsightCard icon={<Activity size={17} />} title="العادات — آخر 30 يوم" description="الاستمرارية تكشف ما أصبح جزءًا فعليًا من يومك.">
            {analytics.habitStats.length ? analytics.habitStats.slice(0, 6).map((item, i) => <ProgressRow key={item.id} label={item.name} value={item.rate} suffix="%" percent={item.rate} color={COLORS[i % COLORS.length]} />) : <EmptyMini text="سجّل عاداتك يوميًا لبدء رؤية النمط." />}
          </InsightCard>

          <InsightCard icon={<Dumbbell size={17} />} title="إيقاع التمرين" description="آخر 12 أسبوعًا، لتمييز الاستمرارية عن النشاط المتقطع.">
            {workouts.length ? <div className="lifeos-v4-bar-chart" aria-label="التمارين الأسبوعية">{analytics.weeklyWorkouts.map((week, index) => { const height = Math.max((week.count / maxWeekly) * 100, week.count ? 7 : 2); return <div key={index} className="lifeos-v4-bar-column"><span className="lifeos-v4-bar-value">{week.count || ''}</span><motion.div initial={reduceMotion ? false : { height: 0 }} animate={{ height: `${height}%` }} transition={{ delay: reduceMotion ? 0 : index * .025, duration: .45 }} className="lifeos-v4-bar" data-current={index === analytics.weeklyWorkouts.length - 1} /><small>{week.label}</small></div>; })}</div> : <EmptyMini text="سجّل أول جلسة تمرين لتظهر الاتجاهات هنا." />}
          </InsightCard>

          <InsightCard icon={<Goal size={17} />} title="آفاق الأهداف" description="هل تركيزك كله قريب، أم عندك توازن بين الآن والمستقبل؟">
            {analytics.goalData.length ? analytics.goalData.map(item => { const total = analytics.goalData.reduce((sum, x) => sum + x.value, 0); return <ProgressRow key={item.name} label={item.name} value={item.value} percent={(item.value / total) * 100} color={item.color} />; }) : <EmptyMini text="أضف أهدافًا قصيرة ومتوسطة وطويلة المدى." />}
          </InsightCard>

          {analytics.dhikrData.length > 0 && <InsightCard icon={<Sparkles size={17} />} title="الأذكار" description="أكثر الأذكار حضورًا في سجلّك.">{analytics.dhikrData.map(item => <ProgressRow key={item.name} label={item.name} value={item.count} suffix=" مرة" percent={(item.count / maxDhikr) * 100} color="#f59e0b" />)}</InsightCard>}
          {analytics.workoutTypeData.length > 0 && <InsightCard icon={<Dumbbell size={17} />} title="تنوع التمارين" description="كيف يتوزع نشاطك بين أنواع التدريب المختلفة؟">{analytics.workoutTypeData.map(item => { const total = analytics.workoutTypeData.reduce((sum, x) => sum + x.value, 0); return <ProgressRow key={item.name} label={item.name} value={item.value} percent={(item.value / total) * 100} color={item.color} />; })}</InsightCard>}
        </div>
      </section>

      <section className="lifeos-v4-summary-band">
        <div><p className="lifeos-eyebrow">AT A GLANCE</p><h3>ملخص LifeOS</h3></div>
        <div className="lifeos-v4-summary-band-grid">
          {[['المهام', `${tasks.length}`], ['العادات', `${habits.length}`], ['التمارين', `${workouts.length}`], ['صفحات القرآن', `${data?.quran?.totalPages || 0}`], ['الأذكار', `${data?.dhikr?.total || 0}`], ['أهداف مكتملة', `${analytics.totalGoalsCompleted}`]].map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
        </div>
      </section>
    </div>
  );
}

function InsightCard({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return <article className="lifeos-v4-insight-card"><div className="lifeos-v4-insight-head"><span>{icon}</span><div><h3>{title}</h3><p>{description}</p></div></div><div className="space-y-3">{children}</div></article>;
}

function ProgressRow({ label, value, total, suffix = '', percent, color }: { label: string; value: number; total?: number; suffix?: string; percent: number; color: string }) {
  const width = Math.max(0, Math.min(100, percent));
  return <div><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="truncate font-bold text-foreground">{label}</span><span className="flex-shrink-0 text-muted-foreground">{value}{total !== undefined ? `/${total}` : suffix}</span></div><div className="lifeos-v4-data-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(width)}><div className="lifeos-v4-data-fill" style={{ width: `${width}%`, background: color }} /></div></div>;
}

function EmptyMini({ text }: { text: string }) { return <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs leading-5 text-muted-foreground">{text}</p>; }
