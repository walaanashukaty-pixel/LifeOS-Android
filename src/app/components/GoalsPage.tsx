import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { toast } from 'sonner';
import { Plus, Trash2, Edit3, Target, Loader2, Calendar, ChevronUp, ChevronDown } from 'lucide-react';

type GoalType = 'short' | 'medium' | 'long';
const GOAL_LABELS: Record<GoalType, { label: string; duration: string; color: string; bg: string }> = {
  short: { label: 'قصير المدى', duration: 'شهر واحد', color: 'text-green-500', bg: 'bg-green-500/10' },
  medium: { label: 'متوسط المدى', duration: '6 أشهر', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  long: { label: 'طويل المدى', duration: 'سنة أو أكثر', color: 'text-purple-500', bg: 'bg-purple-500/10' },
};

export function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState<any>(null);
  const [form, setForm] = useState({ title: '', description: '', type: 'short' as GoalType, startDate: new Date().toISOString().split('T')[0], deadline: '', progress: 0 });

  useEffect(() => { loadGoals(); }, []);

  async function loadGoals() {
    try {
      const data = await api('/goals');
      setGoals(Array.isArray(data) ? data : []);
    } catch { toast.error('فشل تحميل الأهداف'); }
    finally { setLoading(false); }
  }

  async function saveGoal() {
    if (!form.title.trim()) { toast.error('أدخل عنوان الهدف'); return; }
    try {
      if (editGoal) {
        const updated = await api(`/goals/${editGoal.id}`, { method: 'PUT', body: JSON.stringify(form) });
        setGoals(g => g.map(x => x.id === updated.id ? updated : x));
        toast.success('تم التحديث');
      } else {
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
    } catch { toast.error('فشل التحديث'); }
  }

  async function deleteGoal(id: string) {
    if (!confirm('هل تريد حذف هذا الهدف؟')) return;
    try {
      await api(`/goals/${id}`, { method: 'DELETE' });
      setGoals(g => g.filter(x => x.id !== id));
      toast.success('تم الحذف');
    } catch { toast.error('فشل الحذف'); }
  }

  function resetForm() {
    setForm({ title: '', description: '', type: 'short', startDate: new Date().toISOString().split('T')[0], deadline: '', progress: 0 });
    setEditGoal(null);
    setShowForm(false);
  }

  const byType = (type: GoalType) => goals.filter(g => g.type === type);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">الأهداف</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{goals.filter(g => g.progress >= 100).length} مكتمل من {goals.length}</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 shadow-sm shadow-primary/20"
        >
          <Plus size={16} /> هدف جديد
        </button>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-3 gap-4">
        {(['short', 'medium', 'long'] as GoalType[]).map(type => {
          const { label, color, bg, duration } = GOAL_LABELS[type];
          const typeGoals = byType(type);
          const avg = typeGoals.length > 0 ? Math.round(typeGoals.reduce((s, g) => s + (g.progress || 0), 0) / typeGoals.length) : 0;
          return (
            <div key={type} className="bg-card rounded-xl border border-border p-4">
              <div className={`text-xs font-medium ${color} ${bg} inline-flex px-2 py-0.5 rounded-full mb-2`}>{label}</div>
              <p className="text-lg font-bold text-foreground">{typeGoals.length}</p>
              <p className="text-xs text-muted-foreground">هدف · {avg}% متوسط</p>
            </div>
          );
        })}
      </div>

      {/* Form */}
      {showForm && (
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
              <label className="block text-sm font-medium mb-1.5">تاريخ البدء</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">الموعد النهائي</label>
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
      )}

      {/* Goals by type */}
      {(['short', 'medium', 'long'] as GoalType[]).map(type => {
        const typeGoals = byType(type);
        if (typeGoals.length === 0) return null;
        const { label, color, bg, duration } = GOAL_LABELS[type];
        return (
          <div key={type} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${color}`}>{label}</span>
              <span className="text-xs text-muted-foreground">({duration})</span>
              <span className={`text-xs ${bg} ${color} px-2 py-0.5 rounded-full`}>{typeGoals.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {typeGoals.map(goal => {
                const isComplete = goal.progress >= 100;
                const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000) : null;
                return (
                  <div key={goal.id} className={`bg-card rounded-xl border p-4 ${isComplete ? 'border-primary/30' : 'border-border'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className={`font-medium text-sm ${isComplete ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{goal.title}</h3>
                        {goal.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{goal.description}</p>}
                      </div>
                      <div className="flex gap-1 mr-2">
                        <button onClick={() => { setEditGoal(goal); setForm({ title: goal.title, description: goal.description || '', type: goal.type, startDate: goal.startDate || '', deadline: goal.deadline || '', progress: goal.progress || 0 }); setShowForm(true); }} className="p-1 rounded hover:bg-muted text-muted-foreground">
                          <Edit3 size={12} />
                        </button>
                        <button onClick={() => deleteGoal(goal.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isComplete ? 'bg-primary' : color.replace('text-', 'bg-')}`}
                          style={{ width: `${goal.progress || 0}%` }}
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
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {goals.length === 0 && (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Target size={40} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">لا توجد أهداف بعد</p>
          <p className="text-sm text-muted-foreground">حدد أهدافك وابدأ في تحقيقها</p>
        </div>
      )}
    </div>
  );
}
