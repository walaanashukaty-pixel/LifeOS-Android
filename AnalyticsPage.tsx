import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Loader2, BarChart3, Activity } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316'];

export function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [dhikrList, setDhikrList] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>;

  const today = new Date().toISOString().split('T')[0];

  // Task completion by category
  const tasksByCategory: Record<string, { total: number; completed: number }> = {};
  tasks.forEach(t => {
    const cat = t.category || 'أخرى';
    if (!tasksByCategory[cat]) tasksByCategory[cat] = { total: 0, completed: 0 };
    tasksByCategory[cat].total++;
    if (t.completions?.some((c: any) => c.status === 'completed')) tasksByCategory[cat].completed++;
  });
  const categoryData = Object.entries(tasksByCategory).map(([name, d], i) => ({
    name: name || `فئة ${i + 1}`, total: d.total, completed: d.completed,
    rate: d.total > 0 ? Math.round(d.completed / d.total * 100) : 0,
  }));

  // Weekly workout trend (last 12 weeks)
  const weeklyWorkouts = Array.from({ length: 12 }, (_, i) => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (11 - i) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const count = workouts.filter(w => { const d = new Date(w.date); return d >= weekStart && d < weekEnd; }).length;
    return { label: `أ${i + 1}`, count };
  });

  // Habit completion rates (last 30 days)
  const habitStats = habits.map((h, idx) => {
    const logs = h.logs || [];
    const completed = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    }).filter(date => logs.some((l: any) => l.date === date && l.completed)).length;
    return { id: h.id || idx, name: h.name || `عادة ${idx + 1}`, rate: Math.round((completed / 30) * 100) };
  }).sort((a, b) => b.rate - a.rate);

  // Goals by type
  const goalPieData = [
    { name: 'قصير المدى', value: goals.filter(g => g.type === 'short').length, color: COLORS[0] },
    { name: 'متوسط المدى', value: goals.filter(g => g.type === 'medium').length, color: COLORS[1] },
    { name: 'طويل المدى', value: goals.filter(g => g.type === 'long').length, color: COLORS[2] },
  ].filter(d => d.value > 0);

  // Dhikr totals
  const dhikrData = dhikrList
    .map((d, i) => ({ name: d.name || `ذكر ${i + 1}`, count: d.count || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Workout by type
  const workoutTypes: Record<string, number> = {};
  workouts.forEach(w => { workoutTypes[w.type || 'أخرى'] = (workoutTypes[w.type || 'أخرى'] || 0) + 1; });
  const workoutPieData = Object.entries(workoutTypes).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));

  const totalGoalsCompleted = goals.filter(g => g.progress >= 100).length;
  const avgGoalProgress = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length) : 0;
  const totalWorkoutHours = Math.round(workouts.reduce((s, w) => s + (w.duration || 0), 0) / 60);

  const maxWeekly = Math.max(...weeklyWorkouts.map(w => w.count), 1);
  const maxDhikr = Math.max(...dhikrData.map(d => d.count), 1);
  const maxCatTotal = Math.max(...categoryData.map(d => d.total), 1);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">التحليلات</h2>
        <p className="text-sm text-muted-foreground mt-0.5">نظرة شاملة على تقدمك</p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي المهام',   value: tasks.length,           color: 'text-blue-500',   bg: 'bg-blue-500/10' },
          { label: 'أهداف مكتملة',   value: totalGoalsCompleted,    color: 'text-green-500',  bg: 'bg-green-500/10' },
          { label: 'ساعات تمرين',    value: totalWorkoutHours,      color: 'text-red-500',    bg: 'bg-red-500/10' },
          { label: 'متوسط الأهداف',  value: `${avgGoalProgress}%`,  color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4">
            <div className={`w-8 h-8 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center mb-2`}>
              <BarChart3 size={16} />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Task categories — horizontal bar */}
        {categoryData.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">المهام حسب الفئة</h3>
            <div className="space-y-3">
              {categoryData.map((d, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground font-medium truncate">{d.name}</span>
                    <span className="text-muted-foreground flex-shrink-0 mr-2">{d.completed}/{d.total}</span>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden relative">
                    {/* total */}
                    <div className="absolute inset-0 rounded-full" style={{ width: `${(d.total / maxCatTotal) * 100}%`, background: '#10b98122' }} />
                    {/* completed */}
                    <div className="absolute inset-0 rounded-full transition-all duration-500" style={{ width: `${(d.completed / maxCatTotal) * 100}%`, background: '#10b981' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Habit rates */}
        {habitStats.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">معدل العادات (آخر 30 يوم)</h3>
            <div className="space-y-3">
              {habitStats.slice(0, 6).map((h, i) => (
                <div key={h.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground truncate">{h.name}</span>
                    <span className="text-muted-foreground font-medium">{h.rate}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${h.rate}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly workouts — CSS bar chart */}
        {workouts.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">التمارين الأسبوعية</h3>
            <div className="flex items-end gap-1 h-32">
              {weeklyWorkouts.map((w, i) => {
                const heightPct = Math.max((w.count / maxWeekly) * 100, w.count > 0 ? 6 : 2);
                const isLast = i === weeklyWorkouts.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group cursor-default">
                    <div className="relative w-full flex flex-col items-center justify-end" style={{ height: '100px' }}>
                      {w.count > 0 && (
                        <div className="absolute bottom-full mb-1 z-10 bg-popover border border-border text-foreground text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm">
                          {w.count} جلسة
                        </div>
                      )}
                      <div className="w-full rounded-t transition-all duration-300"
                        style={{ height: `${heightPct}%`, background: isLast ? '#ef4444' : w.count > 0 ? '#ef444466' : '#ef444411' }} />
                    </div>
                    <span className="text-[9px] text-muted-foreground">{w.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Goals distribution */}
        {goalPieData.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">توزيع الأهداف</h3>
            <div className="space-y-3">
              {goalPieData.map((g, i) => {
                const total = goalPieData.reduce((s, x) => s + x.value, 0);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: g.color }} />
                    <span className="text-sm text-foreground flex-1">{g.name}</span>
                    <span className="text-sm font-semibold text-foreground">{g.value}</span>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(g.value / total) * 100}%`, background: g.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dhikr — CSS bar chart */}
        {dhikrData.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">إحصائيات الأذكار</h3>
            <div className="space-y-2.5">
              {dhikrData.map((d, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground font-medium truncate">{d.name}</span>
                    <span className="text-muted-foreground flex-shrink-0 mr-2">{d.count} مرة</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(d.count / maxDhikr) * 100}%`, background: '#f59e0b' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workout types */}
        {workoutPieData.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">أنواع التمارين</h3>
            <div className="space-y-3">
              {workoutPieData.map((w, i) => {
                const total = workoutPieData.reduce((s, x) => s + x.value, 0);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: w.color }} />
                    <span className="text-sm text-foreground flex-1">{w.name}</span>
                    <span className="text-sm font-semibold text-foreground">{w.value}</span>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(w.value / total) * 100}%`, background: w.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-5">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity size={16} className="text-primary" /> ملخص التقدم
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {[
            { label: 'إجمالي المهام',       value: `${tasks.length} مهمة` },
            { label: 'عدد التمارين',         value: `${workouts.length} جلسة` },
            { label: 'إجمالي صفحات القرآن', value: `${data?.quran?.totalPages || 0} صفحة` },
            { label: 'إجمالي الأذكار',      value: `${data?.dhikr?.total || 0} ذكر` },
            { label: 'العادات النشطة',       value: `${habits.length} عادة` },
            { label: 'الأهداف المكتملة',    value: `${totalGoalsCompleted} هدف` },
          ].map((s, i) => (
            <div key={i} className="bg-card/50 rounded-xl p-3">
              <p className="text-muted-foreground text-xs">{s.label}</p>
              <p className="font-bold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
