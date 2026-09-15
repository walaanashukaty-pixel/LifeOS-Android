import { useState, useEffect } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import confetti from 'canvas-confetti';
import { FormModal } from './ui/FormModal';
import { useAndroidBackHandler } from './ui/useAndroidBackHandler';
import { AnimatedEmptyState } from './ui/AnimatedEmptyState';
import { QuickActionSheet } from './ui/QuickActionSheet';
import { useLongPress } from './ui/useLongPress';
import { MetricTile, PageHero } from './ui/LifeOSPrimitives';
import { api } from '../../utils/api';
import { useAuth } from '../App';
import { useMonetization } from '../monetization/MonetizationProvider';
import { RewardCapacityBar } from './RewardCapacityBar';
import { nextOccurrenceDates, recurrenceLabel, WEEKDAY_OPTIONS } from '../../utils/recurrence';
import { isTaskOnDate } from '../../utils/task-date';
import { firstValidation, textValidation } from '../../utils/validation';
import { localDateKey } from '../../utils/ads/reward-policy';
import { hapticSelection, hapticSuccess, hapticWarning } from '../../utils/haptics';
import { cancelEntityReminders, consumeNotificationDeepLinkTarget, scheduleTaskReminders } from '../../utils/notifications';
import { toast } from 'sonner';
import {
  Plus, Check, X, Trash2, Edit3, Search, Loader2,
  CheckCircle2, XCircle, Clock, RotateCcw, Flag,
  ChevronDown, CalendarDays, Tag, SlidersHorizontal,
  Sparkles, TrendingUp, AlarmCheck, BarChart2, Filter,
  ArrowUpDown, Circle
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = ['تنظيف', 'رياضة', 'قرآن', 'دراسة', 'قراءة', 'مشروع', 'عمل', 'عائلة', 'صحة', 'أخرى'];

const CATEGORY_META: Record<string, { color: string; bg: string }> = {
  'تنظيف':  { color: 'text-blue-500',   bg: 'bg-blue-500/10' },
  'رياضة':  { color: 'text-red-500',    bg: 'bg-red-500/10' },
  'قرآن':   { color: 'text-amber-600',  bg: 'bg-amber-500/10' },
  'دراسة':  { color: 'text-teal-500',   bg: 'bg-teal-500/10' },
  'قراءة':  { color: 'text-purple-500', bg: 'bg-purple-500/10' },
  'مشروع':  { color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  'عمل':    { color: 'text-cyan-500',   bg: 'bg-cyan-500/10' },
  'عائلة':  { color: 'text-orange-500', bg: 'bg-orange-500/10' },
  'صحة':    { color: 'text-rose-500',   bg: 'bg-rose-500/10' },
  'أخرى':   { color: 'text-gray-500',   bg: 'bg-gray-500/10' },
};

const PRIORITY_META = {
  high:   { label: 'عالية',  color: 'text-red-500',    bg: 'bg-red-500/10',    dot: 'bg-red-500' },
  medium: { label: 'متوسطة', color: 'text-amber-500',  bg: 'bg-amber-500/10',  dot: 'bg-amber-500' },
  low:    { label: 'منخفضة', color: 'text-emerald-500', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
};

const INCOMPLETE_REASONS = ['نسيت', 'لم يتوفر الوقت', 'كسل', 'ظرف طارئ', 'سبب آخر'];

type FilterTab = 'all' | 'today' | 'completed' | 'missed' | 'high';
type SortKey = 'created' | 'priority' | 'dueDate' | 'title';

const emptyForm = () => ({
  title: '',
  category: 'أخرى',
  priority: 'medium' as 'high' | 'medium' | 'low',
  startDate: '',
  endDate: localDateKey(),
  recurrence: 'once',
  repeatDays: [] as number[],
  recurrenceEndDate: '',
  reminderTime: '',
  description: '',
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayStr() { return localDateKey(); }

function focusDeepLinkedCard(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  element.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
  window.setTimeout(() => element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background'), 2600);
}

function taskDate(task: any): string {
  return task.endDate || task.startDate || task.createdAt?.split('T')[0] || '';
}

function isTaskForToday(task: any): boolean {
  return isTaskOnDate(task, todayStr());
}

function getStatus(task: any, date: string): 'completed' | 'missed' | 'pending' {
  const completions = Array.isArray(task.completions) ? task.completions : [];
  const isRecurring = !!task?.recurrence && task.recurrence !== 'once';
  if (isRecurring) {
    const exact = completions.find((x: any) => x.date === date);
    if (!exact) return 'pending';
    return exact.status === 'completed' ? 'completed' : 'missed';
  }
  const latest = [...completions].sort((a: any, b: any) => String(b.time || b.date || '').localeCompare(String(a.time || a.date || '')))[0];
  if (!latest) return 'pending';
  return latest.status === 'completed' ? 'completed' : 'missed';
}

// ── Component ──────────────────────────────────────────────────────────────────

export function TasksPage() {
  const reduceMotion = useReducedMotion();
  const { user } = useAuth();
  const { guardCreation } = useMonetization();
  const [tasks, setTasks]             = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editTask, setEditTask]       = useState<any>(null);
  const [form, setForm]               = useState(emptyForm());
  const [filterTab, setFilterTab]     = useState<FilterTab>('today');
  const [filterCat, setFilterCat]     = useState('');
  const [filterDate, setFilterDate]   = useState('');
  const [sortKey, setSortKey]         = useState<SortKey>('created');
  const [search, setSearch]           = useState('');
  const [incompleteTask, setIncompleteTask] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm]   = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const today = todayStr();

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    setLoading(true);
    try {
      const data = await api('/tasks');
      setTasks(Array.isArray(data) ? data : []);
      const deepLinkId = consumeNotificationDeepLinkTarget('task');
      if (deepLinkId) window.setTimeout(() => focusDeepLinkedCard(`task-${deepLinkId}`), 120);
    } catch { toast.error('فشل تحميل المهام'); }
    finally { setLoading(false); }
  }

  async function saveTask() {
    const validationError = firstValidation(
      textValidation(form.title, 'عنوان المهمة', 180),
      textValidation(form.description, 'وصف المهمة', 4000, false),
    );
    if (validationError) { toast.error(validationError); return; }
    if (!form.endDate) { toast.error('حدد تاريخ المهمة أو تاريخ بدء التكرار'); return; }
    if (form.recurrence === 'weekdays' && form.repeatDays.length === 0) { toast.error('اختر يومًا واحدًا على الأقل للتكرار'); return; }
    if (form.recurrenceEndDate && form.recurrenceEndDate < form.endDate) { toast.error('تاريخ نهاية التكرار يجب أن يكون بعد تاريخ البداية'); return; }
    try {
      let saved: any;
      if (editTask) {
        saved = await api(`/tasks/${editTask.id}`, { method: 'PUT', body: JSON.stringify(form) });
        setTasks(ts => ts.map(t => t.id === saved.id ? saved : t));
        toast.success('تم تحديث المهمة ✓');
      } else {
        if (!await guardCreation({ key: 'tasks', currentCount: tasks.length })) return;
        saved = await api('/tasks', { method: 'POST', body: JSON.stringify(form) });
        setTasks(ts => [saved, ...ts]);
        toast.success('تمت إضافة المهمة ✓');
      }
      if (user?.id) await scheduleTaskReminders(user.id, saved);
      resetForm();
    } catch { toast.error('فشل حفظ المهمة'); }
  }

  async function completeTask(id: string) {
    try {
      const wasCompleted = getStatus(tasks.find(t => t.id === id) || {}, today) === 'completed';
      const updated = await api(`/tasks/${id}/complete`, { method: 'POST' });
      setTasks(ts => ts.map(t => t.id === id ? updated : t));
      if (!wasCompleted) hapticSuccess();
      else hapticSelection();
      if (!wasCompleted && !reduceMotion) {
        confetti({ particleCount: 34, spread: 52, startVelocity: 24, scalar: 0.72, origin: { y: 0.78 } });
      }
      toast.success('أحسنت! تم الإنجاز ✓', { description: 'استمر في تحقيق أهدافك' });
    } catch { toast.error('فشل تحديث المهمة'); }
  }

  async function markIncomplete(taskId: string, reason: string) {
    try {
      const updated = await api(`/tasks/${taskId}/incomplete`, {
        method: 'POST', body: JSON.stringify({ reason }),
      });
      setTasks(ts => ts.map(t => t.id === taskId ? updated : t));
      setIncompleteTask(null);
      hapticWarning();
      toast.info('تم تسجيل الحالة');
    } catch { toast.error('فشل التحديث'); }
  }

  async function deleteTask(id: string) {
    try {
      await api(`/tasks/${id}`, { method: 'DELETE' });
      if (user?.id) await cancelEntityReminders(user.id, 'task', id);
      setTasks(ts => ts.filter(t => t.id !== id));
      setDeleteConfirm(null);
      toast.success('تم حذف المهمة');
    } catch { toast.error('فشل الحذف'); }
  }

  function resetForm() {
    setForm(emptyForm());
    setEditTask(null);
    setShowForm(false);
  }

  function startEdit(task: any) {
    setForm({
      title:       task.title       || '',
      category:    task.category    || 'أخرى',
      priority:    task.priority    || 'medium',
      startDate:   '',
      endDate:     taskDate(task) || today,
      recurrence:  task.recurrence || 'once',
      repeatDays: Array.isArray(task.repeatDays) ? task.repeatDays : [],
      recurrenceEndDate: task.recurrenceEndDate || '',
      reminderTime: task.reminderTime || '',
      description: task.description || '',
    });
    setEditTask(task);
    setShowForm(true);
  }

  // ── Filtering & Sorting ──────────────────────────────────────────────────────

  const filtered = tasks.filter(t => {
    const status = getStatus(t, today);
    if (filterTab === 'today'     && !isTaskForToday(t)) return false;
    if (filterTab === 'completed' && status !== 'completed') return false;
    if (filterTab === 'missed'    && status !== 'missed') return false;
    if (filterTab === 'high'      && t.priority !== 'high') return false;
    if (filterCat && t.category !== filterCat) return false;
    if (filterDate && !isTaskOnDate(t, filterDate)) return false;
    if (search && !t.title?.toLowerCase().includes(search.toLowerCase()) &&
        !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'priority') {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.priority as keyof typeof order] ?? 1) - (order[b.priority as keyof typeof order] ?? 1);
    }
    if (sortKey === 'dueDate') {
      const da = taskDate(a);
      const db = taskDate(b);
      return da.localeCompare(db);
    }
    if (sortKey === 'title') return (a.title || '').localeCompare(b.title || '');
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  // ── Stats ────────────────────────────────────────────────────────────────────

  const todayTasks    = tasks.filter(isTaskForToday);
  const completedTodayList = todayTasks.filter(t => getStatus(t, today) === 'completed');
  const missedTodayList    = todayTasks.filter(t => getStatus(t, today) === 'missed');
  const completionPct = todayTasks.length > 0
    ? Math.round((completedTodayList.length / todayTasks.length) * 100) : 0;

  // Tab counts
  const tabCounts: Record<FilterTab, number> = {
    all:       tasks.length,
    today:     todayTasks.length,
    completed: tasks.filter(t => getStatus(t, today) === 'completed').length,
    missed:    tasks.filter(t => getStatus(t, today) === 'missed').length,
    high:      tasks.filter(t => t.priority === 'high').length,
  };

  const TABS: { key: FilterTab; label: string; color?: string }[] = [
    { key: 'all',       label: 'الكل' },
    { key: 'today',     label: 'اليوم' },
    { key: 'completed', label: 'مكتملة', color: 'text-emerald-500' },
    { key: 'missed',    label: 'فائتة',  color: 'text-red-500' },
    { key: 'high',      label: 'عالية الأولوية', color: 'text-amber-500' },
  ];

  return (
    <div className="lifeos-page-shell max-w-5xl mx-auto space-y-6">

      {/* ── Page introduction ─────────────────────────────────────────────── */}
      <PageHero
        eyebrow="خطتك اليومية"
        title="المهام اليومية"
        description={`${new Date().toLocaleDateString('ar-SA', { weekday: 'long', month: 'long', day: 'numeric' })} • رتّب الأولويات وركّز على الخطوة التالية فقط.`}
        icon={<AlarmCheck size={20} />}
        meta={(
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-extrabold text-primary">{todayTasks.length} لليوم</span>
            {tabCounts.high > 0 && <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-500">{tabCounts.high} أولوية عالية</span>}
          </div>
        )}
        actions={(
          <motion.button
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            onClick={() => { resetForm(); setShowForm(true); }}
            className="lifeos-primary-action"
          >
            <Plus size={16} /> مهمة جديدة
          </motion.button>
        )}
      />

      <RewardCapacityBar rewardKey="tasks" currentCount={tasks.length} />

      {/* ── Today summary ─────────────────────────────────────────────────── */}
      <div className="lifeos-metric-grid">
        <MetricTile label="المتبقي اليوم" value={Math.max(0, todayTasks.length - completedTodayList.length)} icon={<Circle size={16}/>} iconClassName="text-blue-500" helper={`من أصل ${todayTasks.length} مهمة`} />
        <MetricTile label="مكتملة اليوم" value={completedTodayList.length} icon={<CheckCircle2 size={16}/>} iconClassName="text-emerald-500" helper="إنجازات محسوبة اليوم" />
        <MetricTile label="فائتة اليوم" value={missedTodayList.length} icon={<XCircle size={16}/>} iconClassName="text-red-500" helper={missedTodayList.length ? 'تحتاج مراجعة أو إعادة جدولة' : 'لا شيء متأخر حتى الآن'} />
        <MetricTile label="نسبة الإنجاز" value={`${completionPct}%`} icon={<TrendingUp size={16}/>} iconClassName="text-purple-500" progress={completionPct} />
      </div>

      {todayTasks.length > 0 && (
        <motion.section
          className="lifeos-panel overflow-hidden p-4 md:p-5"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.28, delay: reduceMotion ? 0 : 0.04 }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold text-primary">تركيز اليوم</p>
              <h3 className="mt-0.5 text-sm font-black text-foreground">{completionPct === 100 ? 'كل مهام اليوم مكتملة ✨' : `${Math.max(0, todayTasks.length - completedTodayList.length)} مهام تفصلك عن إغلاق يومك`}</h3>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">ابدأ بالمهمة الأعلى أولوية، والباقي سيصبح أسهل.</p>
            </div>
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-base font-black text-primary">{completionPct}%</div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={reduceMotion ? false : { width: 0 }}
              animate={{ width: `${completionPct}%` }}
              transition={{ duration: reduceMotion ? 0.12 : 0.72, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </motion.section>
      )}

      {/* ── Form ────────────────────────────────────────────────────────────── */}
      {showForm && (
        <FormModal open={showForm} title={editTask ? 'تعديل المهمة' : 'إضافة مهمة جديدة'} onClose={resetForm} layoutId={editTask ? `lifeos-task-card-${editTask.id}` : undefined}>
        <div className="bg-card rounded-2xl border border-primary/30 p-5 space-y-4 shadow-xl shadow-primary/5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground text-base">
              {editTask ? '✏️ تعديل المهمة' : '✨ إضافة مهمة جديدة'}
            </h3>
            <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-foreground mb-1.5">اسم المهمة *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && saveTask()}
                placeholder="أدخل اسم المهمة..."
                autoFocus
                className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">الفئة</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">الأولوية</label>
              <div className="flex gap-2">
                {(['high', 'medium', 'low'] as const).map(p => {
                  const meta = PRIORITY_META[p];
                  const active = form.priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, priority: p }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        active
                          ? `${meta.bg} ${meta.color} border-current`
                          : 'border-border text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Task Date */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">{form.recurrence === 'once' ? 'تاريخ المهمة' : 'يبدأ من'}</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            {/* Recurrence */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">التكرار</label>
              <select
                value={form.recurrence}
                onChange={e => setForm(f => ({ ...f, recurrence: e.target.value, repeatDays: e.target.value === 'weekdays' ? f.repeatDays : [] }))}
                className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="once">مرة واحدة</option>
                <option value="daily">يوميًا</option>
                <option value="weekly">مرة كل أسبوع (نفس يوم البداية)</option>
                <option value="monthly">مرة كل شهر (نفس يوم البداية)</option>
                <option value="weekdays">أيام محددة من كل أسبوع</option>
              </select>
              <p className="mt-1 text-[10px] text-muted-foreground">المهمة المتكررة تبقى مهمة واحدة، ويُسجّل إنجاز كل يوم بشكل مستقل.</p>
            </div>

            {form.recurrence === 'weekdays' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-foreground mb-2">أيام التكرار</label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map(day => {
                    const active = form.repeatDays.includes(day.value);
                    return (
                      <button key={day.value} type="button" onClick={() => setForm(f => ({ ...f, repeatDays: active ? f.repeatDays.filter(d => d !== day.value) : [...f.repeatDays, day.value] }))}
                        className={`min-w-12 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                        {day.short}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {form.recurrence !== 'once' && (
              <details className="md:col-span-2 rounded-xl border border-border bg-muted/20 px-4 py-3">
                <summary className="cursor-pointer text-xs font-semibold text-foreground">خيارات التكرار المتقدمة</summary>
                <div className="mt-3 max-w-sm">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">ينتهي في (اختياري)</label>
                  <input type="date" min={form.endDate || undefined} value={form.recurrenceEndDate} onChange={e => setForm(f => ({ ...f, recurrenceEndDate: e.target.value }))}
                    className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <p className="mt-1 text-[10px] text-muted-foreground">اتركه فارغًا إذا كنت تريد استمرار المهمة بدون تاريخ نهاية.</p>
                </div>
              </details>
            )}

            {/* Reminder Time */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">وقت التذكير (اختياري)</label>
              <input
                type="time"
                value={form.reminderTime}
                onChange={e => setForm(f => ({ ...f, reminderTime: e.target.value }))}
                className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">سيصل التنبيه في تاريخ المهمة المحدد.</p>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-foreground mb-1.5">ملاحظات (اختياري)</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="أضف ملاحظات أو تفاصيل إضافية..."
                rows={2}
                className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button
              onClick={resetForm}
              className="px-5 py-2.5 rounded-xl text-sm border border-border text-muted-foreground hover:bg-muted transition-all"
            >
              إلغاء
            </button>
            <button
              onClick={saveTask}
              className="px-5 py-2.5 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-semibold shadow-md shadow-primary/20"
            >
              {editTask ? 'حفظ التغييرات' : 'إضافة المهمة'}
            </button>
          </div>
        </div>
        </FormModal>
      )}

      {/* ── Search & Filters ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="lifeos-toolbar flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث في المهام..."
              className="lifeos-control w-full py-2.5 pr-9 pl-4 text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(s => !s)}
            className={`lifeos-secondary-action ${showFilters ? '!border-primary !bg-primary/5 !text-primary' : ''}`}
          >
            <SlidersHorizontal size={15} />
            <span className="hidden sm:inline">فلترة</span>
          </button>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="lifeos-control px-3 py-2.5 text-sm sm:w-auto"
          >
            <option value="created">الأحدث</option>
            <option value="priority">الأولوية</option>
            <option value="dueDate">تاريخ المهمة</option>
            <option value="title">الاسم</option>
          </select>
        </div>

        {showFilters && (
          <div className="lifeos-panel flex flex-wrap items-end gap-3 p-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium">الفئة</label>
              <select
                value={filterCat}
                onChange={e => setFilterCat(e.target.value)}
                className="bg-input-background border border-border rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">كل الفئات</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium">بحلول تاريخ</label>
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="bg-input-background border border-border rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {(filterCat || filterDate) && (
              <button
                onClick={() => { setFilterCat(''); setFilterDate(''); }}
                className="text-xs text-destructive hover:underline flex items-center gap-1"
              >
                <RotateCcw size={11} /> مسح الفلاتر
              </button>
            )}
          </div>
        )}

        {/* Tab Pills */}
        <div className="lifeos-segmented">
          {TABS.map(tab => {
            const active = filterTab === tab.key;
            return (
              <button key={tab.key} data-active={active} onClick={() => setFilterTab(tab.key)} className="lifeos-segmented-item flex items-center gap-1.5">
                {active && <motion.span layoutId="lifeos-task-filter-active" className="lifeos-segmented-indicator" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                <span className="relative z-10">{tab.label}</span>
                {tabCounts[tab.key] > 0 && <span className="relative z-10 rounded-full bg-muted-foreground/10 px-1.5 py-0.5 text-[9px] font-black">{tabCounts[tab.key]}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tasks List ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="lifeos-panel flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="animate-spin text-primary" size={28} />
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">نرتّب مهامك</p>
            <p className="mt-1 text-xs text-muted-foreground">لحظة واحدة لعرض خطتك الحالية...</p>
          </div>
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState filterTab={filterTab} onAdd={() => { resetForm(); setShowForm(true); }} />
      ) : (
        <motion.div layout className="space-y-3">
          <AnimatePresence mode="popLayout" initial={false}>
          {sorted.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              today={today}
              index={index}
              reduceMotion={!!reduceMotion}
              onComplete={completeTask}
              onIncomplete={() => setIncompleteTask(task)}
              onEdit={startEdit}
              onDelete={() => setDeleteConfirm(task)}
            />
          ))}
          </AnimatePresence>
          <p className="text-center text-xs text-muted-foreground py-2">
            {sorted.length} مهمة
          </p>
        </motion.div>
      )}

      {/* ── Incomplete Reason Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
      {incompleteTask && (
        <Modal onClose={() => setIncompleteTask(null)}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <XCircle size={20} className="text-destructive" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">لماذا لم تكمل المهمة؟</h3>
              <p className="text-sm text-muted-foreground truncate max-w-[220px]">{incompleteTask.title}</p>
            </div>
          </div>
          <div className="space-y-2">
            {INCOMPLETE_REASONS.map(r => (
              <button
                key={r}
                onClick={() => markIncomplete(incompleteTask.id, r)}
                className="w-full text-right px-4 py-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 text-sm transition-all active:scale-[0.99]"
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIncompleteTask(null)}
            className="w-full mt-3 py-2.5 rounded-xl text-sm text-muted-foreground border border-border hover:bg-muted transition-all"
          >
            إلغاء
          </button>
        </Modal>
      )}
      </AnimatePresence>

      {/* ── Delete Confirm Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
      {deleteConfirm && (
        <Modal onClose={() => setDeleteConfirm(null)}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <Trash2 size={20} className="text-destructive" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">حذف المهمة</h3>
              <p className="text-sm text-muted-foreground">هذا الإجراء لا يمكن التراجع عنه</p>
            </div>
          </div>
          <p className="text-sm text-foreground mb-5 bg-muted rounded-xl px-4 py-3">
            "{deleteConfirm.title}"
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 py-2.5 rounded-xl text-sm border border-border text-muted-foreground hover:bg-muted transition-all"
            >
              إلغاء
            </button>
            <button
              onClick={() => deleteTask(deleteConfirm.id)}
              className="flex-1 py-2.5 rounded-xl text-sm bg-destructive text-white hover:bg-destructive/90 transition-all font-semibold"
            >
              حذف
            </button>
          </div>
        </Modal>
      )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TaskCard({ task, today, index, reduceMotion, onComplete, onIncomplete, onEdit, onDelete }: {
  task: any; today: string; index: number; reduceMotion: boolean;
  onComplete: (id: string) => void;
  onIncomplete: () => void;
  onEdit: (t: any) => void;
  onDelete: () => void;
}) {
  const status    = getStatus(task, today);
  const catMeta   = CATEGORY_META[task.category] || { color: 'text-gray-500', bg: 'bg-gray-500/10' };
  const priMeta   = PRIORITY_META[task.priority as keyof typeof PRIORITY_META] || PRIORITY_META.medium;
  const dateKey = taskDate(task);
  const isRecurring = !!task.recurrence && task.recurrence !== 'once';
  const dueToday = isTaskOnDate(task, today);
  const isOverdue = !isRecurring && !!dateKey && dateKey < today && status !== 'completed';
  const nextDate = isRecurring && !dueToday
    ? nextOccurrenceDates({
        anchorDate: dateKey,
        recurrence: task.recurrence,
        repeatDays: task.repeatDays,
        recurrenceEndDate: task.recurrenceEndDate,
        fromDate: today,
        horizonDays: 3660,
        limit: 1,
      })[0] || ''
    : '';
  const [quickOpen, setQuickOpen] = useState(false);
  const dragX = useMotionValue(0);
  const completeReveal = useTransform(dragX, [0, 52, 112], [0.18, 0.7, 1]);
  const deleteReveal = useTransform(dragX, [-112, -52, 0], [1, 0.7, 0.18]);
  const longPress = useLongPress(() => setQuickOpen(true));

  return (
    <div className="relative overflow-hidden rounded-[18px]" data-swipe-block="true">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between rounded-[18px] bg-gradient-to-l from-emerald-500/15 via-transparent to-destructive/15 px-5">
        <motion.span style={{ opacity: completeReveal }} className="flex items-center gap-1.5 text-xs font-bold text-emerald-600"><Check size={14} /> إنجاز</motion.span>
        <motion.span style={{ opacity: deleteReveal }} className="flex items-center gap-1.5 text-xs font-bold text-destructive">حذف <Trash2 size={14} /></motion.span>
      </div>
    <motion.div
      layout
      layoutId={`lifeos-task-card-${task.id}`}
      style={{ x: dragX }}
      drag={reduceMotion ? false : 'x'}
      dragDirectionLock
      dragMomentum={false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.18}
      {...longPress}
      onDragEnd={(_, info) => {
        if (info.offset.x > 92 || info.velocity.x > 850) { onComplete(task.id); }
        else if (info.offset.x < -92 || info.velocity.x < -850) { hapticWarning(); onDelete(); }
      }}
      id={`task-${task.id}`}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -18, scale: 0.98 }}
      transition={{ duration: reduceMotion ? 0.1 : 0.22, delay: reduceMotion ? 0 : Math.min(index * 0.025, 0.16), ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -1 }}
      className={`lifeos-list-card relative bg-card border transition-all duration-200 group ${
        status === 'completed' ? 'border-emerald-500/20 bg-emerald-500/3' :
        status === 'missed'    ? 'border-red-500/20 bg-red-500/3' :
        isOverdue              ? 'border-amber-500/30' :
        !dueToday              ? 'border-border/70 bg-muted/20' :
        'border-border hover:border-primary/20 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3 p-4">

        {/* Priority dot */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 pt-0.5">
          <div className={`w-2 h-2 rounded-full ${priMeta.dot}`} title={priMeta.label} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <motion.span
              animate={status === 'completed' && !reduceMotion ? { opacity: 0.64 } : { opacity: 1 }}
              className={`font-semibold text-sm ${status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}
            >
              {task.title}
            </motion.span>
            {isOverdue && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-semibold">متأخرة</span>
            )}
            {!dueToday && isRecurring && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">غير مطلوبة اليوم</span>
            )}
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${catMeta.bg} ${catMeta.color}`}>
              {task.category}
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${priMeta.bg} ${priMeta.color}`}>
              <Flag size={9} className="inline ml-0.5" />{priMeta.label}
            </span>
            {task.plannedTime && (
              <span className="text-[11px] flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary font-medium">
                <Clock size={9} /> وقت الخطة {task.plannedTime}
              </span>
            )}
            {isRecurring && (
              <span className="text-[11px] flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-500 font-medium">
                <RotateCcw size={9} /> {recurrenceLabel(task.recurrence, task.repeatDays)}
              </span>
            )}
            {dateKey && (
              <span className={`text-[11px] flex items-center gap-1 ${isOverdue ? 'text-amber-500' : 'text-muted-foreground'}`}>
                <CalendarDays size={9} />
                {isRecurring ? 'من ' : ''}{new Date(dateKey + 'T12:00').toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {nextDate && (
              <span className="text-[11px] flex items-center gap-1 text-primary">
                <Clock size={9} /> الموعد القادم {new Date(nextDate + 'T12:00').toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{task.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit.bind(null, task)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
          >
            <Edit3 size={13} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex border-t border-border/50">
        <motion.button
          onClick={() => onComplete(task.id)}
          whileTap={reduceMotion ? undefined : { scale: 0.96 }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-bl-xl transition-all ${
            status === 'completed'
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'text-muted-foreground hover:bg-emerald-500/5 hover:text-emerald-500'
          }`}
        >
          <motion.span
            className="flex"
            animate={status === 'completed' && !reduceMotion ? { scale: [1, 1.35, 1], rotate: [0, -8, 0] } : { scale: 1, rotate: 0 }}
            transition={{ duration: 0.34 }}
          ><Check size={14} /></motion.span>
          {status === 'completed' ? 'تم الإنجاز ✓' : 'تم الإنجاز'}
        </motion.button>
        <div className="w-px bg-border/50" />
        <motion.button
          disabled={!dueToday}
          onClick={onIncomplete}
          whileTap={!reduceMotion && dueToday ? { scale: 0.96 } : undefined}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-br-xl transition-all ${
            !dueToday
              ? 'cursor-not-allowed bg-muted/30 text-muted-foreground/60'
              : status === 'missed'
              ? 'bg-red-500/10 text-red-500'
              : 'text-muted-foreground hover:bg-red-500/5 hover:text-red-500'
          }`}
        >
          <X size={14} />
          {!dueToday ? 'غير مفعّلة' : status === 'missed' ? 'لم أنجزها ✗' : 'لم أنجزها'}
        </motion.button>
      </div>
    </motion.div>
      <QuickActionSheet
        open={quickOpen}
        title={task.title}
        subtitle="إجراءات سريعة للمهمة"
        onClose={() => setQuickOpen(false)}
        actions={[
          { id: 'complete', label: status === 'completed' ? 'المهمة مكتملة' : 'تسجيل الإنجاز', icon: <Check size={16} />, disabled: status === 'completed', onSelect: () => onComplete(task.id) },
          { id: 'missed', label: 'تسجيل أنها لم تُنجز', icon: <XCircle size={16} />, disabled: !dueToday, onSelect: onIncomplete },
          { id: 'edit', label: 'تعديل المهمة', icon: <Edit3 size={16} />, onSelect: () => onEdit(task) },
          { id: 'delete', label: 'حذف المهمة', icon: <Trash2 size={16} />, destructive: true, onSelect: onDelete },
        ]}
      />
    </div>
  );
}

function StatCard({ label, value, icon, color, bg, isPercent, pct }: any) {
  return (
    <motion.div whileHover={{ y: -2 }} className="bg-card rounded-xl border border-border p-3.5">
      <div className={`w-8 h-8 rounded-lg ${bg} ${color} flex items-center justify-center mb-2.5`}>
        {icon}
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
      {isPercent && (
        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
          <motion.div className="h-full bg-purple-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
        </div>
      )}
    </motion.div>
  );
}

function EmptyState({ filterTab, onAdd }: { filterTab: FilterTab; onAdd: () => void }) {
  const messages: Record<FilterTab, { title: string; sub: string; showAdd: boolean }> = {
    all:       { title: 'لا توجد مهام بعد',      sub: 'ابدأ بإضافة مهمتك الأولى وابنِ عادة الإنتاجية',   showAdd: true },
    today:     { title: 'لا مهام لليوم',          sub: 'أضف مهام اليوم وابدأ يومك بشكل منظم',             showAdd: true },
    completed: { title: 'لا مهام مكتملة بعد',    sub: 'أكمل بعض المهام لتظهر هنا',                       showAdd: false },
    missed:    { title: 'لا مهام فائتة 🎉',       sub: 'رائع! لم تفوتك أي مهمة اليوم',                    showAdd: false },
    high:      { title: 'لا مهام عالية الأولوية', sub: 'أضف مهمة وحدد الأولوية "عالية" لتظهر هنا',        showAdd: true },
  };
  const { title, sub, showAdd } = messages[filterTab];
  return (
    <AnimatedEmptyState
      icon={CheckCircle2}
      title={title}
      description={sub}
      action={showAdd ? (
        <motion.button
          onClick={onAdd}
          whileTap={{ scale: 0.96 }}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20"
        >
          <Plus size={15} /> إضافة مهمة
        </motion.button>
      ) : undefined}
    />
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useAndroidBackHandler(true, onClose);
  return (
    <motion.div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full shadow-2xl"
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 390, damping: 30 }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
