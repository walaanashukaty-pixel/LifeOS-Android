import { useState, useEffect, useMemo } from 'react';
import { api } from '../../utils/api';
import { toast } from 'sonner';
import {
  Plus, Trash2, Edit3, Check, X, Flame, Loader2, Star,
  ChevronLeft, ChevronRight, Search, SlidersHorizontal,
  Trophy, TrendingUp, BarChart2, Activity, Target,
  BookOpen, Droplets, Moon, Sun, Heart, Zap, DollarSign,
  Users, Palette, Globe, Coffee, Dumbbell, Music, Camera,
  Leaf, PenLine, Brain, Clock, ArrowLeft, Bell, RotateCcw,
  CheckCircle2, XCircle, Calendar, Sparkles
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────────
interface HabitLog { date: string; completed: boolean; status?: string; time?: string; note?: string; }
interface Habit {
  id: string; userId: string; name: string; description?: string;
  category: string; icon: string; color: string;
  startDate: string; recurrence: 'daily' | 'weekly' | 'monthly';
  reminderTime?: string; dailyGoal?: string;
  favorite?: boolean; logs: HabitLog[]; createdAt: string;
}
interface Category { id: string; name: string; icon: string; color: string; isCustom?: boolean; }

// ── Constants ──────────────────────────────────────────────────────────────────

const PALETTE = [
  '#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444',
  '#06b6d4','#f97316','#ec4899','#14b8a6','#84cc16',
  '#6366f1','#a855f7','#d97706','#0891b2',
];

const ICONS_LIST = [
  '📖','💧','🏃','💪','🕌','⭐','🎯','🧘','📝','🌅',
  '😴','🍎','💊','🎨','📷','🎵','🌱','☕','💰','👨‍👩‍👧',
  '🏋️','🚶','📚','🌙','✨','🙏','❤️','🔥','🏆','⚡',
  '🎓','💡','🌍','🧠','🎭','🌸','✏️','🎮','🏠','🌿',
];

const BUILTIN_CATEGORIES: Category[] = [
  { id: 'personal', name: 'التطوير الشخصي', icon: '🧠', color: '#8b5cf6' },
  { id: 'health',   name: 'الصحة واللياقة',  icon: '💪', color: '#ef4444' },
  { id: 'spiritual',name: 'الروحانيات',       icon: '🕌', color: '#f59e0b' },
  { id: 'study',    name: 'الدراسة والعمل',   icon: '📚', color: '#3b82f6' },
  { id: 'finance',  name: 'المالية',           icon: '💰', color: '#10b981' },
  { id: 'social',   name: 'العلاقات',          icon: '👨‍👩‍👧', color: '#ec4899' },
  { id: 'femininity',name: 'الأنوثة',          icon: '🌸', color: '#f97316' },
  { id: 'masculinity',name: 'الرجولة',         icon: '👔', color: '#06b6d4' },
  { id: 'hobbies',  name: 'الهوايات',          icon: '🎨', color: '#a855f7' },
  { id: 'lifestyle', name: 'أسلوب الحياة',     icon: '🌍', color: '#14b8a6' },
];

const TEMPLATES: { category: string; habits: { name: string; icon: string; goal?: string }[] }[] = [
  { category: 'personal', habits: [
    { name: 'القراءة', icon: '📖', goal: 'قراءة 30 صفحة' },
    { name: 'تعلم لغة', icon: '🌍', goal: 'ممارسة 20 دقيقة' },
    { name: 'تعلم البرمجة', icon: '💡', goal: 'كتابة كود يومي' },
    { name: 'اليوميات', icon: '✏️', goal: 'كتابة 10 دقائق' },
    { name: 'التأمل', icon: '🧘', goal: 'تأمل 10 دقائق' },
    { name: 'مجلة الامتنان', icon: '❤️', goal: '3 أشياء ممتنة' },
  ]},
  { category: 'health', habits: [
    { name: 'شرب الماء', icon: '💧', goal: 'شرب 8 أكواب' },
    { name: 'المشي', icon: '🚶', goal: 'المشي 6000 خطوة' },
    { name: 'الجري', icon: '🏃', goal: 'الجري 30 دقيقة' },
    { name: 'تدريب القوة', icon: '💪', goal: 'تمرين 45 دقيقة' },
    { name: 'الإطالة', icon: '🧘', goal: 'إطالة 15 دقيقة' },
    { name: 'النوم المبكر', icon: '😴', goal: 'النوم قبل 11 مساءً' },
    { name: 'تناول الفيتامينات', icon: '💊', goal: 'جرعة يومية' },
    { name: 'العناية بالبشرة', icon: '🌸', goal: 'روتين صباحي ومسائي' },
  ]},
  { category: 'spiritual', habits: [
    { name: 'الصلاة في وقتها', icon: '🕌', goal: '5 صلوات في وقتها' },
    { name: 'أذكار الصباح', icon: '🌅', goal: 'أذكار الصباح' },
    { name: 'أذكار المساء', icon: '🌙', goal: 'أذكار المساء' },
    { name: 'قراءة القرآن', icon: '📖', goal: 'قراءة ورد يومي' },
    { name: 'حفظ القرآن', icon: '⭐', goal: 'حفظ صفحة واحدة' },
    { name: 'قيام الليل', icon: '🌙', goal: 'قيام الليل' },
    { name: 'الصدقة', icon: '❤️', goal: 'صدقة يومية' },
    { name: 'الاستغفار', icon: '🙏', goal: '100 مرة' },
  ]},
  { category: 'study', habits: [
    { name: 'المذاكرة', icon: '📚', goal: 'دراسة ساعتين' },
    { name: 'مراجعة الدروس', icon: '🎓', goal: 'مراجعة يومية' },
    { name: 'العمل على مشروع', icon: '💡', goal: 'جلسة عمل واحدة' },
    { name: 'تعلم مهارة جديدة', icon: '⚡', goal: '30 دقيقة تعلم' },
    { name: 'إتمام كورس أونلاين', icon: '🎯', goal: 'درس يومي' },
  ]},
  { category: 'finance', habits: [
    { name: 'الادخار اليومي', icon: '💰', goal: 'توفير مبلغ يومي' },
    { name: 'تتبع المصاريف', icon: '📝', goal: 'تسجيل كل مصروف' },
    { name: 'مراجعة الاستثمارات', icon: '📈', goal: 'مراجعة أسبوعية' },
    { name: 'تجنب الشراء العشوائي', icon: '🛑', goal: 'لا مشتريات غير ضرورية' },
  ]},
  { category: 'social', habits: [
    { name: 'التواصل مع العائلة', icon: '👨‍👩‍👧', goal: 'مكالمة يومية' },
    { name: 'وقت مع الشريك', icon: '❤️', goal: '30 دقيقة حوار' },
    { name: 'شكر شخص ما', icon: '🙏', goal: 'شكر شخص يومياً' },
    { name: 'عمل خيري', icon: '🌟', goal: 'عمل طيب واحد' },
    { name: 'التواصل مع صديق', icon: '👋', goal: 'رسالة أو مكالمة' },
  ]},
  { category: 'femininity', habits: [
    { name: 'العناية بالبشرة', icon: '🌸', goal: 'روتين كامل' },
    { name: 'العناية بالشعر', icon: '✨', goal: 'عناية يومية' },
    { name: 'الأناقة الشخصية', icon: '💅', goal: 'الاهتمام بالمظهر' },
    { name: 'الأناقة في اللبس', icon: '👗', goal: 'ارتداء ملابس أنيقة' },
    { name: 'لغة الجسد', icon: '🦋', goal: 'تحسين الوقفة والمشية' },
    { name: 'مهارات التواصل', icon: '💬', goal: 'تحسين مهارات الحوار' },
    { name: 'تعلم الإتيكيت', icon: '⭐', goal: 'تعلم قاعدة جديدة' },
    { name: 'ارتداء العطر', icon: '🌺', goal: 'يومياً' },
  ]},
  { category: 'masculinity', habits: [
    { name: 'تدريب القوة', icon: '💪', goal: 'تمرين مكثف' },
    { name: 'تحسين الوقفة', icon: '🎯', goal: 'تصحيح الوضعية' },
    { name: 'الانضباط اليومي', icon: '⚡', goal: 'الالتزام بالجدول' },
    { name: 'القيادة والمسؤولية', icon: '🏆', goal: 'مبادرة واحدة يومياً' },
    { name: 'قراءة كتب القيادة', icon: '📖', goal: '20 صفحة يومياً' },
    { name: 'الالتزام بالمواعيد', icon: '⏰', goal: 'الحضور في الوقت' },
    { name: 'بناء الثقة بالنفس', icon: '🔥', goal: 'تحدٍّ يومي' },
  ]},
  { category: 'hobbies', habits: [
    { name: 'الرسم', icon: '🎨', goal: 'رسم 20 دقيقة' },
    { name: 'التصوير', icon: '📷', goal: 'صورة واحدة يومياً' },
    { name: 'العزف الموسيقي', icon: '🎵', goal: 'ممارسة 30 دقيقة' },
    { name: 'الطبخ', icon: '🍳', goal: 'طبخ وجبة جديدة' },
    { name: 'الكتابة', icon: '✏️', goal: 'كتابة 300 كلمة' },
    { name: 'تعلم التصميم', icon: '💡', goal: 'مشروع تصميم يومي' },
  ]},
  { category: 'lifestyle', habits: [
    { name: 'تنظيف الغرفة', icon: '🏠', goal: 'ترتيب يومي' },
    { name: 'تنظيم مكان العمل', icon: '📋', goal: 'مكتب نظيف' },
    { name: 'تقليل وقت الشاشة', icon: '📵', goal: 'أقل من 2 ساعة' },
    { name: 'تجنب السوشيال ميديا', icon: '🚫', goal: 'بدون تصفح لا داعي له' },
    { name: 'التعرض لأشعة الشمس', icon: '☀️', goal: '15 دقيقة في الشمس' },
    { name: 'قهوة باعتدال', icon: '☕', goal: 'كوبان كحد أقصى' },
  ]},
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().split('T')[0]; }

function calcStreak(logs: HabitLog[]): number {
  const completed = logs.filter(l => l.completed).map(l => l.date).sort().reverse();
  if (!completed.length) return 0;
  let streak = 0;
  let cur = new Date();
  for (const d of completed) {
    const diff = Math.floor((cur.getTime() - new Date(d).getTime()) / 86400000);
    if (diff <= 1) { streak++; cur = new Date(d); }
    else break;
  }
  return streak;
}

function calcLongestStreak(logs: HabitLog[]): number {
  const completed = [...new Set(logs.filter(l => l.completed).map(l => l.date))].sort();
  if (!completed.length) return 0;
  let best = 1, cur = 1;
  for (let i = 1; i < completed.length; i++) {
    const diff = (new Date(completed[i]).getTime() - new Date(completed[i-1]).getTime()) / 86400000;
    cur = diff === 1 ? cur + 1 : 1;
    best = Math.max(best, cur);
  }
  return best;
}

function getLogForDate(logs: HabitLog[], date: string): HabitLog | undefined {
  return logs.find(l => l.date === date);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month, day).getDay();
}

// ── ContributionCalendar ───────────────────────────────────────────────────────

function ContributionCalendar({ logs, color, month: initMonth, year: initYear }: {
  logs: HabitLog[]; color: string; month?: number; year?: number;
}) {
  const now = new Date();
  const [year, setYear] = useState(initYear ?? now.getFullYear());
  const [month, setMonth] = useState(initMonth ?? now.getMonth());

  const days = getDaysInMonth(year, month);
  const firstDow = getDayOfWeek(year, month, 1); // 0=Sun

  const cells = Array.from({ length: days }, (_, i) => {
    const d = i + 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const log = getLogForDate(logs, dateStr);
    return { d, dateStr, log };
  });

  const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

  function prev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function next() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={prev} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><ChevronRight size={14} /></button>
        <span className="text-xs font-semibold text-foreground">{monthNames[month]} {year}</span>
        <button onClick={next} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><ChevronLeft size={14} /></button>
      </div>
      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['أح','إث','ثل','أر','خم','جم','سب'].map(d => (
          <div key={d} className="text-center text-[9px] text-muted-foreground font-medium">{d}</div>
        ))}
      </div>
      {/* Empty offset */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
        {cells.map(({ d, dateStr, log }) => {
          let bg = 'bg-muted opacity-40';
          let title = dateStr;
          if (log?.completed) { bg = ''; title = `✓ ${dateStr}`; }
          else if (log && !log.completed) { bg = 'bg-red-400 opacity-60'; title = `✗ ${dateStr}`; }
          return (
            <div
              key={d}
              title={title}
              className={`aspect-square rounded-sm ${bg} transition-all cursor-default`}
              style={log?.completed ? { backgroundColor: color } : undefined}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 justify-end">
        <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-sm bg-muted opacity-40 inline-block" /> لا شيء
        </span>
        <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-400 opacity-60 inline-block" /> فائت
        </span>
        <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: color }} /> مكتمل
        </span>
      </div>
    </div>
  );
}

// ── HabitDetailModal ───────────────────────────────────────────────────────────

function HabitDetailModal({ habit, onClose, onLog }: {
  habit: Habit; onClose: () => void;
  onLog: (id: string, completed: boolean, note?: string) => void;
}) {
  const today = todayStr();
  const todayLog = getLogForDate(habit.logs, today);
  const streak = calcStreak(habit.logs);
  const longest = calcLongestStreak(habit.logs);
  const totalDone = habit.logs.filter(l => l.completed).length;
  const [noteInput, setNoteInput] = useState('');
  const [activeTab, setActiveTab] = useState<'calendar'|'stats'|'history'>('calendar');

  // Weekly chart — last 12 weeks
  const weeklyData = Array.from({ length: 12 }, (_, i) => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (11 - i) * 7);
    let count = 0;
    for (let d = 0; d < 7; d++) {
      const dt = new Date(weekStart);
      dt.setDate(dt.getDate() + d);
      const ds = dt.toISOString().split('T')[0];
      if (habit.logs.some(l => l.date === ds && l.completed)) count++;
    }
    return { week: `أ${i + 1}`, count };
  });

  // Monthly chart — last 6 months
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const dt = new Date();
    dt.setMonth(dt.getMonth() - (5 - i));
    const y = dt.getFullYear(), m = dt.getMonth();
    const days = getDaysInMonth(y, m);
    let count = 0;
    for (let d = 1; d <= days; d++) {
      const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      if (habit.logs.some(l => l.date === ds && l.completed)) count++;
    }
    const names = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    return { month: names[m].slice(0, 3), count, total: days };
  });

  // Last 30 logs sorted desc
  const recentLogs = [...habit.logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);

  const tooltipStyle = { background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-background rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-border">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-border flex-shrink-0"
          style={{ borderTop: `3px solid ${habit.color}` }}>
          <span className="text-3xl">{habit.icon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-lg">{habit.name}</h3>
            {habit.description && <p className="text-sm text-muted-foreground truncate">{habit.description}</p>}
            {habit.dailyGoal && <p className="text-xs text-primary mt-0.5">🎯 {habit.dailyGoal}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-0 border-b border-border flex-shrink-0">
          {[
            { label: 'السلسلة الحالية', value: `${streak}🔥`, color: 'text-orange-500' },
            { label: 'أطول سلسلة',     value: `${longest}🏆`, color: 'text-amber-500' },
            { label: 'إجمالي الأيام',  value: totalDone,       color: 'text-primary' },
            { label: 'حالة اليوم',     value: todayLog?.completed ? '✅' : todayLog ? '❌' : '—', color: 'text-foreground' },
          ].map((s, i) => (
            <div key={i} className="text-center py-3 border-l border-border first:border-l-0">
              <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Log today */}
        <div className="px-5 py-3 border-b border-border flex-shrink-0">
          <div className="flex gap-2 items-center">
            <input
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              placeholder="ملاحظة اليوم (اختياري)..."
              className="flex-1 bg-input-background border border-border rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <button
              onClick={() => { onLog(habit.id, true, noteInput); setNoteInput(''); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                todayLog?.completed ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              <Check size={14} /> {todayLog?.completed ? 'تم!' : 'أنجزت'}
            </button>
            <button
              onClick={() => { onLog(habit.id, false, noteInput); setNoteInput(''); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                todayLog && !todayLog.completed ? 'bg-destructive/20 text-destructive border border-destructive/30' : 'border border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive'
              }`}
            >
              <X size={14} /> فاتني
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0 px-5">
          {([['calendar','التقويم'],['stats','الإحصائيات'],['history','السجل']] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2.5 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'calendar' && (
            <div className="space-y-5">
              <ContributionCalendar logs={habit.logs} color={habit.color} />
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">الإنجاز الأسبوعي (آخر 12 أسبوع)</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={weeklyData} barSize={16}>
                    <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} أيام`, '']} />
                    <Bar dataKey="count" name="أيام" fill={habit.color} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">الإنجاز الشهري (آخر 6 أشهر)</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={monthlyData} barSize={24}>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any, _: any, p: any) => [`${v}/${p.payload.total} يوم`, '']} />
                    <Bar dataKey="count" name="أيام" fill={habit.color} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Completion rates */}
              <div className="grid grid-cols-3 gap-3">
                {[7,30,90].map(days => {
                  const doneInPeriod = Array.from({ length: days }, (_, i) => {
                    const dt = new Date(); dt.setDate(dt.getDate() - i);
                    return dt.toISOString().split('T')[0];
                  }).filter(d => habit.logs.some(l => l.date === d && l.completed)).length;
                  return (
                    <div key={days} className="bg-card border border-border rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-foreground">{Math.round(doneInPeriod/days*100)}%</p>
                      <p className="text-[10px] text-muted-foreground">آخر {days} يوم</p>
                      <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${doneInPeriod/days*100}%`, backgroundColor: habit.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-2">
              {recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">لا يوجد سجل بعد</p>
              ) : recentLogs.map((log, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${log.completed ? 'border-primary/20 bg-primary/5' : 'border-destructive/20 bg-destructive/5'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${log.completed ? 'bg-primary text-white' : 'bg-destructive text-white'}`}>
                    {log.completed ? <Check size={11} /> : <X size={11} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{log.date}</p>
                    {log.note && <p className="text-xs text-muted-foreground truncate">{log.note}</p>}
                  </div>
                  {log.time && <span className="text-[10px] text-muted-foreground flex-shrink-0">{log.time.split('T')[1]?.slice(0,5)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── HabitCard ──────────────────────────────────────────────────────────────────

function HabitCard({ habit, today, onLog, onEdit, onDelete, onToggleFavorite, onOpen }: {
  habit: Habit; today: string;
  onLog: (id: string, completed: boolean) => void;
  onEdit: (h: Habit) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (h: Habit) => void;
  onOpen: (h: Habit) => void;
}) {
  const todayLog  = getLogForDate(habit.logs, today);
  const streak    = calcStreak(habit.logs);
  const longest   = calcLongestStreak(habit.logs);
  const totalDone = habit.logs.filter(l => l.completed).length;
  const last30Done = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  }).filter(d => habit.logs.some(l => l.date === d && l.completed)).length;
  const rate30 = Math.round(last30Done / 30 * 100);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden group hover:border-primary/20 hover:shadow-sm transition-all">
      {/* Color bar */}
      <div className="h-1 flex-shrink-0" style={{ background: habit.color }} />

      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start gap-3 mb-3">
          <button
            onClick={() => onOpen(habit)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-transform hover:scale-110"
            style={{ background: `${habit.color}18` }}
          >
            {habit.icon}
          </button>
          <div className="flex-1 min-w-0">
            <button onClick={() => onOpen(habit)} className="font-semibold text-foreground hover:text-primary transition-colors text-right block truncate w-full">
              {habit.name}
            </button>
            {habit.dailyGoal && <p className="text-xs text-muted-foreground truncate">{habit.dailyGoal}</p>}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={() => onToggleFavorite(habit)} className={`p-1.5 rounded-lg transition-colors ${habit.favorite ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-500 opacity-0 group-hover:opacity-100'}`}>
              <Star size={13} fill={habit.favorite ? 'currentColor' : 'none'} />
            </button>
            <button onClick={() => onEdit(habit)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-all">
              <Edit3 size={13} />
            </button>
            <button onClick={() => onDelete(habit.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{streak}🔥</p>
            <p className="text-[10px] text-muted-foreground">متتالي</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{longest}🏆</p>
            <p className="text-[10px] text-muted-foreground">الأطول</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{rate30}%</p>
            <p className="text-[10px] text-muted-foreground">30 يوم</p>
          </div>
        </div>

        {/* Mini contribution dots */}
        <div className="flex gap-0.5 mb-3 overflow-hidden">
          {Array.from({ length: 28 }, (_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (27 - i));
            const ds = d.toISOString().split('T')[0];
            const log = getLogForDate(habit.logs, ds);
            return (
              <div
                key={i}
                title={ds}
                className="flex-1 h-2.5 rounded-sm"
                style={{
                  background: log?.completed ? habit.color
                    : log ? '#ef444444'
                    : 'var(--color-muted)',
                  opacity: log?.completed ? 1 : log ? 0.7 : 0.3,
                }}
              />
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onLog(habit.id, true)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              todayLog?.completed
                ? 'bg-primary/15 text-primary border border-primary/25'
                : 'border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary'
            }`}
          >
            <Check size={13} />
            {todayLog?.completed ? 'تم ✓' : 'أنجزت'}
          </button>
          <button
            onClick={() => onLog(habit.id, false)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              todayLog && !todayLog.completed
                ? 'bg-destructive/15 text-destructive border border-destructive/25'
                : 'border border-dashed border-border text-muted-foreground hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive'
            }`}
          >
            <X size={13} />
            {todayLog && !todayLog.completed ? 'فات ✗' : 'فاتني'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Category Form Modal ────────────────────────────────────────────────────────

function CategoryModal({ cat, onSave, onClose }: {
  cat?: Category; onSave: (c: Partial<Category>) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({ name: cat?.name || '', icon: cat?.icon || '⭐', color: cat?.color || '#10b981' });
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border p-5 w-full max-w-sm shadow-2xl">
        <h3 className="font-bold text-foreground mb-4">{cat ? 'تعديل الفئة' : 'فئة جديدة'}</h3>
        <div className="space-y-3">
          <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
            placeholder="اسم الفئة" autoFocus
            className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          <div>
            <label className="block text-xs text-muted-foreground mb-2 font-medium">الأيقونة</label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {ICONS_LIST.map(ic => (
                <button key={ic} onClick={() => setForm(f => ({...f, icon: ic}))}
                  className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${form.icon === ic ? 'ring-2 ring-primary scale-110 bg-primary/10' : 'hover:bg-muted'}`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-2 font-medium">اللون</label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map(c => (
                <button key={c} onClick={() => setForm(f => ({...f, color: c}))}
                  className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm border border-border text-muted-foreground hover:bg-muted">إلغاء</button>
          <button onClick={() => { if (form.name.trim()) { onSave(form); onClose(); } else toast.error('أدخل اسم الفئة'); }}
            className="flex-1 py-2.5 rounded-xl text-sm bg-primary text-primary-foreground font-semibold hover:bg-primary/90">حفظ</button>
        </div>
      </div>
    </div>
  );
}

// ── Templates Modal ────────────────────────────────────────────────────────────

function TemplatesModal({ categories, onSelect, onClose }: {
  categories: Category[];
  onSelect: (tpl: { name: string; icon: string; goal?: string; catId: string; color: string }) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const allCats = [...BUILTIN_CATEGORIES, ...categories.filter(c => c.isCustom)];

  const filtered = TEMPLATES.flatMap(t => {
    const cat = allCats.find(c => c.id === t.category) || allCats[0];
    return t.habits.map(h => ({ ...h, catId: t.category, color: cat.color }));
  }).filter(h => !search || h.name.includes(search));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center gap-3 p-4 border-b border-border flex-shrink-0">
          <Sparkles size={18} className="text-primary" />
          <h3 className="font-bold text-foreground flex-1">قوالب العادات</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16}/></button>
        </div>
        <div className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="relative">
            <Search size={13} className="absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في القوالب..."
              className="w-full bg-input-background border border-border rounded-xl py-2 pr-8 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {TEMPLATES.map(t => {
            const cat = [...BUILTIN_CATEGORIES].find(c => c.id === t.category);
            const habits = t.habits.filter(h => !search || h.name.includes(search));
            if (!habits.length) return null;
            return (
              <div key={t.category}>
                <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <span>{cat?.icon}</span>{cat?.name}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {habits.map(h => (
                    <button key={h.name}
                      onClick={() => { onSelect({ name: h.name, icon: h.icon, goal: h.goal, catId: t.category, color: cat?.color || '#10b981' }); onClose(); }}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 text-right transition-all text-sm">
                      <span className="text-base flex-shrink-0">{h.icon}</span>
                      <div className="min-w-0">
                        <p className="text-foreground text-xs font-medium truncate">{h.name}</p>
                        {h.goal && <p className="text-muted-foreground text-[10px] truncate">{h.goal}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Habit Form ─────────────────────────────────────────────────────────────────

function HabitForm({ habit, categories, onSave, onCancel }: {
  habit?: Habit; categories: Category[];
  onSave: (data: any) => void; onCancel: () => void;
}) {
  const allCats = [...BUILTIN_CATEGORIES, ...categories.filter(c => c.isCustom)];
  const [form, setForm] = useState({
    name:         habit?.name         || '',
    category:     habit?.category     || 'personal',
    icon:         habit?.icon         || '⭐',
    color:        habit?.color        || PALETTE[0],
    description:  habit?.description  || '',
    startDate:    habit?.startDate    || todayStr(),
    recurrence:   habit?.recurrence   || 'daily',
    reminderTime: habit?.reminderTime || '',
    dailyGoal:    habit?.dailyGoal    || '',
  });

  const selCat = allCats.find(c => c.id === form.category);

  return (
    <div className="bg-card rounded-2xl border border-primary/30 p-5 space-y-4 shadow-xl shadow-primary/5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground">{habit && habit.id && habit.id !== '__tpl__' ? '✏️ تعديل العادة' : '✨ عادة جديدة'}</h3>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16}/></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-foreground mb-1.5">اسم العادة *</label>
          <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
            placeholder="مثال: شرب الماء" autoFocus
            className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">الفئة</label>
          <select value={form.category} onChange={e => {
            const cat = allCats.find(c => c.id === e.target.value);
            setForm(f => ({...f, category: e.target.value, color: cat?.color || f.color}));
          }}
            className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
            {allCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>

        {/* Icon */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">الأيقونة</label>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-input-background border border-border rounded-xl">
            {ICONS_LIST.map(ic => (
              <button key={ic} type="button" onClick={() => setForm(f => ({...f, icon: ic}))}
                className={`w-7 h-7 rounded-lg text-base flex items-center justify-center transition-all flex-shrink-0 ${form.icon === ic ? 'ring-2 ring-primary scale-110 bg-primary/10' : 'hover:bg-muted'}`}>
                {ic}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">اللون</label>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map(c => (
              <button key={c} type="button" onClick={() => setForm(f => ({...f, color: c}))}
                className={`w-6 h-6 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : ''}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>

        {/* Daily Goal */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">الهدف اليومي</label>
          <input value={form.dailyGoal} onChange={e => setForm(f => ({...f, dailyGoal: e.target.value}))}
            placeholder="مثال: شرب 8 أكواب"
            className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>

        {/* Recurrence */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">التكرار</label>
          <div className="flex gap-2">
            {([['daily','يومي'],['weekly','أسبوعي'],['monthly','شهري']] as const).map(([val, label]) => (
              <button key={val} type="button" onClick={() => setForm(f => ({...f, recurrence: val}))}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  form.recurrence === val ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                }`}>{label}</button>
            ))}
          </div>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">تاريخ البدء</label>
          <input type="date" value={form.startDate} onChange={e => setForm(f => ({...f, startDate: e.target.value}))}
            className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>

        {/* Reminder */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">وقت التذكير (اختياري)</label>
          <input type="time" value={form.reminderTime} onChange={e => setForm(f => ({...f, reminderTime: e.target.value}))}
            className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-foreground mb-1.5">وصف (اختياري)</label>
          <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
            placeholder="وصف أو ملاحظات..." rows={2}
            className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm border border-border text-muted-foreground hover:bg-muted">إلغاء</button>
        <button onClick={() => onSave(form)} className="px-5 py-2.5 rounded-xl text-sm bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-md shadow-primary/20">
          {habit && habit.id && habit.id !== '__tpl__' ? 'حفظ التغييرات' : 'إضافة العادة'}
        </button>
      </div>
    </div>
  );
}

// ── Main HabitsPage ────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'today' | 'completed' | 'missed' | 'favorites' | 'daily' | 'weekly' | 'monthly';

export function HabitsPage() {
  const [habits, setHabits]           = useState<Habit[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editHabit, setEditHabit]     = useState<Habit | null>(null);
  const [detailHabit, setDetailHabit] = useState<Habit | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editCat, setEditCat]         = useState<Category | null>(null);
  const [filterTab, setFilterTab]     = useState<FilterTab>('all');
  const [filterCat, setFilterCat]     = useState('');
  const [search, setSearch]           = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const today = todayStr();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [h, c] = await Promise.all([api('/habits'), api('/habitCategories')]);
      setHabits(Array.isArray(h) ? h : []);
      setCategories(Array.isArray(c) ? c : []);
    } catch { toast.error('فشل تحميل البيانات'); }
    finally { setLoading(false); }
  }

  async function saveHabit(data: any) {
    if (!data.name.trim()) { toast.error('أدخل اسم العادة'); return; }
    try {
      if (editHabit && editHabit.id !== '__tpl__') {
        const updated = await api(`/habits/${editHabit.id}`, { method: 'PUT', body: JSON.stringify(data) });
        setHabits(h => h.map(x => x.id === updated.id ? updated : x));
        if (detailHabit?.id === updated.id) setDetailHabit(updated);
        toast.success('تم التحديث ✓');
      } else {
        const created = await api('/habits', { method: 'POST', body: JSON.stringify(data) });
        setHabits(h => [created, ...h]);
        toast.success('تمت الإضافة ✓');
      }
      setShowForm(false); setEditHabit(null);
    } catch { toast.error('فشل الحفظ'); }
  }

  async function logHabit(id: string, completed: boolean, note?: string) {
    try {
      const updated = await api(`/habits/${id}/log`, {
        method: 'POST',
        body: JSON.stringify({ date: today, completed, status: completed ? 'completed' : 'missed', note }),
      });
      setHabits(h => h.map(x => x.id === id ? updated : x));
      if (detailHabit?.id === id) setDetailHabit(updated);
      if (completed) toast.success('أحسنت! تم التسجيل ✓');
    } catch { toast.error('فشل التسجيل'); }
  }

  async function deleteHabit(id: string) {
    if (!confirm('هل تريد حذف هذه العادة؟')) return;
    try {
      await api(`/habits/${id}`, { method: 'DELETE' });
      setHabits(h => h.filter(x => x.id !== id));
      if (detailHabit?.id === id) setDetailHabit(null);
      toast.success('تم الحذف');
    } catch { toast.error('فشل الحذف'); }
  }

  async function toggleFavorite(habit: Habit) {
    const updated = await api(`/habits/${habit.id}`, { method: 'PUT', body: JSON.stringify({ ...habit, favorite: !habit.favorite }) });
    setHabits(h => h.map(x => x.id === updated.id ? updated : x));
  }

  async function saveCat(data: Partial<Category>) {
    if (editCat) {
      const updated = await api(`/habitCategories/${editCat.id}`, { method: 'PUT', body: JSON.stringify(data) });
      setCategories(c => c.map(x => x.id === editCat.id ? { ...x, ...data } : x));
    } else {
      const created = await api('/habitCategories', { method: 'POST', body: JSON.stringify({ ...data, isCustom: true }) });
      setCategories(c => [...c, created]);
    }
    setEditCat(null);
  }

  async function deleteCat(id: string) {
    await api(`/habitCategories/${id}`, { method: 'DELETE' });
    setCategories(c => c.filter(x => x.id !== id));
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const completedToday  = habits.filter(h => getLogForDate(h.logs, today)?.completed).length;
  const missedToday     = habits.filter(h => { const l = getLogForDate(h.logs, today); return l && !l.completed; }).length;
  const activeHabits    = habits.filter(h => h.logs.some(l => {
    const d = new Date(l.date); const now = new Date();
    return (now.getTime() - d.getTime()) / 86400000 <= 30;
  }));
  const allStreaks       = habits.map(h => calcStreak(h.logs));
  const longestCurStreak = Math.max(0, ...allStreaks);
  const bestHabit        = habits[allStreaks.indexOf(longestCurStreak)];
  const overallRate      = habits.length > 0
    ? Math.round(habits.reduce((s, h) => {
        const done = Array.from({length:30},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().split('T')[0];})
          .filter(d=>h.logs.some(l=>l.date===d&&l.completed)).length;
        return s + done/30;
      }, 0) / habits.length * 100) : 0;

  const needsImprovement = [...habits]
    .map(h => ({ h, rate: Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().split('T')[0];}).filter(d=>h.logs.some(l=>l.date===d&&l.completed)).length }))
    .filter(x => x.rate < 3)
    .sort((a,b) => a.rate - b.rate)
    .slice(0, 3);

  // ── Filtering ──────────────────────────────────────────────────────────────

  const allCats = [...BUILTIN_CATEGORIES, ...categories.filter(c => c.isCustom)];

  const filtered = habits.filter(h => {
    const todayLog = getLogForDate(h.logs, today);
    if (filterTab === 'completed' && !todayLog?.completed) return false;
    if (filterTab === 'missed'    && !(todayLog && !todayLog.completed)) return false;
    if (filterTab === 'favorites' && !h.favorite) return false;
    if (filterTab === 'daily'     && h.recurrence !== 'daily') return false;
    if (filterTab === 'weekly'    && h.recurrence !== 'weekly') return false;
    if (filterTab === 'monthly'   && h.recurrence !== 'monthly') return false;
    if (filterCat && h.category !== filterCat) return false;
    if (search && !h.name.includes(search) && !h.description?.includes(search)) return false;
    if (filterTab === 'today') {
      if (h.recurrence === 'daily') return true;
      if (h.recurrence === 'weekly') return new Date(h.startDate).getDay() === new Date().getDay();
      if (h.recurrence === 'monthly') return new Date(h.startDate).getDate() === new Date().getDate();
      return false;
    }
    return true;
  });

  // Sort: favorites first, then by streak desc
  const sorted = [...filtered].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    return calcStreak(b.logs) - calcStreak(a.logs);
  });

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all',       label: 'الكل' },
    { key: 'today',     label: 'اليوم' },
    { key: 'completed', label: 'مكتملة' },
    { key: 'missed',    label: 'فائتة' },
    { key: 'favorites', label: '⭐ المفضلة' },
    { key: 'daily',     label: 'يومي' },
    { key: 'weekly',    label: 'أسبوعي' },
    { key: 'monthly',   label: 'شهري' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Flame size={20} className="text-orange-500" /> العادات
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">بناء عادات إيجابية مستدامة</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTemplates(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all">
            <Sparkles size={14} /> قوالب
          </button>
          <button onClick={() => { setShowForm(true); setEditHabit(null); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-md shadow-primary/25 active:scale-95 transition-all">
            <Plus size={16} /> إضافة عادة
          </button>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-3.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2"><Activity size={15}/></div>
          <p className="text-xl font-bold text-foreground">{habits.length}</p>
          <p className="text-xs text-muted-foreground">إجمالي العادات</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2"><CheckCircle2 size={15}/></div>
          <p className="text-xl font-bold text-foreground">{completedToday}</p>
          <p className="text-xs text-muted-foreground">مكتملة اليوم</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3.5">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center mb-2"><Flame size={15}/></div>
          <p className="text-xl font-bold text-foreground">{longestCurStreak}🔥</p>
          <p className="text-xs text-muted-foreground">أطول سلسلة</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center mb-2"><TrendingUp size={15}/></div>
          <p className="text-xl font-bold text-foreground">{overallRate}%</p>
          <p className="text-xs text-muted-foreground">معدل الإنجاز</p>
          <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${overallRate}%` }} />
          </div>
        </div>
      </div>

      {/* Best habit + needs improvement */}
      {(bestHabit || needsImprovement.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bestHabit && (
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: `${bestHabit.color}20` }}>
                {bestHabit.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-amber-600 font-semibold mb-0.5">🏆 أفضل عادة حالياً</p>
                <p className="text-foreground font-semibold truncate">{bestHabit.name}</p>
                <p className="text-xs text-muted-foreground">{longestCurStreak} أيام متتالية</p>
              </div>
            </div>
          )}
          {needsImprovement.length > 0 && (
            <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 rounded-2xl p-4">
              <p className="text-xs text-red-500 font-semibold mb-2">⚠️ تحتاج تحسيناً هذا الأسبوع</p>
              <div className="space-y-1">
                {needsImprovement.map(({ h, rate }) => (
                  <div key={h.id} className="flex items-center gap-2">
                    <span className="text-sm">{h.icon}</span>
                    <span className="text-sm text-foreground flex-1 truncate">{h.name}</span>
                    <span className="text-xs text-muted-foreground">{rate}/7 أيام</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Form ────────────────────────────────────────────────────────────── */}
      {showForm && (
        <HabitForm
          habit={editHabit || undefined}
          categories={categories}
          onSave={saveHabit}
          onCancel={() => { setShowForm(false); setEditHabit(null); }}
        />
      )}

      {/* ── Custom Categories Manager ───────────────────────────────────────── */}
      {categories.filter(c => c.isCustom).length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">فئاتي المخصصة</p>
            <button onClick={() => { setEditCat(null); setShowCatForm(true); }}
              className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={11}/>إضافة فئة</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.filter(c => c.isCustom).map(cat => (
              <div key={cat.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs">
                <span>{cat.icon}</span>
                <span className="text-foreground">{cat.name}</span>
                <button onClick={() => { setEditCat(cat); setShowCatForm(true); }} className="text-muted-foreground hover:text-foreground ml-1"><Edit3 size={10}/></button>
                <button onClick={() => deleteCat(cat.id)} className="text-muted-foreground hover:text-destructive"><X size={10}/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Search & Filters ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في العادات..."
              className="w-full bg-input-background border border-border rounded-xl py-2.5 pr-9 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
          <button onClick={() => setShowFilters(s => !s)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-all ${showFilters ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
            <SlidersHorizontal size={15} />
          </button>
          <button onClick={() => { setEditCat(null); setShowCatForm(true); }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all">
            <Plus size={14} /> فئة
          </button>
        </div>

        {showFilters && (
          <div className="bg-card rounded-xl border border-border p-3 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium">الفئة</label>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="bg-input-background border border-border rounded-lg py-1.5 px-3 text-sm focus:outline-none">
                <option value="">كل الفئات</option>
                {allCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            {filterCat && (
              <button onClick={() => setFilterCat('')} className="text-xs text-destructive hover:underline flex items-center gap-1">
                <RotateCcw size={11}/> مسح
              </button>
            )}
          </div>
        )}

        {/* Tab Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setFilterTab(tab.key)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filterTab === tab.key ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Habits Grid ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="text-sm text-muted-foreground">جارٍ تحميل العادات...</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Flame size={28} className="text-muted-foreground" />
          </div>
          <p className="text-foreground font-semibold text-base mb-1">
            {habits.length === 0 ? 'لا توجد عادات بعد' : 'لا نتائج'}
          </p>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
            {habits.length === 0 ? 'ابدأ ببناء عاداتك الإيجابية اليومية' : 'حاول تغيير الفلاتر أو البحث'}
          </p>
          {habits.length === 0 && (
            <div className="flex gap-2 justify-center">
              <button onClick={() => setShowTemplates(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-border text-foreground rounded-xl text-sm hover:bg-muted transition-all">
                <Sparkles size={14} /> من القوالب
              </button>
              <button onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
                <Plus size={14} /> عادة جديدة
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map(habit => (
            <HabitCard
              key={habit.id}
              habit={habit}
              today={today}
              onLog={logHabit}
              onEdit={h => { setEditHabit(h); setShowForm(true); }}
              onDelete={deleteHabit}
              onToggleFavorite={toggleFavorite}
              onOpen={setDetailHabit}
            />
          ))}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {detailHabit && (
        <HabitDetailModal
          habit={detailHabit}
          onClose={() => setDetailHabit(null)}
          onLog={logHabit}
        />
      )}

      {showTemplates && (
        <TemplatesModal
          categories={categories}
          onSelect={tpl => {
            setShowTemplates(false);
            setEditHabit({
              id: '__tpl__', userId: '', name: tpl.name, icon: tpl.icon,
              color: tpl.color, category: tpl.catId, dailyGoal: tpl.goal || '',
              startDate: todayStr(), recurrence: 'daily', logs: [], createdAt: '',
            } as any);
            setShowForm(true);
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {showCatForm && (
        <CategoryModal
          cat={editCat || undefined}
          onSave={saveCat}
          onClose={() => { setShowCatForm(false); setEditCat(null); }}
        />
      )}
    </div>
  );
}
