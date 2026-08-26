import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { toast } from 'sonner';
import { Plus, Trash2, Search, Languages, Loader2 } from 'lucide-react';

type LangTab = 'vocab' | 'grammar' | 'conversation';
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const LEVEL_COLORS: Record<string, string> = { A1: 'bg-gray-400', A2: 'bg-green-400', B1: 'bg-blue-400', B2: 'bg-purple-400', C1: 'bg-orange-400', C2: 'bg-red-400' };

export function LanguagesPage() {
  const [languages, setLanguages] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [tab, setTab] = useState<LangTab>('vocab');
  const [loading, setLoading] = useState(true);
  const [showLangForm, setShowLangForm] = useState(false);
  const [langForm, setLangForm] = useState({ name: '', flag: '🌍', level: 'A1' });
  const [showItemForm, setShowItemForm] = useState(false);
  const [search, setSearch] = useState('');
  const [itemForm, setItemForm] = useState({ word: '', meaning: '', example: '', rule: '', title: '', explanation: '', phrase: '', notes: '' });

  useEffect(() => { loadLanguages(); }, []);

  async function loadLanguages() {
    try {
      const data = await api('/languages');
      const langs = Array.isArray(data) ? data : [];
      setLanguages(langs);
      if (langs.length > 0 && !selected) setSelected(langs[0]);
    } catch { toast.error('فشل التحميل'); }
    finally { setLoading(false); }
  }

  async function saveLang() {
    if (!langForm.name.trim()) { toast.error('أدخل اسم اللغة'); return; }
    try {
      const created = await api('/languages', { method: 'POST', body: JSON.stringify(langForm) });
      setLanguages(l => [...l, created]);
      setSelected(created);
      setShowLangForm(false);
      setLangForm({ name: '', flag: '🌍', level: 'A1' });
      toast.success('تمت الإضافة');
    } catch { toast.error('فشل الإضافة'); }
  }

  async function saveItem() {
    if (!selected) return;
    const items = selected[tab] || [];
    let newItem: any;
    if (tab === 'vocab') {
      if (!itemForm.word.trim()) { toast.error('أدخل الكلمة'); return; }
      newItem = { id: Date.now().toString(), word: itemForm.word, meaning: itemForm.meaning, example: itemForm.example };
    } else if (tab === 'grammar') {
      if (!itemForm.title.trim()) { toast.error('أدخل عنوان القاعدة'); return; }
      newItem = { id: Date.now().toString(), title: itemForm.title, explanation: itemForm.explanation, notes: itemForm.notes };
    } else {
      if (!itemForm.phrase.trim()) { toast.error('أدخل العبارة'); return; }
      newItem = { id: Date.now().toString(), phrase: itemForm.phrase, notes: itemForm.notes };
    }
    try {
      const updated = await api(`/languages/${selected.id}`, { method: 'PUT', body: JSON.stringify({ ...selected, [tab]: [...items, newItem] }) });
      setSelected(updated);
      setLanguages(l => l.map(x => x.id === updated.id ? updated : x));
      setShowItemForm(false);
      setItemForm({ word: '', meaning: '', example: '', rule: '', title: '', explanation: '', phrase: '', notes: '' });
      toast.success('تمت الإضافة');
    } catch { toast.error('فشل الإضافة'); }
  }

  async function deleteItem(itemId: string) {
    if (!selected) return;
    const items = (selected[tab] || []).filter((i: any) => i.id !== itemId);
    try {
      const updated = await api(`/languages/${selected.id}`, { method: 'PUT', body: JSON.stringify({ ...selected, [tab]: items }) });
      setSelected(updated);
      setLanguages(l => l.map(x => x.id === updated.id ? updated : x));
    } catch { toast.error('فشل الحذف'); }
  }

  async function updateLevel(langId: string, level: string) {
    const lang = languages.find(l => l.id === langId);
    if (!lang) return;
    try {
      const updated = await api(`/languages/${langId}`, { method: 'PUT', body: JSON.stringify({ ...lang, level }) });
      setLanguages(l => l.map(x => x.id === langId ? updated : x));
      if (selected?.id === langId) setSelected(updated);
    } catch {}
  }

  async function deleteLang(id: string) {
    if (!confirm('هل تريد حذف هذه اللغة وكل بياناتها؟')) return;
    try {
      await api(`/languages/${id}`, { method: 'DELETE' });
      const remaining = languages.filter(l => l.id !== id);
      setLanguages(remaining);
      setSelected(remaining[0] || null);
    } catch { toast.error('فشل الحذف'); }
  }

  const getItems = () => {
    const items = selected?.[tab] || [];
    if (!search) return items;
    return items.filter((i: any) => {
      const text = Object.values(i).join(' ').toLowerCase();
      return text.includes(search.toLowerCase());
    });
  };

  const getLevelPct = (level: string) => ((LEVELS.indexOf(level) + 1) / LEVELS.length) * 100;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">تعلم اللغات</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{languages.length} لغة قيد التعلم</p>
        </div>
        <button onClick={() => setShowLangForm(s => !s)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90">
          <Plus size={16} /> لغة جديدة
        </button>
      </div>

      {/* New Language Form */}
      {showLangForm && (
        <div className="bg-card rounded-2xl border border-primary/30 p-5 space-y-3">
          <h3 className="font-semibold text-foreground">إضافة لغة جديدة</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">اسم اللغة</label>
              <input value={langForm.name} onChange={e => setLangForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: الإنجليزية" className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">الرمز</label>
              <input value={langForm.flag} onChange={e => setLangForm(f => ({ ...f, flag: e.target.value }))} placeholder="🌍" className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">المستوى الحالي</label>
              <select value={langForm.level} onChange={e => setLangForm(f => ({ ...f, level: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowLangForm(false)} className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground">إلغاء</button>
            <button onClick={saveLang} className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground">إضافة</button>
          </div>
        </div>
      )}

      {languages.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Languages size={40} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">لا توجد لغات</p>
          <p className="text-sm text-muted-foreground">ابدأ بإضافة أول لغة تتعلمها</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Language List */}
          <div className="space-y-2">
            {languages.map(lang => (
              <button
                key={lang.id}
                onClick={() => setSelected(lang)}
                className={`w-full text-right p-3 rounded-xl border transition-all ${
                  selected?.id === lang.id ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{lang.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{lang.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded text-white ${LEVEL_COLORS[lang.level] || 'bg-gray-400'}`}>{lang.level}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Language Details */}
          {selected && (
            <div className="lg:col-span-3 space-y-4">
              {/* Header */}
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selected.flag}</span>
                    <div>
                      <h3 className="font-bold text-foreground">{selected.name}</h3>
                      <p className="text-xs text-muted-foreground">{(selected.vocab || []).length} كلمة · {(selected.grammar || []).length} قاعدة</p>
                    </div>
                  </div>
                  <button onClick={() => deleteLang(selected.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive">
                    <Trash2 size={14} />
                  </button>
                </div>
                {/* Level selector */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">المستوى الحالي</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {LEVELS.map(l => (
                      <button
                        key={l}
                        onClick={() => updateLevel(selected.id, l)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          selected.level === l ? `${LEVEL_COLORS[l]} text-white` : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${getLevelPct(selected.level)}%` }} />
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex bg-muted rounded-xl p-1 gap-1">
                {[{ id: 'vocab', label: 'المفردات' }, { id: 'grammar', label: 'القواعد' }, { id: 'conversation', label: 'المحادثة' }].map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setTab(t.id as LangTab); setShowItemForm(false); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search size={13} className="absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="w-full bg-input-background border border-border rounded-xl py-2 pr-9 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <button onClick={() => setShowItemForm(s => !s)} className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-medium hover:bg-primary/90">
                  <Plus size={14} /> إضافة
                </button>
              </div>

              {/* Add Item Form */}
              {showItemForm && (
                <div className="bg-card rounded-xl border border-primary/30 p-4 space-y-3">
                  {tab === 'vocab' && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">الكلمة</label>
                        <input value={itemForm.word} onChange={e => setItemForm(f => ({ ...f, word: e.target.value }))} className="w-full bg-input-background border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">المعنى</label>
                        <input value={itemForm.meaning} onChange={e => setItemForm(f => ({ ...f, meaning: e.target.value }))} className="w-full bg-input-background border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">مثال</label>
                        <input value={itemForm.example} onChange={e => setItemForm(f => ({ ...f, example: e.target.value }))} className="w-full bg-input-background border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                    </div>
                  )}
                  {tab === 'grammar' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">العنوان</label>
                        <input value={itemForm.title} onChange={e => setItemForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-input-background border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">الشرح</label>
                        <input value={itemForm.explanation} onChange={e => setItemForm(f => ({ ...f, explanation: e.target.value }))} className="w-full bg-input-background border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium mb-1">ملاحظات</label>
                        <input value={itemForm.notes} onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-input-background border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                    </div>
                  )}
                  {tab === 'conversation' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">العبارة</label>
                        <input value={itemForm.phrase} onChange={e => setItemForm(f => ({ ...f, phrase: e.target.value }))} className="w-full bg-input-background border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">ملاحظات</label>
                        <input value={itemForm.notes} onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-input-background border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowItemForm(false)} className="px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground">إلغاء</button>
                    <button onClick={saveItem} className="px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground">إضافة</button>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {getItems().map((item: any) => (
                  <div key={item.id} className="bg-card rounded-xl border border-border p-3 flex items-start gap-2">
                    <div className="flex-1 text-sm">
                      {tab === 'vocab' && (
                        <div>
                          <span className="font-medium text-foreground">{item.word}</span>
                          {item.meaning && <span className="text-muted-foreground"> — {item.meaning}</span>}
                          {item.example && <p className="text-xs text-muted-foreground mt-0.5 italic">{item.example}</p>}
                        </div>
                      )}
                      {tab === 'grammar' && (
                        <div>
                          <span className="font-medium text-foreground">{item.title}</span>
                          {item.explanation && <p className="text-xs text-muted-foreground mt-0.5">{item.explanation}</p>}
                          {item.notes && <p className="text-xs text-muted-foreground/70 mt-0.5">{item.notes}</p>}
                        </div>
                      )}
                      {tab === 'conversation' && (
                        <div>
                          <span className="font-medium text-foreground">{item.phrase}</span>
                          {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                        </div>
                      )}
                    </div>
                    <button onClick={() => deleteItem(item.id)} className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive flex-shrink-0">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {getItems().length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">لا توجد عناصر. ابدأ بالإضافة!</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

}
