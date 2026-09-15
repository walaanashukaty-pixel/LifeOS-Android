import { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, Clock3, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { api } from '../../utils/api.ts';
import { buildAIAnalyticsSummary, type AIAnalyticsSummary } from './ai-analytics-model.ts';
import { loadRecentDailyReflections } from './daily-review-service.ts';
import { localDateKey } from '../../utils/date.ts';

export function AIAnalyticsPanel({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [summary, setSummary] = useState<AIAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      api('/tasks').catch(() => []),
      api('/habits').catch(() => []),
      loadRecentDailyReflections(userId, 7).catch(() => []),
    ]).then(([tasks, habits, reflections]) => {
      if (!active) return;
      setSummary(buildAIAnalyticsSummary({
        endDate: localDateKey(),
        tasks: Array.isArray(tasks) ? tasks : [],
        habits: Array.isArray(habits) ? habits : [],
        reflections,
      }));
      setLoading(false);
    });
    return () => { active = false; };
  }, [userId]);

  if (loading || !summary) {
    return <div className="flex min-h-56 items-center justify-center"><Loader2 className="animate-spin text-primary" size={28} /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"><ArrowRight size={17} /></button>
        <div>
          <h2 className="font-black text-foreground">📊 تحليلات LifeOS</h2>
          <p className="text-[11px] text-muted-foreground">آخر 7 أيام — من بيانات إنجازك الفعلية فقط</p>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3">
        <Metric icon={<TrendingUp size={16} />} label="إنجاز المهام" value={`${summary.taskCompletionRate}%`} />
        <Metric icon={<Sparkles size={16} />} label="التزام العادات" value={`${summary.habitCompletionRate}%`} />
        <Metric icon={<Clock3 size={16} />} label="وقت الإنجاز الأقوى" value={summary.strongestHour || 'غير كافٍ'} />
        <Metric icon={<BarChart3 size={16} />} label="اليوم الأقوى" value={summary.bestWeekday || 'غير كافٍ'} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-black text-foreground">النمط الأوضح</h3>
        {summary.observations.length ? (
          <div className="mt-3 space-y-2">
            {summary.observations.map((item, index) => <p key={`${item}-${index}`} className="rounded-xl bg-background px-3 py-2.5 text-xs leading-5 text-foreground">{item}</p>)}
          </div>
        ) : (
          <p className="mt-2 text-xs leading-5 text-muted-foreground">لسا ما في بيانات كافية حتى LifeOS يحكي عن نمط بثقة.</p>
        )}
      </section>

      <section className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
        <p className="text-[10px] font-black text-primary">اقتراح الأسبوع القادم</p>
        <p className="mt-1 text-sm font-bold leading-6 text-foreground">{summary.recommendation}</p>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
      <p className="mt-3 text-[10px] font-semibold text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-black text-foreground">{value}</p>
    </div>
  );
}
