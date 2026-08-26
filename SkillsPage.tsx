import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { toast } from 'sonner';
import { Plus, Trash2, Edit3, Zap, Loader2 } from 'lucide-react';

const SKILL_CATEGORIES = ['التصميم', 'البرمجة', 'التسويق', 'إدارة الأعمال', 'التصوير', 'كتابة المحتوى', 'المبيعات', 'التحليل', 'القيادة', 'التواصل', 'أخرى'];
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316'];

export function SkillsPage() {
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSkill, setEditSkill] = useState<any>(null);
  const [form, setForm] = useState({ name: '', category: 'أخرى', currentLevel: 1, targetLevel: 10, hoursInvested: 0, notes: '' });

  useEffect(() => { loadSkills(); }, []);

  async function loadSkills() {
    try {
      const data = await api('/skills');
      setSkills(Array.isArray(data) ? data : []);
    } catch { toast.error('فشل التحميل'); }
    finally { setLoading(false); }
  }

  async function saveSkill() {
    if (!form.name.trim()) { toast.error('أدخل اسم المهارة'); return; }
    try {
      if (editSkill) {
        const updated = await api(`/skills/${editSkill.id}`, { method: 'PUT', body: JSON.stringify(form) });
        setSkills(s => s.map(x => x.id === updated.id ? updated : x));
        toast.success('تم التحديث');
      } else {
        const created = await api('/skills', { method: 'POST', body: JSON.stringify(form) });
        setSkills(s => [created, ...s]);
        toast.success('تمت الإضافة');
      }
      resetForm();
    } catch { toast.error('فشل الحفظ'); }
  }

  async function addHours(id: string, hours: number) {
    const skill = skills.find(s => s.id === id);
    if (!skill) return;
    try {
      const updated = await api(`/skills/${id}`, { method: 'PUT', body: JSON.stringify({ ...skill, hoursInvested: (skill.hoursInvested || 0) + hours }) });
      setSkills(s => s.map(x => x.id === id ? updated : x));
    } catch {}
  }

  async function deleteSkill(id: string) {
    if (!confirm('حذف هذه المهارة؟')) return;
    try {
      await api(`/skills/${id}`, { method: 'DELETE' });
      setSkills(s => s.filter(x => x.id !== id));
    } catch { toast.error('فشل الحذف'); }
  }

  function resetForm() {
    setForm({ name: '', category: 'أخرى', currentLevel: 1, targetLevel: 10, hoursInvested: 0, notes: '' });
    setEditSkill(null);
    setShowForm(false);
  }

  const totalHours = skills.reduce((s, sk) => s + (sk.hoursInvested || 0), 0);
  const radarData = skills.slice(0, 6).map(s => ({ skill: s.name.slice(0, 8), level: s.currentLevel }));

  function RadarChart({ data }: { data: { skill: string; level: number }[] }) {
    const cx = 110, cy = 110, r = 80, n = data.length;
    if (n < 3) return null;
    const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
    const pt = (i: number, radius: number) => ({
      x: cx + radius * Math.cos(angle(i)),
      y: cy + radius * Math.sin(angle(i)),
    });
    const rings = [0.25, 0.5, 0.75, 1].map(f =>
      data.map((_, i) => pt(i, r * f)).map((p, j) => (j === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ') + 'Z'
    );
    const filledPath = data
      .map((d, i) => pt(i, (d.level / 10) * r))
      .map((p, j) => (j === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ') + 'Z';
    return (
      <svg width={220} height={220} className="mx-auto">
        {rings.map((d, i) => <path key={i} d={d} fill="none" stroke="var(--color-border)" strokeWidth={1} />)}
        {data.map((_, i) => { const p = pt(i, r); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--color-border)" strokeWidth={1} />; })}
        <path d={filledPath} fill="#10b981" fillOpacity={0.25} stroke="#10b981" strokeWidth={2} />
        {data.map((d, i) => { const p = pt(i, r + 16); return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="var(--color-muted-foreground)">{d.skill}</text>
        ); })}
      </svg>
    );
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">تطوير المهارات</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{skills.length} مهارة · {totalHours} ساعة إجمالي</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90">
          <Plus size={16} /> مهارة جديدة
        </button>
      </div>

      {/* Radar Chart */}
      {radarData.length > 2 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">خريطة المهارات</h3>
          <RadarChart data={radarData} />
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-card rounded-2xl border border-primary/30 p-5 space-y-4">
          <h3 className="font-semibold text-foreground">{editSkill ? 'تعديل المهارة' : 'مهارة جديدة'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">اسم المهارة *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: تصميم UI" className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">الفئة</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {SKILL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">ساعات التدريب</label>
              <input type="number" value={form.hoursInvested} onChange={e => setForm(f => ({ ...f, hoursInvested: +e.target.value }))} min={0} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">المستوى الحالي: {form.currentLevel}/10</label>
              <input type="range" value={form.currentLevel} onChange={e => setForm(f => ({ ...f, currentLevel: +e.target.value }))} min={1} max={10} className="w-full accent-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">المستوى المستهدف: {form.targetLevel}/10</label>
              <input type="range" value={form.targetLevel} onChange={e => setForm(f => ({ ...f, targetLevel: +e.target.value }))} min={1} max={10} className="w-full accent-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">ملاحظات</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="خطط، موارد..." className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground">إلغاء</button>
            <button onClick={saveSkill} className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground">حفظ</button>
          </div>
        </div>
      )}

      {/* Skills Grid */}
      {skills.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Zap size={40} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">لا توجد مهارات</p>
          <p className="text-sm text-muted-foreground">ابدأ بإضافة مهاراتك وتتبع تطورها</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {skills.map((skill, idx) => {
            const pct = Math.round((skill.currentLevel / skill.targetLevel) * 100);
            const color = COLORS[idx % COLORS.length];
            return (
              <div key={skill.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{skill.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{skill.category}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditSkill(skill); setForm({ name: skill.name, category: skill.category, currentLevel: skill.currentLevel, targetLevel: skill.targetLevel, hoursInvested: skill.hoursInvested || 0, notes: skill.notes || '' }); setShowForm(true); }} className="p-1.5 rounded hover:bg-muted text-muted-foreground">
                      <Edit3 size={12} />
                    </button>
                    <button onClick={() => deleteSkill(skill.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Level visualization */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex gap-0.5 flex-1">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div
                        key={i}
                        className="flex-1 h-3 rounded-sm transition-all"
                        style={{
                          background: i < skill.currentLevel ? color : i < skill.targetLevel ? `${color}30` : 'var(--color-muted)',
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-foreground w-8 text-left">{skill.currentLevel}/10</span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>🕒 {skill.hoursInvested || 0} ساعة</span>
                  <span>الهدف: {skill.targetLevel}/10</span>
                  <span style={{ color }} className="font-medium">{pct}%</span>
                </div>

                {skill.notes && <p className="text-xs text-muted-foreground mt-2 bg-muted rounded px-2 py-1">{skill.notes}</p>}

                <div className="flex gap-2 mt-3">
                  {[1, 2, 5].map(h => (
                    <button key={h} onClick={() => addHours(skill.id, h)} className="flex-1 py-1 rounded-lg text-xs bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
                      +{h}س
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
