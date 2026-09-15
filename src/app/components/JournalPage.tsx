import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { LoadingPage, PageHero, SummaryCard, SectionHeading } from './ui/LifeOSPrimitives';
import { AnimatedEmptyState } from './ui/AnimatedEmptyState';
import { useConfirmDialog } from './ui/ConfirmDialog';
import { toast } from 'sonner';
import { ChevronRight, ChevronLeft, Save, NotebookPen, Loader2, Trash2 } from 'lucide-react';
import { localDateKey, parseLocalDateKey } from '../../utils/date';

const PROMPTS = [
  'ماذا أنجزت اليوم؟',
  'ماذا تعلمت اليوم؟',
  'ما الذي أزعجني اليوم؟',
  'ما الذي سأفعله غداً؟',
];

export function JournalPage() {
  const confirmAction = useConfirmDialog();
  const [selectedDate, setSelectedDate] = useState(localDateKey());
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

  async function deleteEntry() {
    if (!current || !(await confirmAction({ title: 'حذف مذكرة اليوم', description: 'سيتم حذف إجابات وملاحظات هذا اليوم نهائيًا.' }))) return;
    try {
      await api(`/journal/${selectedDate}`, { method: 'DELETE' });
      setEntries(items => items.filter(item => item.date !== selectedDate));
      setCurrent(null);
      setForm({ prompt1: '', prompt2: '', prompt3: '', prompt4: '', freeText: '' });
      toast.success('تم حذف المذكرة');
    } catch {
      toast.error('فشل حذف المذكرة');
    }
  }

  function changeDate(delta: number) {
    const d = parseLocalDateKey(selectedDate);
    if (!d) return;
    d.setDate(d.getDate() + delta);
    if (d <= new Date()) setSelectedDate(localDateKey(d));
  }

  const hasEntry = (date: string) => entries.some(e => e.date === date);
  const formattedDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const isToday = selectedDate === localDateKey();
  const answeredNow = Object.values(form).filter(value => String(value || '').trim()).length;
  const journalDays = new Set(entries.map(entry => entry.date)).size;
  const journalStreak = (() => {
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0);
    while (true) {
      const key = localDateKey(cursor);
      if (!entries.some(entry => entry.date === key)) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  })();

  if (loading) return <LoadingPage label="جارٍ فتح المذكرة اليومية" />;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <PageHero eyebrow="DAILY REFLECTION" title="المذكرة اليومية" description="مساحة هادئة لتلخيص يومك، تثبيت ما تعلمته، وإغلاق اليوم بوضوح." icon={<NotebookPen size={20} />} meta={<div className="lifeos-v3-hero-meta"><span className="lifeos-chip">{journalDays} يوم مكتوب</span><span className="lifeos-chip">سلسلة {journalStreak} يوم</span><span className="lifeos-chip">{answeredNow}/5 أقسام اليوم</span></div>} />

      <div className="lifeos-v3-summary-grid">
        <SummaryCard value={journalDays} label="أيام موثقة" />
        <SummaryCard value={journalStreak} label="السلسلة الحالية" />
        <SummaryCard value={`${answeredNow}/5`} label="اكتمال اليوم" />
        <SummaryCard value={current ? 'محفوظة' : 'مسودة'} label="حالة اليوم" />
      </div>

      {/* Date Nav */}
      <div className="lifeos-toolbar flex items-center justify-between p-3">
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
      <div className="lifeos-panel p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <NotebookPen size={16} className="text-primary" />
            {current ? 'تعديل المذكرة' : 'مذكرة جديدة'}
          </h3>
          {current && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">آخر تحديث: {new Date(current.updatedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
              <button onClick={deleteEntry} className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="حذف المذكرة"><Trash2 size={14} /></button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {PROMPTS.map((prompt, i) => {
            const key = `prompt${i + 1}` as keyof typeof form;
            return (
              <div key={i} className="lifeos-v3-journal-prompt">
                <label>
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

          <div className="lifeos-v3-journal-prompt">
            <label>ملاحظات حرة</label>
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
      <div className="lifeos-panel p-5">
        <SectionHeading title="الأرشيف" description="ارجع لأي يوم واكمل أو راجع ما كتبته" />
        {entries.length === 0 ? (
          <AnimatedEmptyState icon={NotebookPen} title="أرشيفك يبدأ من اليوم" description="بعد حفظ أول مذكرة ستظهر أيامك هنا بشكل مرتب ويمكنك الرجوع إليها في أي وقت." />
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
