import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Bot, Sparkles, TrendingUp, TrendingDown, Target, Award, Flame, BookOpen, Dumbbell, Activity, Loader2 } from 'lucide-react';

interface Insight {
  icon: React.ReactNode;
  text: string;
  type: 'positive' | 'warning' | 'neutral' | 'achievement';
}

export function AIAssistantPage() {
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
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastWeekStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

    // Task analysis
    const todayTasks = tasks.filter(t => t.recurrence === 'daily' || t.createdAt?.startsWith(today));
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
      return d.toISOString().split('T')[0];
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
        const daysLeft = Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000);
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
          const day = new Date(c.date).getDay();
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
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Bot size={20} className="text-primary" /> المساعد الذكي
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">تحليلات مخصصة بناءً على بياناتك</p>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-2xl border border-primary/20 p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
            <Bot size={28} />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-lg">مرحباً! أنا مساعدك الذكي</h3>
            <p className="text-sm text-muted-foreground">أحلل بياناتك وأقدم لك رؤى شخصية لمساعدتك على التحسين المستمر</p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-xl font-bold text-foreground">{tasks.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">مهمة مسجلة</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-xl font-bold text-foreground">{habits.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">عادة نشطة</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-xl font-bold text-foreground">{goals.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">هدف</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-xl font-bold text-foreground">{workouts.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">جلسة تمرين</p>
        </div>
      </div>

      {/* Insights */}
      <div>
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-primary" /> رؤى وتوصيات
        </h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, i) => {
              const colors = insightColors[insight.type];
              return (
                <div key={i} className={`${colors.bg} border ${colors.border} rounded-xl p-4 flex items-start gap-3`}>
                  <span className={`flex-shrink-0 mt-0.5 ${colors.icon}`}>{insight.icon}</span>
                  <p className="text-sm text-foreground leading-relaxed">{insight.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">نصائح لتحسين إنتاجيتك</h3>
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
      </div>
    </div>
  );
}

function calcStreak(logs: Array<{ date: string; completed: boolean }>) {
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
