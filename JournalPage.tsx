import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { toast } from 'sonner';
import { ChevronRight, ChevronLeft, Save, NotebookPen, Loader2 } from 'lucide-react';

const PROMPTS = [
  'ماذا أنجزت اليوم؟',
  'ماذا تعلمت اليوم؟',
  'ما الذي أزعجني اليوم؟',
  'ما الذي سأفعله غداً؟',
];

export function JournalPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ prompt1: '', prompt2: '', prompt3: '', prompt4: '', freeText: '' });

  useEffect(() => { loadEntries(); }, []);
  useEffect(() => { loadEntry(selectedDate); }, [selectedDate]);

  async function loadEntries() {
    try {
      const data = await api('/journal');
      setEntries(Array.isArray(data) ? data : []);
    } catch {}
    finally { setLoading(false); }
  }

  async function loadEntry(date: string) {
    try {
      const entry = await api(`/journal/${date}`);
      if (entry) {
        setCurrent(entry);
        setForm({ prompt1: entry.prompt1 || '', prompt2: entry.prompt2 || '', prompt3: entry.prompt3 || '', prompt4: entry.prompt4 || '', freeText: entry.freeText || '' });
      } else {
        setCurrent(null);
        setForm({ prompt1: '', prompt2: '', prompt3: '', prompt4: '', freeText: '' });
      }
    } catch {
      setCurrent(null);
      setForm({ prompt1: '', prompt2: '', prompt3: '', prompt4: '', freeText: '' });
    }
  }

  async function saveEntry() {
    setSaving(true);
    try {
      const saved = await api('/journal', { method: 'POST', body: JSON.stringify({ date: selectedDate, ...form }) });
      setCurrent(saved);
      setEntries(e => {
        const filtered = e.filter(x => x.date !== selectedDate);
        return [...filtered, saved].sort((a, b) => b.date.localeCompare(a.date));
      });
      toast.success('تم حفظ المذكرة');
    } catch { toast.error('فشل الحفظ'); }
    finally { setSaving(false); }
  }

  function changeDate(delta: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    if (d <= new Date()) setSelectedDate(d.toISOString().split('T')[0]);
  }

  const hasEntry = (date: string) => entries.some(e => e.date === date);
  const formattedDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">المذكرة اليومية</h2>
        <p className="text-sm text-muted-foreground mt-0.5">سجّل أفكارك وتأملاتك اليومية</p>
      </div>

      {/* Date Nav */}
      <div className="flex items-center justify-between bg-card rounded-xl border border-border p-3">
        <button onClick={() => changeDate(-1)} className="p-2 hover:bg-muted rounded-lg transition-colors">
          <ChevronRight size={18} />
        </button>
        <div className="text-center">
          <p className="font-semibold text-foreground text-sm">{formattedDate}</p>
          {isToday && <span className="text-xs text-primary">اليوم</span>}
        </div>
        <button onClick={() => changeDate(1)} disabled={isToday} className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-30">
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Entry Form */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <NotebookPen size={16} className="text-primary" />
            {current ? 'تعديل المذكرة' : 'مذكرة جديدة'}
          </h3>
          {current && <span className="text-xs text-muted-foreground">آخر تحديث: {new Date(current.updatedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>

        <div className="space-y-4">
          {PROMPTS.map((prompt, i) => {
            const key = `prompt${i + 1}` as keyof typeof form;
            return (
              <div key={i}>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <span className="text-primary ml-1">{i + 1}.</span> {prompt}
                </label>
                <textarea
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  rows={3}
                  placeholder={`اكتب إجابتك هنا...`}
                  className="w-full bg-input-background border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-all"
                />
              </div>
            );
          })}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">ملاحظات حرة</label>
            <textarea
              value={form.freeText}
              onChange={e => setForm(f => ({ ...f, freeText: e.target.value }))}
              rows={4}
              placeholder="أي شيء آخر تريد كتابته..."
              className="w-full bg-input-background border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-all"
            />
          </div>
        </div>

        <button
          onClick={saveEntry}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          حفظ المذكرة
        </button>
      </div>

      {/* Calendar / Past entries */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">الأرشيف</h3>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">لا توجد مذكرات سابقة</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {[...entries].sort((a, b) => b.date.localeCompare(a.date)).map(entry => (
              <button
                key={entry.date}
                onClick={() => setSelectedDate(entry.date)}
                className={`w-full text-right flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted transition-colors ${selectedDate === entry.date ? 'bg-primary/10 text-primary' : ''}`}
              >
                <span className="text-sm font-medium">
                  {new Date(entry.date + 'T12:00:00').toLocaleDateString('ar-SA', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
                <span className="text-xs text-muted-foreground">
                  {[entry.prompt1, entry.prompt2, entry.prompt3, entry.prompt4, entry.freeText].filter(Boolean).length} إجابة
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
