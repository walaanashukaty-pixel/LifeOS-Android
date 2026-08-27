import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { toast } from 'sonner';
import { Plus, Trash2, Dumbbell, Loader2 } from 'lucide-react';

const ACTIVITY_TYPES = ['المشي', 'الجري', 'الجيم', 'تمرين منزلي', 'تدريب مقاومة', 'يوغا', 'سباحة', 'ركوب دراجة', 'أخرى'];
const COLORS: Record<string, string> = {
  'المشي': '#10b981', 'الجري': '#ef4444', 'الجيم': '#3b82f6', 'تمرين منزلي': '#8b5cf6',
  'تدريب مقاومة': '#f97316', 'يوغا': '#ec4899', 'سباحة': '#06b6d4', 'ركوب دراجة': '#f59e0b', 'أخرى': '#64748b'
};
const MONTH_LABELS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

export function FitnessPage() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [weights, setWeights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [form, setForm] = useState({ type: 'المشي', date: new Date().toISOString().split('T')[0], duration: 30, calories: 0, notes: '' });
  const [weightForm, setWeightForm] = useState({ weight: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    Promise.all([api('/workouts').catch(() => []), api('/weight').catch(() => [])]).then(([w, wt]) => {
      setWorkouts(Array.isArray(w) ? w : []);
      setWeights(Array.isArray(wt) ? wt : []);
      setLoading(false);
    });
  }, []);

  async function saveWorkout() {
    if (!form.duration) { toast.error('أدخل مدة التمرين'); return; }
    try {
      const created = await api('/workouts', { method: 'POST', body: JSON.stringify(form) });
      setWorkouts(w => [created, ...w]);
      setForm({ type: 'المشي', date: new Date().toISOString().split('T')[0], duration: 30, calories: 0, notes: '' });
      setShowForm(false);
      toast.success('تم تسجيل التمرين ✓');
    } catch { toast.error('فشل الحفظ'); }
  }

  async function saveWeight() {
    if (!weightForm.weight) { toast.error('أدخل الوزن'); return; }
    try {
      const saved = await api('/weight', { method: 'POST', body: JSON.stringify({ weight: +weightForm.weight, date: weightForm.date }) });
      setWeights(w => [...w.filter(x => x.date !== weightForm.date), saved].sort((a, b) => a.date.localeCompare(b.date)));
      setWeightForm({ weight: '', date: new Date().toISOString().split('T')[0] });
      setShowWeightForm(false);
      toast.success('تم تسجيل الوزن');
    } catch { toast.error('فشل الحفظ'); }
  }

  async function deleteWorkout(id: string) {
    try {
      await api(`/workouts/${id}`, { method: 'DELETE' });
      setWorkouts(w => w.filter(x => x.id !== id));
    } catch { toast.error('فشل الحذف'); }
  }

  const totalHours = workouts.reduce((s, w) => s + (w.duration || 0), 0);
  const totalCalories = workouts.reduce((s, w) => s + (w.calories || 0), 0);

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const m = new Date(); m.setMonth(i);
    const monthStr = m.toISOString().slice(0, 7);
    const count = workouts.filter(w => w.date?.startsWith(monthStr)).length;
    return { label: MONTH_LABELS[i].slice(0, 3), count };
  });

  const weightData = weights.map(w => ({ date: w.date?.slice(5), weight: w.weight })).slice(-20);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">اللياقة البدنية</h2>
          <p className="text-sm text-muted-foreground mt-0.5">تتبع تمارينك وصحتك</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowWeightForm(s => !s)} className="flex items-center gap-2 border border-border text-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted">
            الوزن
          </button>
          <button onClick={() => setShowForm(s => !s)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90">
            <Plus size={16} /> تمرين جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-primary">{workouts.length}</p>
          <p className="text-xs text-muted-foreground mt-1">جلسة تمرين</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-blue-500">{Math.round(totalHours / 60)}س</p>
          <p className="text-xs text-muted-foreground mt-1">إجمالي الساعات</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{totalCalories.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">سعرة حرارية</p>
        </div>
      </div>

      {/* Forms */}
      {showForm && (
        <div className="bg-card rounded-2xl border border-primary/30 p-5 space-y-4">
          <h3 className="font-semibold text-foreground">تمرين جديد</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">النشاط</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">التاريخ</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">المدة (دقيقة)</label>
              <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))} min={1} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">السعرات</label>
              <input type="number" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: +e.target.value }))} min={0} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="col-span-2 md:col-span-4">
              <label className="block text-sm font-medium mb-1.5">ملاحظات</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="ملاحظات..." className="w-full bg-input-background border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground">إلغاء</button>
            <button onClick={saveWorkout} className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground">حفظ</button>
          </div>
        </div>
      )}

      {showWeightForm && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <h3 className="font-semibold text-foreground">تسجيل الوزن</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">الوزن (كجم)</label>
              <input type="number" value={weightForm.weight} onChange={e => setWeightForm(f => ({ ...f, weight: e.target.value }))} step={0.1} min={0} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">التاريخ</label>
              <input type="date" value={weightForm.date} onChange={e => setWeightForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowWeightForm(false)} className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground">إلغاء</button>
            <button onClick={saveWeight} className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground">حفظ</button>
          </div>
        </div>
      )}

      {/* Charts — pure CSS, no recharts */}
      

      {/* Workouts List */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">سجل التمارين</h3>
        {workouts.length === 0 ? (
          <div className="text-center py-8">
            <Dumbbell size={32} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">لا توجد تمارين مسجلة</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {[...workouts].sort((a, b) => b.date?.localeCompare(a.date || '') || 0).map(w => (
              <div key={w.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: `${COLORS[w.type] || '#64748b'}20` }}>
                  {w.type === 'المشي' || w.type === 'الجري' ? '🏃' : w.type === 'الجيم' || w.type === 'تدريب مقاومة' ? '💪' : w.type === 'يوغا' ? '🧘' : '⚡'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{w.type}</p>
                  <p className="text-xs text-muted-foreground">{new Date(w.date).toLocaleDateString('ar-SA')}</p>
                </div>
                <div className="text-left flex-shrink-0">
                  <p className="text-sm font-medium text-foreground">{w.duration} دق</p>
                  {w.calories > 0 && <p className="text-xs text-amber-500">{w.calories} سعرة</p>}
                </div>
                <button onClick={() => deleteWorkout(w.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CSSBarChart({ data, color }: { data: { label: string; count: number }[]; color: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center gap-1 h-full justify-end cursor-default"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        >
          <div className="relative w-full flex flex-col items-center justify-end" style={{ height: '100px' }}>
            {hovered === i && d.count > 0 && (
              <div className="absolute bottom-full mb-1.5 z-10 bg-popover border border-border text-foreground text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-md pointer-events-none">
                {d.count} جلسة
              </div>
            )}
            <div
              className="w-full rounded-t-md transition-all duration-200"
              style={{
                height: `${Math.max((d.count / max) * 100, d.count > 0 ? 4 : 1)}%`,
                background: hovered === i ? color : `${color}88`,
              }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground select-none">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function CSSLineChart({ data, color }: { data: { date: string; weight: number }[]; color: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const values = data.map(d => d.weight);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const H = 100;
  const W = 100;

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((d.weight - min) / range) * (H - 10) - 5,
    ...d,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <div className="relative" style={{ height: '120px' }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="2"
            fill={hovered === i ? color : 'var(--color-card)'}
            stroke={color}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            style={{ cursor: 'default' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      {hovered !== null && (
        <div
          className="absolute z-10 bg-popover border border-border text-foreground text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-md pointer-events-none"
          style={{ left: `${points[hovered].x}%`, top: 0, transform: 'translateX(-50%)' }}
        >
          {points[hovered].weight} كجم — {points[hovered].date}
        </div>
      )}
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">{data[0]?.date}</span>
        <span className="text-[10px] text-muted-foreground">{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
