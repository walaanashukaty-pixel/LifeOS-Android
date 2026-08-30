import { useState, useEffect } from 'react';
import { FormModal } from './ui/FormModal';
import { api } from '../../utils/api';
import { useMonetization } from '../monetization/MonetizationProvider';
import { toast } from 'sonner';
import { Plus, Trash2, Edit3, Handshake, Search, Loader2 } from 'lucide-react';

const AGREEMENT_TYPES = ['وعد', 'دين', 'مشروع مشترك', 'اتفاقية', 'مسؤولية', 'أخرى'];
const STATUSES = [
  { val: 'active', label: 'نشط', color: 'bg-blue-500/10 text-blue-500' },
  { val: 'completed', label: 'مكتمل', color: 'bg-green-500/10 text-green-500' },
  { val: 'overdue', label: 'متأخر', color: 'bg-red-500/10 text-red-500' },
];

export function AgreementsPage() {
  const { guardCreation } = useMonetization();
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({ personName: '', type: 'وعد', details: '', agreementDate: new Date().toISOString().split('T')[0], dueDate: '', status: 'active' });

  useEffect(() => { loadAgreements(); }, []);

  async function loadAgreements() {
    try {
      const data = await api('/agreements');
      setAgreements(Array.isArray(data) ? data : []);
    } catch { toast.error('فشل التحميل'); }
    finally { setLoading(false); }
  }

  async function saveAgreement() {
    if (!form.personName.trim() || !form.details.trim()) { toast.error('أدخل الاسم والتفاصيل'); return; }
    try {
      if (editItem) {
        const updated = await api(`/agreements/${editItem.id}`, { method: 'PUT', body: JSON.stringify(form) });
        setAgreements(a => a.map(x => x.id === updated.id ? updated : x));
        toast.success('تم التحديث');
      } else {
        const openCount = agreements.filter(item => item.status === 'active' || item.status === 'overdue').length;
        if ((form.status === 'active' || form.status === 'overdue') && !await guardCreation({ key: 'agreements', currentCount: openCount })) return;
        const created = await api('/agreements', { method: 'POST', body: JSON.stringify(form) });
        setAgreements(a => [created, ...a]);
        toast.success('تمت الإضافة');
      }
      resetForm();
    } catch { toast.error('فشل الحفظ'); }
  }

  async function updateStatus(id: string, status: string) {
    const item = agreements.find(a => a.id === id);
    if (!item) return;
    try {
      const updated = await api(`/agreements/${id}`, { method: 'PUT', body: JSON.stringify({ ...item, status }) });
      setAgreements(a => a.map(x => x.id === id ? updated : x));
    } catch { toast.error('فشل التحديث'); }
  }

  async function deleteAgreement(id: string) {
    try {
      await api(`/agreements/${id}`, { method: 'DELETE' });
      setAgreements(a => a.filter(x => x.id !== id));
    } catch { toast.error('فشل الحذف'); }
  }

  function resetForm() {
    setForm({ personName: '', type: 'وعد', details: '', agreementDate: new Date().toISOString().split('T')[0], dueDate: '', status: 'active' });
    setEditItem(null);
    setShowForm(false);
  }

  const filtered = agreements.filter(a => {
    const matchSearch = !search || a.personName?.toLowerCase().includes(search.toLowerCase()) || a.details?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusCounts = { active: 0, completed: 0, overdue: 0 };
  agreements.forEach(a => { if (statusCounts[a.status as keyof typeof statusCounts] !== undefined) statusCounts[a.status as keyof typeof statusCounts]++; });

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">الاتفاقيات والالتزامات</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{agreements.length} اتفاقية</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90">
          <Plus size={16} /> اتفاقية جديدة
        </button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-4">
        {STATUSES.map(s => (
          <button
            key={s.val}
            onClick={() => setFilterStatus(filterStatus === s.val ? '' : s.val)}
            className={`bg-card rounded-xl border p-4 text-center transition-all ${filterStatus === s.val ? 'border-primary' : 'border-border hover:border-border'}`}
          >
            <p className="text-xl font-bold text-foreground">{statusCounts[s.val as keyof typeof statusCounts]}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${s.color}`}>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو التفاصيل..." className="w-full bg-input-background border border-border rounded-xl py-2 pr-9 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <FormModal open={showForm} title={editItem ? 'تعديل الاتفاقية' : 'إضافة اتفاقية جديدة'} onClose={resetForm}>
        <div className="bg-card rounded-2xl border border-primary/30 p-5 space-y-4">
          <h3 className="font-semibold text-foreground">{editItem ? 'تعديل' : 'اتفاقية جديدة'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">اسم الشخص *</label>
              <input value={form.personName} onChange={e => setForm(f => ({ ...f, personName: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">نوع الاتفاقية</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {AGREEMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">الحالة</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {STATUSES.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1.5">التفاصيل *</label>
              <textarea value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} rows={2} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">تاريخ الاتفاقية</label>
              <input type="date" value={form.agreementDate} onChange={e => setForm(f => ({ ...f, agreementDate: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">الموعد النهائي</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground">إلغاء</button>
            <button onClick={saveAgreement} className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground">حفظ</button>
          </div>
        </div>
        </FormModal>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Handshake size={40} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">لا توجد اتفاقيات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(agreement => {
            const statusInfo = STATUSES.find(s => s.val === agreement.status) || STATUSES[0];
            const daysUntil = agreement.dueDate ? Math.ceil((new Date(agreement.dueDate).getTime() - Date.now()) / 86400000) : null;
            return (
              <div key={agreement.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-foreground">{agreement.personName}</span>
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{agreement.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{agreement.details}</p>
                    <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span>تاريخ الاتفاقية: {new Date(agreement.agreementDate + 'T12:00').toLocaleDateString('ar-SA')}</span>
                      {agreement.dueDate && (
                        <span className={daysUntil !== null && daysUntil < 0 ? 'text-destructive' : daysUntil !== null && daysUntil < 7 ? 'text-amber-500' : ''}>
                          الموعد: {new Date(agreement.dueDate + 'T12:00').toLocaleDateString('ar-SA')}
                          {daysUntil !== null && ` (${daysUntil < 0 ? `تأخر ${Math.abs(daysUntil)}` : daysUntil} يوم)`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 mr-3">
                    <select
                      value={agreement.status}
                      onChange={e => updateStatus(agreement.id, e.target.value)}
                      className="text-xs bg-muted border-0 rounded-lg py-1 px-2 focus:outline-none"
                    >
                      {STATUSES.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
                    </select>
                    <button onClick={() => { setEditItem(agreement); setForm({ personName: agreement.personName, type: agreement.type, details: agreement.details, agreementDate: agreement.agreementDate, dueDate: agreement.dueDate || '', status: agreement.status }); setShowForm(true); }} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground">
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => deleteAgreement(agreement.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
