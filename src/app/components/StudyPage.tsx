import { useState, useEffect } from 'react';
import { FormModal } from './ui/FormModal';
import { api } from '../../utils/api';
import { useMonetization } from '../monetization/MonetizationProvider';
import { countCreatedOnDate } from '../../utils/ads/reward-policy';
import { toast } from 'sonner';
import { Plus, Trash2, Edit3, GraduationCap, Loader2, BookOpen } from 'lucide-react';

export function StudyPage() {
  const { guardCreation } = useMonetization();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSubject, setEditSubject] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionForm, setSessionForm] = useState({ hours: 1, date: new Date().toISOString().split('T')[0], notes: '' });
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: '', completed: false });
  const [showExamForm, setShowExamForm] = useState(false);
  const [examForm, setExamForm] = useState({ name: '', grade: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => { loadSubjects(); }, []);

  async function loadSubjects() {
    try {
      const data = await api('/subjects');
      const subs = Array.isArray(data) ? data : [];
      setSubjects(subs);
      if (subs.length > 0 && !selected) setSelected(subs[0]);
    } catch { toast.error('فشل التحميل'); }
    finally { setLoading(false); }
  }

  async function saveSubject() {
    if (!form.name.trim()) { toast.error('أدخل اسم المادة'); return; }
    try {
      if (editSubject) {
        const updated = await api(`/subjects/${editSubject.id}`, { method: 'PUT', body: JSON.stringify({ ...editSubject, ...form }) });
        setSubjects(s => s.map(x => x.id === updated.id ? updated : x));
        if (selected?.id === updated.id) setSelected(updated);
        toast.success('تم التحديث');
      } else {
        if (!await guardCreation({ key: 'study_subjects', currentCount: subjects.length })) return;
        const created = await api('/subjects', { method: 'POST', body: JSON.stringify(form) });
        setSubjects(s => [...s, created]);
        setSelected(created);
        toast.success('تمت الإضافة');
      }
      setForm({ name: '', description: '' });
      setEditSubject(null);
      setShowForm(false);
    } catch { toast.error('فشل الحفظ'); }
  }

  async function addSession() {
    if (!selected || !sessionForm.hours) return;
    const sessions = [...(selected.studySessions || []), { id: Date.now().toString(), ...sessionForm }];
    try {
      const updated = await api(`/subjects/${selected.id}`, { method: 'PUT', body: JSON.stringify({ ...selected, studySessions: sessions }) });
      setSelected(updated);
      setSubjects(s => s.map(x => x.id === updated.id ? updated : x));
      setShowSessionForm(false);
      setSessionForm({ hours: 1, date: new Date().toISOString().split('T')[0], notes: '' });
      toast.success('تم تسجيل جلسة الدراسة');
    } catch { toast.error('فشل الحفظ'); }
  }

  async function addLesson() {
    if (!selected || !lessonForm.title.trim()) return;
    const allLessons = subjects.flatMap(subject => subject.lessons || []);
    const todayCount = countCreatedOnDate(allLessons);
    if (!await guardCreation({ key: 'study_lessons', currentCount: todayCount })) return;
    const lessons = [...(selected.lessons || []), { id: crypto.randomUUID(), ...lessonForm, createdAt: new Date().toISOString() }];
    try {
      const updated = await api(`/subjects/${selected.id}`, { method: 'PUT', body: JSON.stringify({ ...selected, lessons }) });
      setSelected(updated);
      setSubjects(s => s.map(x => x.id === updated.id ? updated : x));
      setShowLessonForm(false);
      setLessonForm({ title: '', completed: false });
    } catch { toast.error('فشل الحفظ'); }
  }

  async function toggleLesson(lessonId: string) {
    if (!selected) return;
    const lessons = (selected.lessons || []).map((l: any) => l.id === lessonId ? { ...l, completed: !l.completed } : l);
    const updated = await api(`/subjects/${selected.id}`, { method: 'PUT', body: JSON.stringify({ ...selected, lessons }) });
    setSelected(updated);
    setSubjects(s => s.map(x => x.id === updated.id ? updated : x));
  }

  async function addExam() {
    if (!selected || !examForm.name.trim()) return;
    const exams = [...(selected.exams || []), { id: Date.now().toString(), ...examForm }];
    try {
      const updated = await api(`/subjects/${selected.id}`, { method: 'PUT', body: JSON.stringify({ ...selected, exams }) });
      setSelected(updated);
      setSubjects(s => s.map(x => x.id === updated.id ? updated : x));
      setShowExamForm(false);
      setExamForm({ name: '', grade: '', date: new Date().toISOString().split('T')[0] });
    } catch { toast.error('فشل الحفظ'); }
  }

  async function deleteSubject(id: string) {
    if (!confirm('حذف هذه المادة؟')) return;
    try {
      await api(`/subjects/${id}`, { method: 'DELETE' });
      const remaining = subjects.filter(s => s.id !== id);
      setSubjects(remaining);
      setSelected(remaining[0] || null);
    } catch { toast.error('فشل الحذف'); }
  }

  const getTotalHours = (sub: any) => (sub.studySessions || []).reduce((s: number, ss: any) => s + (ss.hours || 0), 0);
  const getCompletedLessons = (sub: any) => (sub.lessons || []).filter((l: any) => l.completed).length;
  const getAvgGrade = (sub: any) => {
    const exams = (sub.exams || []).filter((e: any) => e.grade);
    if (!exams.length) return '—';
    const avg = exams.reduce((s: number, e: any) => s + parseFloat(e.grade), 0) / exams.length;
    return isNaN(avg) ? '—' : avg.toFixed(1);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">الدراسة</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{subjects.length} مادة دراسية</p>
        </div>
        <button onClick={() => { setEditSubject(null); setForm({ name: '', description: '' }); setShowForm(s => !s); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90">
          <Plus size={16} /> مادة جديدة
        </button>
      </div>

      {showForm && (
        <FormModal open={showForm} title={editSubject ? 'تعديل المادة' : 'إضافة مادة جديدة'} onClose={() => { setShowForm(false); setEditSubject(null); }}>
        <div className="bg-card rounded-2xl border border-primary/30 p-5 space-y-3">
          <h3 className="font-semibold">{editSubject ? 'تعديل المادة' : 'مادة جديدة'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">اسم المادة</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">الوصف</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground">إلغاء</button>
            <button onClick={saveSubject} className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground">حفظ</button>
          </div>
        </div>
        </FormModal>
      )}

      {subjects.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <GraduationCap size={40} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">لا توجد مواد دراسية</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Subject list */}
          <div className="space-y-2">
            {subjects.map(sub => (
              <button
                key={sub.id}
                onClick={() => setSelected(sub)}
                className={`w-full text-right p-3 rounded-xl border transition-all ${selected?.id === sub.id ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/30'}`}
              >
                <p className="text-sm font-medium text-foreground">{sub.name}</p>
                <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{getTotalHours(sub)}س</span>
                  <span>·</span>
                  <span>{getCompletedLessons(sub)}/{(sub.lessons || []).length} درس</span>
                </div>
              </button>
            ))}
          </div>

          {/* Subject Detail */}
          {selected && (
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-foreground text-lg">{selected.name}</h3>
                    {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditSubject(selected); setForm({ name: selected.name, description: selected.description || '' }); setShowForm(true); }} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => deleteSubject(selected.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-foreground">{getTotalHours(selected)}</p>
                    <p className="text-xs text-muted-foreground">ساعة دراسة</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-foreground">{getCompletedLessons(selected)}/{(selected.lessons || []).length}</p>
                    <p className="text-xs text-muted-foreground">دروس مكتملة</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-foreground">{getAvgGrade(selected)}</p>
                    <p className="text-xs text-muted-foreground">متوسط الدرجات</p>
                  </div>
                </div>
              </div>

              {/* Sessions */}
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-foreground">جلسات الدراسة</h4>
                  <button onClick={() => setShowSessionForm(s => !s)} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={12} /> إضافة</button>
                </div>
                {showSessionForm && (
                  <FormModal open={showSessionForm} title={'إضافة جلسة دراسة'} onClose={() => setShowSessionForm(false)}>
                  <div className="bg-muted rounded-xl p-3 mb-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div><label className="text-xs text-muted-foreground mb-1 block">الساعات</label><input type="number" value={sessionForm.hours} onChange={e => setSessionForm(f => ({ ...f, hours: +e.target.value }))} min={0.5} step={0.5} className="w-full bg-card border border-border rounded-lg py-2 px-3 text-sm focus:outline-none" /></div>
                      <div><label className="text-xs text-muted-foreground mb-1 block">التاريخ</label><input type="date" value={sessionForm.date} onChange={e => setSessionForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-card border border-border rounded-lg py-2 px-3 text-sm focus:outline-none" /></div>
                      <div><label className="text-xs text-muted-foreground mb-1 block">ملاحظات</label><input value={sessionForm.notes} onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-card border border-border rounded-lg py-2 px-3 text-sm focus:outline-none" /></div>
                    </div>
                    <div className="flex gap-2 justify-end"><button onClick={() => setShowSessionForm(false)} className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground">إلغاء</button><button onClick={addSession} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground">حفظ</button></div>
                  </div>
                  </FormModal>
                )}
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {[...(selected.studySessions || [])].sort((a: any, b: any) => b.date?.localeCompare(a.date)).map((s: any) => (
                    <div key={s.id} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                      <span className="text-muted-foreground">{new Date(s.date + 'T12:00').toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}</span>
                      <span className="font-medium text-foreground">{s.hours} ساعة</span>
                      {s.notes && <span className="text-xs text-muted-foreground truncate max-w-24">{s.notes}</span>}
                    </div>
                  ))}
                  {!(selected.studySessions || []).length && <p className="text-xs text-muted-foreground text-center py-3">لا توجد جلسات</p>}
                </div>
              </div>

              {/* Lessons */}
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-foreground">الدروس</h4>
                  <button onClick={() => setShowLessonForm(s => !s)} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={12} /> إضافة</button>
                </div>
                {showLessonForm && (
                  <FormModal open={showLessonForm} title={'إضافة درس'} onClose={() => setShowLessonForm(false)}>
                  <div className="bg-muted rounded-xl p-3 mb-3 space-y-2">
                    <input value={lessonForm.title} onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))} placeholder="عنوان الدرس" className="w-full bg-card border border-border rounded-lg py-2 px-3 text-sm focus:outline-none" />
                    <div className="flex gap-2 justify-end"><button onClick={() => setShowLessonForm(false)} className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground">إلغاء</button><button onClick={addLesson} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground">إضافة</button></div>
                  </div>
                  </FormModal>
                )}
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(selected.lessons || []).map((l: any) => (
                    <div key={l.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                      <button onClick={() => toggleLesson(l.id)} className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${l.completed ? 'bg-primary border-primary text-white' : 'border-muted-foreground'}`}>
                        {l.completed && <span className="text-xs">✓</span>}
                      </button>
                      <span className={`text-sm flex-1 ${l.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{l.title}</span>
                    </div>
                  ))}
                  {!(selected.lessons || []).length && <p className="text-xs text-muted-foreground text-center py-3">لا توجد دروس</p>}
                </div>
              </div>

              {/* Exams */}
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-foreground">الاختبارات</h4>
                  <button onClick={() => setShowExamForm(s => !s)} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={12} /> إضافة</button>
                </div>
                {showExamForm && (
                  <FormModal open={showExamForm} title={'إضافة اختبار'} onClose={() => setShowExamForm(false)}>
                  <div className="bg-muted rounded-xl p-3 mb-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <input value={examForm.name} onChange={e => setExamForm(f => ({ ...f, name: e.target.value }))} placeholder="الاختبار" className="bg-card border border-border rounded-lg py-2 px-3 text-sm focus:outline-none" />
                      <input type="number" value={examForm.grade} onChange={e => setExamForm(f => ({ ...f, grade: e.target.value }))} placeholder="الدرجة" className="bg-card border border-border rounded-lg py-2 px-3 text-sm focus:outline-none" />
                      <input type="date" value={examForm.date} onChange={e => setExamForm(f => ({ ...f, date: e.target.value }))} className="bg-card border border-border rounded-lg py-2 px-3 text-sm focus:outline-none" />
                    </div>
                    <div className="flex gap-2 justify-end"><button onClick={() => setShowExamForm(false)} className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground">إلغاء</button><button onClick={addExam} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground">إضافة</button></div>
                  </div>
                  </FormModal>
                )}
                <div className="space-y-1.5">
                  {(selected.exams || []).map((e: any) => (
                    <div key={e.id} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                      <span className="text-foreground">{e.name}</span>
                      <div className="flex gap-3">
                        <span className={`font-bold ${parseFloat(e.grade) >= 60 ? 'text-primary' : 'text-destructive'}`}>{e.grade}</span>
                        <span className="text-muted-foreground">{new Date(e.date + 'T12:00').toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  ))}
                  {!(selected.exams || []).length && <p className="text-xs text-muted-foreground text-center py-3">لا توجد اختبارات</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
