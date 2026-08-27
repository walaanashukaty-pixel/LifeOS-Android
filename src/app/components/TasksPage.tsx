import { useState, useEffect, useRef } from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../App';
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

const RECURRENCES = [
  { val: '',        label: 'مرة واحدة' },
  { val: 'daily',   label: 'يومي' },
  { val: 'weekly',  label: 'أسبوعي' },
  { val: 'monthly', label: 'شهري' },
];

const RECURRENCE_LABELS: Record<string, string> = {
  daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري',
};

const INCOMPLETE_REASONS = ['نسيت', 'لم يتوفر الوقت', 'كسل', 'ظرف طارئ', 'سبب آخر'];

type FilterTab = 'all' | 'today' | 'completed' | 'missed' | 'high';
type SortKey = 'created' | 'priority' | 'dueDate' | 'title';

const emptyForm = () => ({
  title: '',
  category: 'أخرى',
  priority: 'medium' as 'high' | 'medium' | 'low',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  recurrence: '',
  reminderTime: '',
  description: '',
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().split('T')[0]; }

function focusDeepLinkedCard(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  element.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
  window.setTimeout(() => element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background'), 2600);
}

function isTaskForToday(task: any): boolean {
  const today = todayStr();
  if (task.recurrence === 'daily') return true;
  if (task.recurrence === 'weekly') {
    return new Date(task.startDate || task.createdAt).getDay() === new Date().getDay();
  }
  if (task.recurrence === 'monthly') {
    return new Date(task.startDate || task.createdAt).getDate() === new Date().getDate();
  }
  // One-time: in range
  const start = task.startDate || task.createdAt?.split('T')[0];
  const end = task.endDate;
  if (start && start > today) return false;
  if (end && end < today) return false;
  return true;
}

function getStatus(task: any, date: string): 'completed' | 'missed' | 'pending' {
  const c = task.completions?.find((x: any) => x.date === date);
  if (!c) return 'pending';
  return c.status === 'completed' ? 'completed' : 'missed';
}

// ── Component ──────────────────────────────────────────────────────────────────

export function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks]             = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editTask, setEditTask]       = useState<any>(null);
  const [form, setForm]               = useState(emptyForm());
  const [filterTab, setFilterTab]     = useState<FilterTab>('all');
  const [filterCat, setFilterCat]     = useState('');
  const [filterDate, setFilterDate]   = useState('');
  const [sortKey, setSortKey]         = useState<SortKey>('created');
  const [search, setSearch]           = useState('');
  const [incompleteTask, setIncompleteTask] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm]   = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
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
    if (!form.title.trim()) { toast.error('أدخل عنوان المهمة'); return; }
    try {
      let saved: any;
      if (editTask) {
        saved = await api(`/tasks/${editTask.id}`, { method: 'PUT', body: JSON.stringify(form) });
        setTasks(ts => ts.map(t => t.id === saved.id ? saved : t));
        toast.success('تم تحديث المهمة ✓');
      } else {
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
      const updated = await api(`/tasks/${id}/complete`, { method: 'POST' });
      setTasks(ts => ts.map(t => t.id === id ? updated : t));
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
      startDate:   task.startDate   || today,
      endDate:     task.endDate     || '',
      recurrence:  task.recurrence  || '',
      reminderTime: task.reminderTime || '',
      description: task.description || '',
    });
    setEditTask(task);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  // ── Filtering & Sorting ──────────────────────────────────────────────────────

  const filtered = tasks.filter(t => {
    const status = getStatus(t, today);
    if (filterTab === 'today'     && !isTaskForToday(t)) return false;
    if (filterTab === 'completed' && status !== 'completed') return false;
    if (filterTab === 'missed'    && status !== 'missed') return false;
    if (filterTab === 'high'      && t.priority !== 'high') return false;
    if (filterCat && t.category !== filterCat) return false;
    if (filterDate && t.startDate && t.startDate > filterDate) return false;
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
      const da = a.endDate || a.startDate || a.createdAt || '';
      const db = b.endDate || b.startDate || b.createdAt || '';
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
    <div className="max-w-4xl mx-auto space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <AlarmCheck size={20} className="text-blue-500" />
            المهام اليومية
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('ar-SA', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(s => !s); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/25 active:scale-95"
        >
          <Plus size={16} /> مهمة جديدة
        </button>
      </div>

      {/* ── Stats Row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="إجمالي المهام"   value={tasks.length}                icon={<BarChart2 size={16}/>}    color="text-blue-500"    bg="bg-blue-500/10" />
        <StatCard label="مكتملة اليوم"    value={completedTodayList.length}   icon={<CheckCircle2 size={16}/>} color="text-emerald-500" bg="bg-emerald-500/10" />
        <StatCard label="فائتة اليوم"     value={missedTodayList.length}      icon={<XCircle size={16}/>}      color="text-red-500"     bg="bg-red-500/10" />
        <StatCard label="نسبة الإنجاز"    value={`${completionPct}%`}         icon={<TrendingUp size={16}/>}   color="text-purple-500"  bg="bg-purple-500/10" isPercent pct={completionPct} />
        <StatCard label="مهام اليوم"      value={todayTasks.length}           icon={<CalendarDays size={16}/>} color="text-amber-500"   bg="bg-amber-500/10" />
      </div>

      {/* ── Today Progress Bar ──────────────────────────────────────────────── */}
      {todayTasks.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-foreground">تقدم اليوم</span>
            <span className="text-sm font-bold text-primary">{completedTodayList.length} / {todayTasks.length}</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${completionPct}%`,
                background: completionPct === 100
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, #3b82f6, #10b981)',
              }}
            />
          </div>
          {completionPct === 100 && (
            <p className="text-xs text-emerald-500 font-medium mt-2 flex items-center gap-1">
              <Sparkles size={12} /> ممتاز! أكملت جميع مهام اليوم
            </p>
          )}
        </div>
      )}

      {/* ── Form ────────────────────────────────────────────────────────────── */}
      {showForm && (
        <div ref={formRef} className="bg-card rounded-2xl border border-primary/30 p-5 space-y-4 shadow-xl shadow-primary/5">
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

            {/* Start Date */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">تاريخ البدء</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">تاريخ الانتهاء</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                min={form.startDate}
                className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            {/* Recurrence */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">التكرار</label>
              <select
                value={form.recurrence}
                onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))}
                className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                {RECURRENCES.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
              </select>
            </div>

            {/* Reminder Time */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">وقت التذكير (اختياري)</label>
              <input
                type="time"
                value={form.reminderTime}
                onChange={e => setForm(f => ({ ...f, reminderTime: e.target.value }))}
                className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">سيصل التنبيه في تاريخ الانتهاء، أو تاريخ البدء إذا لم تحدد نهاية.</p>
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
      )}

      {/* ── Search & Filters ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث في المهام..."
              className="w-full bg-input-background border border-border rounded-xl py-2.5 pr-9 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(s => !s)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-all ${showFilters ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:border-primary/40'}`}
          >
            <SlidersHorizontal size={15} />
            <span className="hidden sm:inline">فلترة</span>
          </button>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="bg-input-background border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            <option value="created">الأحدث</option>
            <option value="priority">الأولوية</option>
            <option value="dueDate">تاريخ الانتهاء</option>
            <option value="title">الاسم</option>
          </select>
        </div>

        {showFilters && (
          <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap gap-3 items-end">
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
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filterTab === tab.key
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {tabCounts[tab.key] > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  filterTab === tab.key ? 'bg-white/20' : 'bg-muted-foreground/20'
                }`}>
                  {tabCounts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tasks List ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="text-sm text-muted-foreground">جارٍ تحميل المهام...</p>
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState filterTab={filterTab} onAdd={() => { resetForm(); setShowForm(true); }} />
      ) : (
        <div className="space-y-2.5">
          {sorted.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              today={today}
              onComplete={completeTask}
              onIncomplete={() => setIncompleteTask(task)}
              onEdit={startEdit}
              onDelete={() => setDeleteConfirm(task)}
            />
          ))}
          <p className="text-center text-xs text-muted-foreground py-2">
            {sorted.length} مهمة
          </p>
        </div>
      )}

      {/* ── Incomplete Reason Modal ──────────────────────────────────────────── */}
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

      {/* ── Delete Confirm Modal ────────────────────────────────────────────── */}
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
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TaskCard({ task, today, onComplete, onIncomplete, onEdit, onDelete }: {
  task: any; today: string;
  onComplete: (id: string) => void;
  onIncomplete: () => void;
  onEdit: (t: any) => void;
  onDelete: () => void;
}) {
  const status    = getStatus(task, today);
  const catMeta   = CATEGORY_META[task.category] || { color: 'text-gray-500', bg: 'bg-gray-500/10' };
  const priMeta   = PRIORITY_META[task.priority as keyof typeof PRIORITY_META] || PRIORITY_META.medium;
  const isOverdue = task.endDate && task.endDate < today && status !== 'completed';

  return (
    <div
      id={`task-${task.id}`}
      className={`bg-card rounded-xl border transition-all duration-200 group ${
        status === 'completed' ? 'border-emerald-500/20 bg-emerald-500/3' :
        status === 'missed'    ? 'border-red-500/20 bg-red-500/3' :
        isOverdue              ? 'border-amber-500/30' : 'border-border hover:border-primary/20 hover:shadow-sm'
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
            <span className={`font-semibold text-sm ${status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {task.title}
            </span>
            {isOverdue && status !== 'completed' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-semibold">متأخرة</span>
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
            {task.recurrence && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">
                <RotateCcw size={9} className="inline ml-0.5" />{RECURRENCE_LABELS[task.recurrence]}
              </span>
            )}
            {task.endDate && (
              <span className={`text-[11px] flex items-center gap-1 ${isOverdue ? 'text-amber-500' : 'text-muted-foreground'}`}>
                <Clock size={9} />
                {new Date(task.endDate).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
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
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
          >
            <Edit3 size={13} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex border-t border-border/50">
        <button
          onClick={() => onComplete(task.id)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-bl-xl transition-all ${
            status === 'completed'
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'text-muted-foreground hover:bg-emerald-500/5 hover:text-emerald-500'
          }`}
        >
          <Check size={14} />
          {status === 'completed' ? 'تم الإنجاز ✓' : 'تم الإنجاز'}
        </button>
        <div className="w-px bg-border/50" />
        <button
          onClick={onIncomplete}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-br-xl transition-all ${
            status === 'missed'
              ? 'bg-red-500/10 text-red-500'
              : 'text-muted-foreground hover:bg-red-500/5 hover:text-red-500'
          }`}
        >
          <X size={14} />
          {status === 'missed' ? 'لم أنجزها ✗' : 'لم أنجزها'}
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, bg, isPercent, pct }: any) {
  return (
    <div className="bg-card rounded-xl border border-border p-3.5">
      <div className={`w-8 h-8 rounded-lg ${bg} ${color} flex items-center justify-center mb-2.5`}>
        {icon}
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
      {isPercent && (
        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
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
    <div className="text-center py-16 bg-card rounded-2xl border border-border">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 size={28} className="text-muted-foreground" />
      </div>
      <p className="text-foreground font-semibold text-base mb-1">{title}</p>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">{sub}</p>
      {showAdd && (
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
        >
          <Plus size={15} /> إضافة مهمة
        </button>
      )}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div
        className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
