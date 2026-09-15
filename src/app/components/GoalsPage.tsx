import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import { FormModal } from './ui/FormModal';
import { useConfirmDialog } from './ui/ConfirmDialog';
import { AnimatedEmptyState } from './ui/AnimatedEmptyState';
import { MetricTile, PageHero, SectionHeading } from './ui/LifeOSPrimitives';
import { api } from '../../utils/api';
import { useMonetization } from '../monetization/MonetizationProvider';
import { RewardCapacityBar } from './RewardCapacityBar';
import { toast } from 'sonner';
import { Plus, Trash2, Edit3, Target, Calendar, ChevronUp, ChevronDown, CheckCircle2, Gauge, TimerReset, Flag } from 'lucide-react';
import { localDateKey, parseLocalDateKey } from '../../utils/date';
import { dateOrderValidation, firstValidation, numberValidation, textValidation } from '../../utils/validation';
import { useIsMobile } from './ui/use-mobile';

type GoalType = 'short' | 'medium' | 'long';
const GOAL_LABELS: Record<GoalType, { label: string; duration: string; color: string; bg: string }> = {
  short: { label: 'قصير المدى', duration: 'شهر واحد', color: 'text-green-500', bg: 'bg-green-500/10' },
  medium: { label: 'متوسط المدى', duration: '6 أشهر', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  long: { label: 'طويل المدى', duration: 'سنة أو أكثر', color: 'text-purple-500', bg: 'bg-purple-500/10' },
};

export function GoalsPage() {
  const confirmAction = useConfirmDialog();
  const { guardCreation } = useMonetization();
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState<any>(null);
  const [form, setForm] = useState({ title: '', description: '', type: 'short' as GoalType, startDate: '', deadline: '', progress: 0 });

  useEffect(() => { loadGoals(); }, []);

  async function loadGoals() {
    try {
      const data = await api('/goals');
      setGoals(Array.isArray(data) ? data : []);
    } catch { toast.error('فشل تحميل الأهداف'); }
    finally { setLoading(false); }
  }

  async function saveGoal() {
    const validationError = firstValidation(
      textValidation(form.title, 'عنوان الهدف', 180),
      textValidation(form.description, 'وصف الهدف', 4000, false),
      numberValidation(form.progress, 'نسبة التقدم', { min: 0, max: 100 }),
      dateOrderValidation(form.startDate, form.deadline, 'الموعد النهائي يجب أن يكون بعد تاريخ البداية'),
    );
    if (validationError) { toast.error(validationError); return; }
    try {
      if (editGoal) {
        const updated = await api(`/goals/${editGoal.id}`, { method: 'PUT', body: JSON.stringify(form) });
        setGoals(g => g.map(x => x.id === updated.id ? updated : x));
        toast.success('تم التحديث');
      } else {
        if (!await guardCreation({ key: 'goals', currentCount: goals.length })) return;
        const created = await api('/goals', { method: 'POST', body: JSON.stringify(form) });
        setGoals(g => [created, ...g]);
        toast.success('تمت الإضافة');
      }
      resetForm();
    } catch { toast.error('فشل الحفظ'); }
  }

  async function updateProgress(id: string, delta: number) {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    const newProg = Math.min(100, Math.max(0, (goal.progress || 0) + delta));
    try {
      const updated = await api(`/goals/${id}`, { method: 'PUT', body: JSON.stringify({ ...goal, progress: newProg }) });
      setGoals(g => g.map(x => x.id === id ? updated : x));
      if (!reduceMotion && (goal.progress || 0) < 100 && newProg >= 100) {
        confetti({ particleCount: 44, spread: 58, startVelocity: 25, scalar: 0.72, origin: { y: 0.78 } });
      }
    } catch { toast.error('فشل التحديث'); }
  }

  async function deleteGoal(id: string) {
    if (!(await confirmAction({ title: 'حذف الهدف', description: 'سيتم حذف الهدف وتقدمه الحالي. لا يمكن التراجع عن هذا الإجراء.' }))) return;
    try {
      await api(`/goals/${id}`, { method: 'DELETE' });
      setGoals(g => g.filter(x => x.id !== id));
      toast.success('تم الحذف');
    } catch { toast.error('فشل الحذف'); }
  }

  function resetForm() {
    setForm({ title: '', description: '', type: 'short', startDate: '', deadline: '', progress: 0 });
    setEditGoal(null);
    setShowForm(false);
  }

  const goalStats = useMemo(() => {
    const grouped: Record<GoalType, any[]> = { short: [], medium: [], long: [] };
    let completed = 0;
    let progressTotal = 0;
    let dueSoonCount = 0;
    const todayDate = parseLocalDateKey(localDateKey());

    for (const goal of goals) {
      const type: GoalType = goal.type === 'medium' || goal.type === 'long' ? goal.type : 'short';
      grouped[type].push(goal);
      const progress = Number(goal.progress || 0);
      progressTotal += progress;
      if (progress >= 100) completed += 1;
      if (goal.deadline && progress < 100 && todayDate) {
        const deadline = parseLocalDateKey(goal.deadline);
        if (deadline) {
          const days = Math.ceil((deadline.getTime() - todayDate.getTime()) / 86400000);
          if (days >= 0 && days <= 30) dueSoonCount += 1;
        }
      }
    }

    return {
      grouped,
      completed,
      average: goals.length ? Math.round(progressTotal / goals.length) : 0,
      dueSoon: dueSoonCount,
      todayDate,
    };
  }, [goals]);

  const completedGoals = goalStats.completed;
  const averageProgress = goalStats.average;
  const dueSoon = goalStats.dueSoon;

  if (loading) return <GoalsSkeleton reduceMotion={!!reduceMotion || isMobile} />;

  return (
    <motion.div initial={reduceMotion || isMobile ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="lifeos-page-shell max-w-5xl space-y-5">
      <PageHero
        eyebrow="الرؤية والتقدم"
        title="الأهداف"
        description="حوّل الاتجاه الكبير إلى أهداف واضحة، وراقب التقدم بدون ما تضيع بين التفاصيل اليومية."
        icon={<Target size={21} />}
        meta={<div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground"><span className="lifeos-chip"><CheckCircle2 size={12} /> {completedGoals} مكتمل</span><span className="lifeos-chip"><Gauge size={12} /> {averageProgress}% متوسط التقدم</span></div>}
        actions={
          <motion.button
            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            whileHover={reduceMotion ? undefined : { y: -1 }}
            onClick={() => { resetForm(); setShowForm(true); }}
            className="lifeos-primary-action"
          >
            <Plus size={16} /> هدف جديد
          </motion.button>
        }
      />

      <RewardCapacityBar rewardKey="goals" currentCount={goals.length} />

      <div className="lifeos-metric-grid">
        <MetricTile label="كل الأهداف" value={goals.length} icon={<Target size={17} />} iconClassName="text-primary" helper="كل المسارات الحالية" />
        <MetricTile label="أهداف مكتملة" value={completedGoals} icon={<CheckCircle2 size={17} />} iconClassName="text-emerald-500" progress={goals.length ? (completedGoals / goals.length) * 100 : 0} />
        <MetricTile label="متوسط التقدم" value={`${averageProgress}%`} icon={<Gauge size={17} />} iconClassName="text-blue-500" progress={averageProgress} />
        <MetricTile label="استحقاق قريب" value={dueSoon} icon={<TimerReset size={17} />} iconClassName="text-amber-500" helper="خلال 30 يومًا" />
      </div>

      <div className="lifeos-insight-strip">
        <span className="lifeos-insight-icon text-primary"><Flag size={16} /></span>
        <div><p className="text-xs font-bold text-foreground">الهدف يبقى اتجاهًا، وليس مهمة يومية</p><p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">استخدم الموعد النهائي فقط عندما يكون للهدف استحقاق حقيقي، وحدّث النسبة كلما قطعت خطوة ملموسة.</p></div>
      </div>

      <section>
        <SectionHeading title="توزيع الأهداف حسب الأفق" description="وازن بين المكاسب السريعة والنتائج بعيدة المدى." />
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          {(['short', 'medium', 'long'] as GoalType[]).map(type => {
            const { label, color, bg, duration } = GOAL_LABELS[type];
            const typeGoals = goalStats.grouped[type];
            const avg = typeGoals.length > 0 ? Math.round(typeGoals.reduce((sum, goal) => sum + (goal.progress || 0), 0) / typeGoals.length) : 0;
            return (
              <motion.div key={type} whileHover={reduceMotion || isMobile ? undefined : { y: -2 }} className="lifeos-horizon-card">
                <div className={`text-[10px] md:text-xs font-bold ${color} ${bg} inline-flex px-2 py-1 rounded-full`}>{label}</div>
                <div className="mt-3 flex items-end justify-between gap-2"><div><p className="text-xl font-black text-foreground">{typeGoals.length}</p><p className="text-[10px] text-muted-foreground">{duration}</p></div><span className="text-xs font-bold text-muted-foreground">{avg}%</span></div>
                <div className="lifeos-progress-track mt-3"><motion.div className="lifeos-progress-fill" initial={reduceMotion || isMobile ? false : { width: 0 }} animate={{ width: `${avg}%` }} transition={{ duration: reduceMotion || isMobile ? 0.08 : 0.4 }} /></div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Form */}
      {showForm && (
        <FormModal open={showForm} title={editGoal ? 'تعديل الهدف' : 'إضافة هدف جديد'} onClose={resetForm} layoutId={!isMobile && editGoal ? `lifeos-goal-card-${editGoal.id}` : undefined}>
        <div className="bg-card rounded-2xl border border-primary/30 p-5 space-y-4 shadow-lg">
          <h3 className="font-semibold text-foreground">{editGoal ? 'تعديل الهدف' : 'هدف جديد'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">عنوان الهدف *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="ماذا تريد أن تحقق؟" className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">النوع</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as GoalType }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {Object.entries(GOAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label} ({v.duration})</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1.5">الوصف</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="وصف الهدف وخطة تحقيقه..." className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">الموعد النهائي (اختياري)</label>
              <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">نسبة الإنجاز الحالية: {form.progress}%</label>
              <input type="range" value={form.progress} onChange={e => setForm(f => ({ ...f, progress: +e.target.value }))} min={0} max={100} step={5} className="w-full accent-primary" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:bg-muted">إلغاء</button>
            <button onClick={saveGoal} className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90">حفظ</button>
          </div>
        </div>
        </FormModal>
      )}

      {/* Goals by type */}
      {(['short', 'medium', 'long'] as GoalType[]).map(type => {
        const typeGoals = goalStats.grouped[type];
        if (typeGoals.length === 0) return null;
        const { label, color, bg, duration } = GOAL_LABELS[type];
        return (
          <motion.div key={type} initial={reduceMotion || isMobile ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion || isMobile ? 0.01 : 0.16 }} className="space-y-3">
            <SectionHeading
              title={label}
              description={`${duration} · ${typeGoals.length} ${typeGoals.length === 1 ? 'هدف' : 'أهداف'}`}
              trailing={<span className={`text-[10px] font-bold ${bg} ${color} px-2.5 py-1 rounded-full`}>{Math.round(typeGoals.reduce((sum, goal) => sum + (goal.progress || 0), 0) / Math.max(1, typeGoals.length))}% متوسط</span>}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence initial={false}>
              {typeGoals.map((goal, goalIndex) => {
                const isComplete = goal.progress >= 100;
                const deadline = goal.deadline ? parseLocalDateKey(goal.deadline) : null;
                const daysLeft = deadline && goalStats.todayDate ? Math.ceil((deadline.getTime() - goalStats.todayDate.getTime()) / 86400000) : null;
                const cardContent = (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className={`font-medium text-sm ${isComplete ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{goal.title}</h3>
                        {goal.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{goal.description}</p>}
                        {Array.isArray(goal.milestones) && goal.milestones.length > 0 && (
                          <div className="mt-2 rounded-xl bg-muted/60 px-3 py-2">
                            <p className="text-[10px] font-bold text-primary">مراحل الخطة</p>
                            <div className="mt-1 space-y-1">{goal.milestones.slice(0, 4).map((milestone: string, index: number) => <p key={`${goal.id}-milestone-${index}`} className="text-[10px] leading-4 text-muted-foreground">{index + 1}. {milestone}</p>)}</div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 mr-2">
                        <button type="button" aria-label={`تعديل ${goal.title}`} onClick={() => { setEditGoal(goal); setForm({ title: goal.title, description: goal.description || '', type: goal.type, startDate: '', deadline: goal.deadline || '', progress: goal.progress || 0 }); setShowForm(true); }} className="lifeos-icon-action hover:bg-muted text-muted-foreground">
                          <Edit3 size={12} />
                        </button>
                        <button type="button" aria-label={`حذف ${goal.title}`} onClick={() => deleteGoal(goal.id)} className="lifeos-icon-action hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${isComplete ? 'bg-primary' : color.replace('text-', 'bg-')}`}
                          initial={reduceMotion || isMobile ? false : { width: 0 }}
                          animate={{ width: `${goal.progress || 0}%` }}
                          transition={{ duration: reduceMotion || isMobile ? 0.08 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                      <span className="text-xs font-bold text-foreground w-9 text-left">{goal.progress || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        <button onClick={() => updateProgress(goal.id, -5)} className="p-1 rounded bg-muted hover:bg-muted/80 text-xs">-5</button>
                        <button onClick={() => updateProgress(goal.id, 5)} className="p-1 rounded bg-primary/10 text-primary hover:bg-primary/20 text-xs">+5</button>
                        <button onClick={() => updateProgress(goal.id, 10)} className="p-1 rounded bg-primary/10 text-primary hover:bg-primary/20 text-xs">+10</button>
                      </div>
                      {daysLeft !== null && (
                        <span className={`text-xs ${daysLeft < 0 ? 'text-destructive' : daysLeft < 7 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                          {daysLeft < 0 ? `تأخر ${Math.abs(daysLeft)} يوم` : `${daysLeft} يوم متبقي`}
                        </span>
                      )}
                    </div>
                  </>
                );

                if (isMobile) {
                  return (
                    <div key={goal.id} className={`lifeos-list-card border p-4 ${isComplete ? 'border-primary/30 bg-primary/[0.035] shadow-sm shadow-primary/10' : 'border-border bg-card'}`}>
                      {cardContent}
                    </div>
                  );
                }

                return (
                  <motion.div
                    key={goal.id}
                    layout
                    layoutId={`lifeos-goal-card-${goal.id}`}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                    transition={{ duration: reduceMotion ? 0.08 : 0.18, delay: reduceMotion ? 0 : Math.min(goalIndex * 0.02, 0.08) }}
                    className={`lifeos-list-card border p-4 ${isComplete ? 'border-primary/30 bg-primary/[0.035] shadow-sm shadow-primary/10' : 'border-border bg-card'}`}
                  >
                    {cardContent}
                  </motion.div>
                );
              })}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}

      {goals.length === 0 && (
        <AnimatedEmptyState
          icon={Target}
          title="لا توجد أهداف بعد"
          description="حدد هدفك الأول، وسيتحوّل التقدم هنا إلى رحلة مرئية خطوة بخطوة."
          action={(
            <motion.button
              onClick={() => { setEditGoal(null); setForm({ title: '', description: '', type: 'short', startDate: localDateKey(), deadline: '', progress: 0 }); setShowForm(true); }}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Plus size={15} /> إضافة أول هدف
            </motion.button>
          )}
        />
      )}
    </motion.div>
  );
}


function GoalsSkeleton({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div className="max-w-4xl mx-auto space-y-5" aria-label="جاري تحميل الأهداف">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLine className="h-6 w-24" reduceMotion={reduceMotion} />
          <SkeletonLine className="h-4 w-36" reduceMotion={reduceMotion} />
        </div>
        <SkeletonLine className="h-10 w-28 rounded-xl" reduceMotion={reduceMotion} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map(index => (
          <div key={index} className="rounded-xl border border-border bg-card p-4 space-y-4">
            <SkeletonLine className="h-5 w-2/3" reduceMotion={reduceMotion} />
            <SkeletonLine className="h-3 w-full" reduceMotion={reduceMotion} />
            <SkeletonLine className="h-2 w-full rounded-full" reduceMotion={reduceMotion} />
            <div className="flex gap-2"><SkeletonLine className="h-7 w-10 rounded-lg" reduceMotion={reduceMotion} /><SkeletonLine className="h-7 w-10 rounded-lg" reduceMotion={reduceMotion} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonLine({ className, reduceMotion }: { className: string; reduceMotion: boolean }) {
  return (
    <motion.div
      className={`bg-muted ${className}`}
      animate={reduceMotion ? undefined : { opacity: [0.45, 0.85, 0.45] }}
      transition={{ duration: 1.25, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}
