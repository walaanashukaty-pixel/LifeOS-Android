import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, CircleAlert, Loader2, Moon, Sparkles, Target } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../utils/api.ts';
import { useAuth } from '../App.tsx';
import { buildDailyReviewSummary, DAILY_REVIEW_REASONS, type DailyReviewReason } from './daily-review-model.ts';
import { loadDailyReflection, saveDailyReflection } from './daily-review-service.ts';
import { localDateKey } from '../../utils/date.ts';

export function DailyReviewPage({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const date = useMemo(() => localDateKey(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState<DailyReviewReason | ''>('');
  const [note, setNote] = useState('');
  const [summary, setSummary] = useState(() => buildDailyReviewSummary({ date }));

  useEffect(() => {
    let active = true;
    Promise.all([
      api('/tasks').catch(() => []),
      api('/habits').catch(() => []),
      api('/goals').catch(() => []),
      api('/events').catch(() => []),
      user?.id ? loadDailyReflection(user.id, date).catch(() => null) : Promise.resolve(null),
    ]).then(([tasks, habits, goals, events, existing]) => {
      if (!active) return;
      setSummary(buildDailyReviewSummary({
        date,
        tasks: Array.isArray(tasks) ? tasks : [],
        habits: Array.isArray(habits) ? habits : [],
        goals: Array.isArray(goals) ? goals : [],
        events: Array.isArray(events) ? events : [],
      }));
      if (existing) {
        setReason(existing.reason);
        setNote(existing.note);
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date, user?.id]);

  async function save() {
    if (!user?.id || !reason) {
      toast.error('اختاري السبب الأقرب ليومك أولًا');
      return;
    }
    setSaving(true);
    try {
      await saveDailyReflection({ userId: user.id, reviewDate: date, reason, note, summary });
      toast.success('تمام، حفظت مراجعة اليوم ✨');
    } catch {
      toast.error('ما قدرنا نحفظ مراجعة اليوم. جرّبي مرة ثانية.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"><ArrowRight size={17} /></button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black text-foreground">🌙 كيف كان يومك؟</h2>
          <p className="text-xs text-muted-foreground">مراجعة قصيرة تساعد LifeOS يفهم شو ناسبك وشو لا.</p>
        </div>
      </div>

      <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground"><Loader2 size={15} className="animate-spin" /> عم نجهّز ملخص يومك...</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Summary icon={<CheckCircle2 size={16} />} label="المهام" value={`${summary.tasksCompleted}/${summary.tasksTotal}`} />
            <Summary icon={<Sparkles size={16} />} label="العادات" value={`${summary.habitsCompleted}/${summary.habitsTotal}`} />
            <Summary icon={<CalendarDays size={16} />} label="المواعيد" value={String(summary.eventsToday)} />
            <Summary icon={<Target size={16} />} label="تقدم الأهداف" value={`${summary.averageGoalProgress}%`} />
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Moon size={18} /></span>
          <div>
            <h3 className="text-sm font-black text-foreground">ما السبب الرئيسي وراء الأشياء التي لم تنجزيها؟</h3>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">اختاري الأقرب. LifeOS يستخدم هالمعلومة لتحسين اقتراحاته المستقبلية.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {DAILY_REVIEW_REASONS.map(item => (
            <button key={item} onClick={() => setReason(item)} className={`rounded-2xl border px-3 py-3 text-xs font-semibold transition ${reason === item ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background/60 text-foreground'}`}>{item}</button>
          ))}
        </div>
        <textarea value={note} onChange={event => setNote(event.target.value)} maxLength={500} rows={3} placeholder="ملاحظة قصيرة (اختياري)" className="mt-3 w-full resize-none rounded-2xl border border-border bg-background px-3 py-3 text-sm text-foreground outline-none focus:border-primary/50" />
        <button disabled={saving || !reason} onClick={() => void save()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-black text-white disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <CircleAlert size={16} />} حفظ مراجعة اليوم
        </button>
      </section>
    </div>
  );
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl bg-background/70 p-3 text-center"><div className="mx-auto mb-1 flex items-center justify-center text-primary">{icon}</div><p className="text-lg font-black text-foreground">{value}</p><p className="text-[10px] text-muted-foreground">{label}</p></div>;
}
