import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { toast } from 'sonner';
import { Plus, Minus, RotateCcw, Trash2, Edit3, Search, BookOpen, Loader2 } from 'lucide-react';

const SURAHS = ['الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس','هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه','الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء','النمل','القصص','العنكبوت','الروم','لقمان','السجدة','الأحزاب','سبأ','فاطر','يس','الصافات','ص','الزمر','غافر','فصلت','الشورى','الزخرف','الدخان','الجاثية','الأحقاف','محمد','الفتح','الحجرات','ق','الذاريات','الطور','النجم','القمر','الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة','الصف','الجمعة','المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة','المعارج','نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات','النبأ','النازعات','عبس','التكوير','الانفطار','المطففين','الانشقاق','البروج','الطارق','الأعلى','الغاشية','الفجر','البلد','الشمس','الليل','الضحى','الشرح','التين','العلق','القدر','البينة','الزلزلة','العاديات','القارعة','التكاثر','العصر','الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون','النصر','المسد','الإخلاص','الفلق','الناس'];

type Tab = 'dhikr' | 'quran' | 'memorization' | 'lessons';

export function ReligiousPage() {
  const [tab, setTab] = useState<Tab>('dhikr');
  const [dhikrList, setDhikrList] = useState<any[]>([]);
  const [quranData, setQuranData] = useState<any>(null);
  const [memorization, setMemorization] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Forms
  const [showDhikrForm, setShowDhikrForm] = useState(false);
  const [dhikrForm, setDhikrForm] = useState({ name: '', targetCount: 33 });
  const [showQuranForm, setShowQuranForm] = useState(false);
  const [quranForm, setQuranForm] = useState({ surah: '', ayah: 1, pages: 1 });
  const [showMemForm, setShowMemForm] = useState(false);
  const [memForm, setMemForm] = useState({ juz: 1, surah: '', percentage: 0, lastReview: new Date().toISOString().split('T')[0] });
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: '', scholar: '', url: '', duration: '', notes: '' });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [d, q, m, l] = await Promise.all([
        api('/dhikr').catch(() => []),
        api('/quran').catch(() => null),
        api('/memorization').catch(() => []),
        api('/lessons').catch(() => []),
      ]);
      setDhikrList(Array.isArray(d) ? d : []);
      setQuranData(q);
      setMemorization(Array.isArray(m) ? m : []);
      setLessons(Array.isArray(l) ? l : []);
    } finally { setLoading(false); }
  }

  // Dhikr
  async function addDhikr() {
    if (!dhikrForm.name.trim()) { toast.error('أدخل اسم الذكر'); return; }
    try {
      const created = await api('/dhikr', { method: 'POST', body: JSON.stringify(dhikrForm) });
      setDhikrList(d => [created, ...d]);
      setDhikrForm({ name: '', targetCount: 33 });
      setShowDhikrForm(false);
      toast.success('تمت الإضافة');
    } catch { toast.error('فشل الإضافة'); }
  }

  async function dhikrAction(id: string, action: 'increment' | 'decrement' | 'reset') {
    try {
      const updated = await api(`/dhikr/${id}/${action}`, { method: 'POST' });
      setDhikrList(d => d.map(x => x.id === id ? updated : x));
    } catch { toast.error('فشل التحديث'); }
  }

  async function deleteDhikr(id: string) {
    try {
      await api(`/dhikr/${id}`, { method: 'DELETE' });
      setDhikrList(d => d.filter(x => x.id !== id));
    } catch { toast.error('فشل الحذف'); }
  }

  // Quran
  async function saveQuranSession() {
    try {
      const updated = await api('/quran/session', { method: 'POST', body: JSON.stringify(quranForm) });
      setQuranData(updated);
      setShowQuranForm(false);
      setQuranForm({ surah: '', ayah: 1, pages: 1 });
      toast.success('تم تسجيل تلاوتك');
    } catch { toast.error('فشل الحفظ'); }
  }

  // Memorization
  async function saveMem() {
    if (!memForm.surah) { toast.error('اختر السورة'); return; }
    try {
      const created = await api('/memorization', { method: 'POST', body: JSON.stringify(memForm) });
      setMemorization(m => [created, ...m]);
      setShowMemForm(false);
      setMemForm({ juz: 1, surah: '', percentage: 0, lastReview: new Date().toISOString().split('T')[0] });
      toast.success('تمت الإضافة');
    } catch { toast.error('فشل الحفظ'); }
  }

  async function updateMem(id: string, field: string, value: any) {
    try {
      const item = memorization.find(m => m.id === id);
      const updated = await api(`/memorization/${id}`, { method: 'PUT', body: JSON.stringify({ ...item, [field]: value }) });
      setMemorization(m => m.map(x => x.id === id ? updated : x));
    } catch { toast.error('فشل التحديث'); }
  }

  // Lessons
  async function saveLesson() {
    if (!lessonForm.title.trim()) { toast.error('أدخل عنوان الدرس'); return; }
    try {
      const created = await api('/lessons', { method: 'POST', body: JSON.stringify(lessonForm) });
      setLessons(l => [created, ...l]);
      setShowLessonForm(false);
      setLessonForm({ title: '', scholar: '', url: '', duration: '', notes: '' });
      toast.success('تمت الإضافة');
    } catch { toast.error('فشل الحفظ'); }
  }

  async function deleteLesson(id: string) {
    try {
      await api(`/lessons/${id}`, { method: 'DELETE' });
      setLessons(l => l.filter(x => x.id !== id));
    } catch { toast.error('فشل الحذف'); }
  }

  const filteredLessons = lessons.filter(l =>
    !search || l.title?.toLowerCase().includes(search.toLowerCase()) || l.scholar?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPagesRead = (quranData?.sessions || []).reduce((s: number, r: any) => s + (r.pages || 0), 0);
  const todayPages = (quranData?.sessions || []).filter((s: any) => s.date?.startsWith(new Date().toISOString().split('T')[0])).reduce((s: number, r: any) => s + (r.pages || 0), 0);

  const TABS = [
    { id: 'dhikr', label: 'الأذكار' },
    { id: 'quran', label: 'تتبع القرآن' },
    { id: 'memorization', label: 'الحفظ' },
    { id: 'lessons', label: 'الدروس' },
  ] as const;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">التقدم الديني</h2>
        <p className="text-sm text-muted-foreground mt-0.5">الأذكار، القرآن، الحفظ، الدروس</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-muted rounded-xl p-1 gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-max py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* DHIKR */}
      {tab === 'dhikr' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{dhikrList.length} ذكر</p>
            <button onClick={() => setShowDhikrForm(s => !s)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90">
              <Plus size={16} /> إضافة ذكر
            </button>
          </div>
          {showDhikrForm && (
            <div className="bg-card rounded-2xl border border-primary/30 p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">اسم الذكر</label>
                  <input value={dhikrForm.name} onChange={e => setDhikrForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: سبحان الله" className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">العدد المستهدف</label>
                  <input type="number" value={dhikrForm.targetCount} onChange={e => setDhikrForm(f => ({ ...f, targetCount: +e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowDhikrForm(false)} className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground">إلغاء</button>
                <button onClick={addDhikr} className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground">إضافة</button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dhikrList.map(dhikr => {
              const pct = dhikr.targetCount > 0 ? Math.min(100, Math.round((dhikr.count / dhikr.targetCount) * 100)) : 0;
              const completed = dhikr.count >= dhikr.targetCount;
              return (
                <div key={dhikr.id} className={`bg-card rounded-2xl border p-5 ${completed ? 'border-primary/30' : 'border-border'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{dhikr.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">الهدف: {dhikr.targetCount}</p>
                    </div>
                    <button onClick={() => deleteDhikr(dhikr.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="text-center my-4">
                    <span className={`text-5xl font-bold ${completed ? 'text-primary' : 'text-foreground'}`}>{dhikr.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
                    <div className={`h-full rounded-full transition-all ${completed ? 'bg-primary' : 'bg-primary/50'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => dhikrAction(dhikr.id, 'decrement')} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                      <Minus size={18} />
                    </button>
                    <button onClick={() => dhikrAction(dhikr.id, 'increment')} className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 active:scale-95">
                      +
                    </button>
                    <button onClick={() => dhikrAction(dhikr.id, 'reset')} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {dhikrList.length === 0 && (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
              <p className="text-muted-foreground">لا توجد أذكار. أضف أذكارك الآن!</p>
            </div>
          )}
        </div>
      )}

      {/* QURAN */}
      {tab === 'quran' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <p className="text-2xl font-bold text-amber-500">{todayPages}</p>
              <p className="text-xs text-muted-foreground mt-1">صفحات اليوم</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalPagesRead}</p>
              <p className="text-xs text-muted-foreground mt-1">إجمالي الصفحات</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 text-center col-span-2 md:col-span-1">
              <p className="text-sm font-medium text-foreground">{quranData?.lastPosition?.surah || '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">آخر موضع قراءة</p>
              {quranData?.lastPosition?.ayah && <p className="text-xs text-primary">آية {quranData.lastPosition.ayah}</p>}
            </div>
          </div>

          <button onClick={() => setShowQuranForm(s => !s)} className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-500/90">
            <Plus size={16} /> تسجيل جلسة تلاوة
          </button>

          {showQuranForm && (
            <div className="bg-card rounded-2xl border border-amber-500/30 p-5 space-y-3">
              <h3 className="font-semibold text-foreground">جلسة تلاوة جديدة</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">السورة</label>
                  <select value={quranForm.surah} onChange={e => setQuranForm(f => ({ ...f, surah: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">اختر...</option>
                    {SURAHS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">رقم الآية</label>
                  <input type="number" value={quranForm.ayah} onChange={e => setQuranForm(f => ({ ...f, ayah: +e.target.value }))} min={1} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">عدد الصفحات</label>
                  <input type="number" value={quranForm.pages} onChange={e => setQuranForm(f => ({ ...f, pages: +e.target.value }))} min={1} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowQuranForm(false)} className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground">إلغاء</button>
                <button onClick={saveQuranSession} className="px-4 py-2 rounded-xl text-sm bg-amber-500 text-white">حفظ</button>
              </div>
            </div>
          )}

          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-3">سجل التلاوة</h3>
            {(quranData?.sessions || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد جلسات مسجلة</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {[...(quranData?.sessions || [])].reverse().map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <span className="text-sm font-medium text-foreground">{s.surah || 'غير محدد'}</span>
                      {s.ayah && <span className="text-xs text-muted-foreground mr-2">آية {s.ayah}</span>}
                    </div>
                    <div className="text-left">
                      <span className="text-sm text-amber-500 font-medium">{s.pages} صفحة</span>
                      <p className="text-xs text-muted-foreground">{new Date(s.date).toLocaleDateString('ar-SA')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MEMORIZATION */}
      {tab === 'memorization' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{memorization.length} سورة</p>
            <button onClick={() => setShowMemForm(s => !s)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90">
              <Plus size={16} /> إضافة
            </button>
          </div>

          {showMemForm && (
            <div className="bg-card rounded-2xl border border-primary/30 p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">السورة</label>
                  <select value={memForm.surah} onChange={e => setMemForm(f => ({ ...f, surah: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">اختر...</option>
                    {SURAHS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">الجزء</label>
                  <input type="number" value={memForm.juz} onChange={e => setMemForm(f => ({ ...f, juz: +e.target.value }))} min={1} max={30} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">نسبة الحفظ %</label>
                  <input type="number" value={memForm.percentage} onChange={e => setMemForm(f => ({ ...f, percentage: +e.target.value }))} min={0} max={100} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">آخر مراجعة</label>
                  <input type="date" value={memForm.lastReview} onChange={e => setMemForm(f => ({ ...f, lastReview: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowMemForm(false)} className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground">إلغاء</button>
                <button onClick={saveMem} className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground">حفظ</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {memorization.map(m => (
              <div key={m.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium text-foreground">{m.surah}</span>
                    <span className="text-xs text-muted-foreground mr-2">الجزء {m.juz}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={m.percentage}
                      onChange={e => updateMem(m.id, 'percentage', +e.target.value)}
                      min={0} max={100}
                      className="w-16 bg-input-background border border-border rounded-lg py-1 px-2 text-sm text-center"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                    <button onClick={() => { api(`/memorization/${m.id}`, { method: 'DELETE' }); setMemorization(x => x.filter(i => i.id !== m.id)); }} className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${m.percentage}%` }} />
                </div>
                {m.lastReview && <p className="text-xs text-muted-foreground mt-1.5">آخر مراجعة: {new Date(m.lastReview).toLocaleDateString('ar-SA')}</p>}
              </div>
            ))}
            {memorization.length === 0 && (
              <div className="text-center py-12 bg-card rounded-2xl border border-border">
                <BookOpen size={32} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">ابدأ بتتبع حفظك</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LESSONS */}
      {tab === 'lessons' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في الدروس..." className="w-full bg-input-background border border-border rounded-xl py-2 pr-9 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <button onClick={() => setShowLessonForm(s => !s)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90">
              <Plus size={16} /> درس جديد
            </button>
          </div>

          {showLessonForm && (
            <div className="bg-card rounded-2xl border border-primary/30 p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">عنوان الدرس</label>
                  <input value={lessonForm.title} onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))} placeholder="عنوان الدرس" className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">الشيخ / المحاضر</label>
                  <input value={lessonForm.scholar} onChange={e => setLessonForm(f => ({ ...f, scholar: e.target.value }))} placeholder="اسم الشيخ" className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">رابط الدرس</label>
                  <input value={lessonForm.url} onChange={e => setLessonForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." dir="ltr" className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">المدة</label>
                  <input value={lessonForm.duration} onChange={e => setLessonForm(f => ({ ...f, duration: e.target.value }))} placeholder="مثال: 45 دقيقة" className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">ملاحظات</label>
                  <textarea value={lessonForm.notes} onChange={e => setLessonForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowLessonForm(false)} className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground">إلغاء</button>
                <button onClick={saveLesson} className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground">حفظ</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {filteredLessons.map(lesson => (
              <div key={lesson.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{lesson.title}</h3>
                    {lesson.scholar && <p className="text-sm text-primary mt-0.5">{lesson.scholar}</p>}
                    <div className="flex gap-3 mt-1 flex-wrap">
                      {lesson.duration && <span className="text-xs text-muted-foreground">{lesson.duration}</span>}
                      {lesson.url && <a href={lesson.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">رابط الدرس</a>}
                    </div>
                    {lesson.notes && <p className="text-xs text-muted-foreground mt-2 bg-muted rounded-lg px-3 py-2">{lesson.notes}</p>}
                  </div>
                  <button onClick={() => deleteLesson(lesson.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive mr-2">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            {filteredLessons.length === 0 && (
              <div className="text-center py-12 bg-card rounded-2xl border border-border">
                <p className="text-muted-foreground">لا توجد دروس مسجلة</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
