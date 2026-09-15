import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { api } from '../../utils/api';
import { isTaskOnDate } from '../../utils/task-date';
import { localDateKey } from '../../utils/ads/reward-policy';
import { addLocalDays, parseLocalDateKey } from '../../utils/date';
import { MetricTile, SectionHeading } from './ui/LifeOSPrimitives';
import { Bot, Sparkles, TrendingUp, TrendingDown, Target, Award, Flame, BookOpen, Dumbbell, Activity, CheckSquare, ShieldCheck } from 'lucide-react';

interface Insight {
  icon: React.ReactNode;
  text: string;
  type: 'positive' | 'warning' | 'neutral' | 'achievement';
}

export function AIAssistantPage() {
  const reduceMotion = useReducedMotion();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [dhikrList, setDhikrList] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api('/tasks').catch(() => []),
      api('/habits').catch(() => []),
      api('/goals').catch(() => []),
      api('/workouts').catch(() => []),
      api('/dhikr').catch(() => []),
    ]).then(([t, h, g, w, d]) => {
      const tasksData = Array.isArray(t) ? t : [];
      const habitsData = Array.isArray(h) ? h : [];
      const goalsData = Array.isArray(g) ? g : [];
      const workoutsData = Array.isArray(w) ? w : [];
      const dhikrData = Array.isArray(d) ? d : [];
      setTasks(tasksData);
      setHabits(habitsData);
      setGoals(goalsData);
      setWorkouts(workoutsData);
      setDhikrList(dhikrData);
      generateInsights(tasksData, habitsData, goalsData, workoutsData, dhikrData);
      setLoading(false);
    });
  }, []);

  function generateInsights(tasks: any[], habits: any[], goals: any[], workouts: any[], dhikr: any[]) {
    const newInsights: Insight[] = [];
    const today = localDateKey();
    const yesterday = addLocalDays(today, -1);
    const lastWeekStart = addLocalDays(today, -7);
    const twoWeeksAgo = addLocalDays(today, -14);

    // Task analysis
    const todayTasks = tasks.filter(t => isTaskOnDate(t, today));
    const completedToday = todayTasks.filter(t => t.completions?.some((c: any) => c.date === today && c.status === 'completed')).length;
    const completionRate = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0;

    if (completionRate >= 80) {
      newInsights.push({ icon: <Award size={16} />, text: `ممتاز! أتممت ${completionRate}% من مهامك اليوم. استمر في هذا الأداء الرائع!`, type: 'positive' });
    } else if (completionRate >= 50) {
      newInsights.push({ icon: <TrendingUp size={16} />, text: `أنت على الطريق الصحيح! أتممت ${completionRate}% من مهامك اليوم. حاول إكمال المزيد.`, type: 'neutral' });
    } else if (todayTasks.length > 0) {
      newInsights.push({ icon: <TrendingDown size={16} />, text: `أتممت ${completionRate}% فقط من مهام اليوم. يمكنك تحسين ذلك!`, type: 'warning' });
    }

    // Habit streaks
    habits.forEach(h => {
      const streak = calcStreak(h.logs || []);
      if (streak >= 7) {
        newInsights.push({ icon: <Flame size={16} />, text: `رائع! حافظت على عادة "${h.name}" لـ ${streak} يوم متتالٍ. أنت تبني عادة راسخة!`, type: 'positive' });
      } else if (streak >= 3) {
        newInsights.push({ icon: <Activity size={16} />, text: `حافظت على "${h.name}" لـ ${streak} أيام متتالية. واصل المسيرة!`, type: 'neutral' });
      }
    });

    // Habit completion
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return localDateKey(d);
    });
    const habitRates = habits.map(h => {
      const completed = last7Days.filter(date => (h.logs || []).some((l: any) => l.date === date && l.completed)).length;
      return { name: h.name, rate: Math.round((completed / 7) * 100) };
    });
    const topHabit = habitRates.sort((a, b) => b.rate - a.rate)[0];
    if (topHabit && topHabit.rate > 70) {
      newInsights.push({ icon: <Award size={16} />, text: `عادة "${topHabit.name}" هي الأكثر انتظاماً لديك بمعدل ${topHabit.rate}% هذا الأسبوع.`, type: 'achievement' });
    }

    // Workout frequency
    const thisWeekWorkouts = workouts.filter(w => w.date >= lastWeekStart).length;
    const lastWeekWorkouts = workouts.filter(w => w.date >= twoWeeksAgo && w.date < lastWeekStart).length;
    if (thisWeekWorkouts > 0) {
      if (thisWeekWorkouts > lastWeekWorkouts) {
        newInsights.push({ icon: <Dumbbell size={16} />, text: `تحسّن! تمرنت ${thisWeekWorkouts} مرات هذا الأسبوع مقارنة بـ ${lastWeekWorkouts} الأسبوع الماضي.`, type: 'positive' });
      } else if (thisWeekWorkouts < lastWeekWorkouts && lastWeekWorkouts > 0) {
        newInsights.push({ icon: <TrendingDown size={16} />, text: `انخفضت تمارينك إلى ${thisWeekWorkouts} هذا الأسبوع. حاول زيادة نشاطك البدني.`, type: 'warning' });
      }
    }

    // Goals near completion
    goals.forEach(g => {
      if (g.progress >= 90 && g.progress < 100) {
        newInsights.push({ icon: <Target size={16} />, text: `أنت قريب جداً من إكمال هدف "${g.title}"! تبقى ${100 - g.progress}% فقط.`, type: 'positive' });
      } else if (g.deadline && g.progress < 50) {
        const deadline = parseLocalDateKey(g.deadline);
        const todayDate = parseLocalDateKey(today);
        const daysLeft = deadline && todayDate ? Math.ceil((deadline.getTime() - todayDate.getTime()) / 86400000) : NaN;
        if (daysLeft > 0 && daysLeft < 14) {
          newInsights.push({ icon: <Target size={16} />, text: `هدف "${g.title}" موعده بعد ${daysLeft} يوم وأنت عند ${g.progress}% فقط. سرّع وتيرتك!`, type: 'warning' });
        }
      }
    });

    // Dhikr
    const totalDhikr = dhikr.reduce((s, d) => s + (d.count || 0), 0);
    if (totalDhikr > 0) {
      newInsights.push({ icon: <BookOpen size={16} />, text: `أتممت ${totalDhikr} ذكراً حتى الآن. المداومة على الذكر نور في القلب.`, type: 'achievement' });
    }

    // Productive day analysis
    const productiveDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const dayActivity: Record<number, number> = {};
    tasks.forEach(t => {
      (t.completions || []).forEach((c: any) => {
        if (c.status === 'completed') {
          const day = parseLocalDateKey(c.date)?.getDay();
          if (day == null) return;
          dayActivity[day] = (dayActivity[day] || 0) + 1;
        }
      });
    });
    const mostProductiveDay = Object.entries(dayActivity).sort(([, a], [, b]) => b - a)[0];
    if (mostProductiveDay) {
      newInsights.push({ icon: <TrendingUp size={16} />, text: `${productiveDays[+mostProductiveDay[0]]} هو أكثر أيامك إنتاجية بـ ${mostProductiveDay[1]} مهام مكتملة.`, type: 'neutral' });
    }

    if (newInsights.length === 0) {
      newInsights.push({ icon: <Sparkles size={16} />, text: 'ابدأ بتسجيل بياناتك وسأزودك بتحليلات مخصصة لتقدمك!', type: 'neutral' });
    }

    setInsights(newInsights);
  }

  const insightColors = {
    positive: { bg: 'bg-green-500/10', border: 'border-green-500/30', icon: 'text-green-500' },
    warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: 'text-amber-500' },
    neutral: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'text-blue-500' },
    achievement: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: 'text-purple-500' },
  };

  return (
    <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl space-y-5">
      <motion.section initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="lifeos-free-ai-brief">
        <motion.div whileHover={reduceMotion ? undefined : { y: -2 }} className="contents">
        <motion.span animate={reduceMotion ? undefined : { y: [0, -3, 0] }} transition={{ duration: 2.2, repeat: Infinity }} className="lifeos-free-ai-icon"><Bot size={22} /></motion.span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-black text-foreground">رؤى LifeOS المجانية</h3><span className="lifeos-chip text-emerald-600"><ShieldCheck size={12} /> تحليل محلي</span></div>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">ملخص سريع مبني على بياناتك المسجلة داخل LifeOS، بدون تنفيذ تغييرات وبدون محادثة Pro.</p>
        </div>
        </motion.div>
      </motion.section>

      <section>
        <SectionHeading title="ملخص بياناتك" description="هذه هي الإشارات التي يعتمد عليها الملخص الحالي." />
        <div className="lifeos-metric-grid">
          <MetricTile label="مهام مسجلة" value={tasks.length} icon={<CheckSquare size={17} />} iconClassName="text-blue-500" />
          <MetricTile label="عادات نشطة" value={habits.length} icon={<Activity size={17} />} iconClassName="text-violet-500" />
          <MetricTile label="أهداف" value={goals.length} icon={<Target size={17} />} iconClassName="text-pink-500" />
          <MetricTile label="جلسات تمرين" value={workouts.length} icon={<Dumbbell size={17} />} iconClassName="text-emerald-500" />
        </div>
      </section>

      {/* Insights */}
      <section>
        <SectionHeading title="رؤى وتوصيات" description="إشارات بسيطة تساعدك تعرف أين تحافظ على الزخم وأين تحتاج تعديل." trailing={<Sparkles size={16} className="text-primary" />} />
        {loading ? (
          <div className="space-y-3" aria-label="جاري تحليل البيانات">
            {[0, 1, 2].map(index => (
              <motion.div key={index} className="h-16 rounded-xl bg-muted" animate={reduceMotion ? undefined : { opacity: [0.45, 0.85, 0.45] }} transition={{ duration: 1.2, repeat: Infinity, delay: index * 0.08 }} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, i) => {
              const colors = insightColors[insight.type];
              return (
                <motion.div key={i} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : Math.min(i * 0.055, 0.28) }} className={`${colors.bg} border ${colors.border} rounded-xl p-4 flex items-start gap-3`}>
                  <span className={`flex-shrink-0 mt-0.5 ${colors.icon}`}>{insight.icon}</span>
                  <p className="text-sm text-foreground leading-relaxed">{insight.text}</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Tips */}
      <section className="lifeos-panel p-5">
        <SectionHeading title="نصائح لتحسين إنتاجيتك" description="قواعد صغيرة، سهلة التطبيق، ومتوافقة مع نظامك اليومي." />
        <div className="space-y-3">
          {[
            { tip: 'حدد 3 مهام رئيسية فقط في بداية كل يوم وركز عليها', icon: '🎯' },
            { tip: 'استخدم قاعدة الـ 2 دقيقة: أي مهمة تستغرق أقل من دقيقتين، افعلها فوراً', icon: '⚡' },
            { tip: 'راجع أهدافك كل أسبوع وعدّل خطتك وفقاً لتقدمك', icon: '📊' },
            { tip: 'النوم المبكر والاستيقاظ المبكر يزيدان من إنتاجيتك بشكل ملحوظ', icon: '🌅' },
            { tip: 'خصص وقتاً ثابتاً للتمرين يومياً، حتى لو كان 20 دقيقة فقط', icon: '💪' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              <p className="text-sm text-foreground leading-relaxed">{item.tip}</p>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

function calcStreak(logs: Array<{ date: string; completed: boolean }>) {
  const sorted = logs.filter(l => l.completed).map(l => l.date).sort().reverse();
  if (!sorted.length) return 0;
  let streak = 0;
  let current = parseLocalDateKey(localDateKey());
  if (!current) return 0;
  for (const dateStr of sorted) {
    const d = parseLocalDateKey(dateStr);
    if (!d) continue;
    const diff = Math.floor((current.getTime() - d.getTime()) / 86400000);
    if (diff <= 1) { streak++; current = d; }
    else break;
  }
  return streak;
}
