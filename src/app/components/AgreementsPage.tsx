import { useEffect, useMemo, useState } from 'react';
import { FormModal } from './ui/FormModal';
import { useConfirmDialog } from './ui/ConfirmDialog';
import { AnimatedEmptyState } from './ui/AnimatedEmptyState';
import { LoadingPage, PageHero, SummaryCard } from './ui/LifeOSPrimitives';
import { api } from '../../utils/api';
import { useMonetization } from '../monetization/MonetizationProvider';
import { RewardCapacityBar } from './RewardCapacityBar';
import { toast } from 'sonner';
import { CalendarClock, Edit3, Handshake, Plus, Search, Trash2 } from 'lucide-react';
import { dateOrderValidation, firstValidation, textValidation } from '../../utils/validation';
import { localDateKey, parseLocalDateKey } from '../../utils/date';

const AGREEMENT_TYPES = ['وعد', 'دين', 'مشروع مشترك', 'اتفاقية', 'مسؤولية', 'أخرى'];
const STATUSES = [
  { val: 'active', label: 'نشط', color: 'bg-blue-500/10 text-blue-500' },
  { val: 'completed', label: 'مكتمل', color: 'bg-green-500/10 text-green-500' },
  { val: 'overdue', label: 'متأخر', color: 'bg-red-500/10 text-red-500' },
];

export function AgreementsPage() {
  const confirmAction = useConfirmDialog();
  const { guardCreation } = useMonetization();
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({ personName: '', type: 'وعد', details: '', agreementDate: localDateKey(), dueDate: '', status: 'active' });

  useEffect(() => { loadAgreements(); }, []);
  async function loadAgreements() { try { const data = await api('/agreements'); setAgreements(Array.isArray(data) ? data : []); } catch { toast.error('فشل التحميل'); } finally { setLoading(false); } }

  async function saveAgreement() {
    const validationError = firstValidation(
      textValidation(form.personName, 'اسم الشخص', 120),
      textValidation(form.details, 'تفاصيل الاتفاقية', 3000),
      dateOrderValidation(form.agreementDate, form.dueDate, 'الموعد النهائي يجب أن يكون بعد تاريخ الاتفاقية'),
    );
    if (validationError) { toast.error(validationError); return; }
    try {
      if (editItem) {
        const updated = await api(`/agreements/${editItem.id}`, { method: 'PUT', body: JSON.stringify(form) });
        setAgreements(a => a.map(x => x.id === updated.id ? updated : x)); toast.success('تم التحديث');
      } else {
        if (!await guardCreation({ key: 'agreements', currentCount: agreements.length })) return;
        const created = await api('/agreements', { method: 'POST', body: JSON.stringify(form) });
        setAgreements(a => [created, ...a]); toast.success('تمت الإضافة');
      }
      resetForm();
    } catch { toast.error('فشل الحفظ'); }
  }

  async function updateStatus(id: string, status: string) {
    const item = agreements.find(a => a.id === id); if (!item) return;
    try { const updated = await api(`/agreements/${id}`, { method: 'PUT', body: JSON.stringify({ ...item, status }) }); setAgreements(a => a.map(x => x.id === id ? updated : x)); }
    catch { toast.error('فشل التحديث'); }
  }

  async function deleteAgreement(id: string) { if (!(await confirmAction({ title: 'حذف الاتفاقية', description: 'سيتم حذف هذه الاتفاقية أو الالتزام من السجل.' }))) return; try { await api(`/agreements/${id}`, { method: 'DELETE' }); setAgreements(a => a.filter(x => x.id !== id)); } catch { toast.error('فشل الحذف'); } }
  function resetForm() { setForm({ personName: '', type: 'وعد', details: '', agreementDate: localDateKey(), dueDate: '', status: 'active' }); setEditItem(null); setShowForm(false); }

  const stats = useMemo(() => {
    const statusCounts = { active: 0, completed: 0, overdue: 0 };
    const today = parseLocalDateKey(localDateKey());
    let dueSoon = 0;
    agreements.forEach(a => {
      if (statusCounts[a.status as keyof typeof statusCounts] !== undefined) statusCounts[a.status as keyof typeof statusCounts]++;
      const due = a.dueDate ? parseLocalDateKey(a.dueDate) : null;
      if (a.status === 'active' && due && today) { const days = Math.ceil((due.getTime() - today.getTime()) / 86400000); if (days >= 0 && days <= 7) dueSoon++; }
    });
    return { ...statusCounts, dueSoon };
  }, [agreements]);

  const filtered = agreements.filter(a => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || a.personName?.toLowerCase().includes(q) || a.details?.toLowerCase().includes(q);
    return matchSearch && (!filterStatus || a.status === filterStatus);
  });

  if (loading) return <LoadingPage label="نرتب الالتزامات والاتفاقيات" />;

  return (
    <div className="lifeos-page-shell max-w-4xl space-y-5">
      <PageHero eyebrow="COMMITMENT LEDGER" title="الاتفاقيات والالتزامات" description="احتفظ بالوعود والديون والمسؤوليات المشتركة في مكان واضح مع مواعيدها وحالتها." icon={<Handshake size={20} />} actions={<button onClick={() => { resetForm(); setShowForm(true); }} className="lifeos-primary-action"><Plus size={16} /> اتفاقية جديدة</button>} meta={<div className="lifeos-v3-hero-meta"><span className="lifeos-chip">{agreements.length} إجمالي</span><span className="lifeos-chip">{stats.active} نشطة</span><span className="lifeos-chip">{stats.dueSoon} تستحق قريبًا</span></div>} />

      <div className="lifeos-v3-summary-grid">
        <SummaryCard value={stats.active} label="التزامات نشطة" helper="ما زالت تحتاج متابعة" />
        <SummaryCard value={stats.completed} label="تم الوفاء بها" helper="اتفاقيات مكتملة" />
        <SummaryCard value={stats.overdue} label="متأخرة" helper="راجعها أولًا" />
        <SummaryCard value={stats.dueSoon} label="خلال 7 أيام" helper="مواعيد قريبة" />
      </div>

      <div className="lifeos-toolbar space-y-2">
        <div className="relative"><Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><label htmlFor="agreement-search" className="sr-only">البحث في الاتفاقيات</label><input id="agreement-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالاسم أو التفاصيل…" className="lifeos-control w-full py-2.5 pr-9 pl-4 text-sm" /></div>
        <div className="lifeos-segmented" aria-label="تصفية حالة الاتفاقيات">
          {[{ val: '', label: 'الكل' }, ...STATUSES].map(item => <button key={item.val || 'all'} type="button" data-active={filterStatus === item.val} aria-pressed={filterStatus === item.val} onClick={() => setFilterStatus(item.val)} className="lifeos-segmented-item flex-1"><span className="relative z-10">{item.label}</span>{filterStatus === item.val && <span className="lifeos-segmented-indicator" />}</button>)}
        </div>
      </div>

      <RewardCapacityBar rewardKey="agreements" currentCount={agreements.length} />

      {showForm && <FormModal open={showForm} title={editItem ? 'تعديل الاتفاقية' : 'إضافة اتفاقية جديدة'} onClose={resetForm}>
        <div className="space-y-4 p-1">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="اسم الشخص *"><input value={form.personName} onChange={e => setForm(f => ({ ...f, personName: e.target.value }))} className="lifeos-control w-full px-3 text-sm" /></Field>
            <Field label="نوع الاتفاقية"><select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="lifeos-control w-full px-3 text-sm">{AGREEMENT_TYPES.map(t => <option key={t}>{t}</option>)}</select></Field>
            <Field label="الحالة"><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="lifeos-control w-full px-3 text-sm">{STATUSES.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}</select></Field>
            <div className="md:col-span-3"><Field label="التفاصيل *"><textarea value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} rows={3} className="lifeos-control h-auto w-full resize-none px-3 py-2.5 text-sm" /></Field></div>
            <Field label="تاريخ الاتفاقية"><input type="date" value={form.agreementDate} onChange={e => setForm(f => ({ ...f, agreementDate: e.target.value }))} className="lifeos-control w-full px-3 text-sm" /></Field>
            <Field label="الموعد النهائي"><input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="lifeos-control w-full px-3 text-sm" /></Field>
          </div>
          <div className="flex justify-end gap-2"><button onClick={resetForm} className="lifeos-secondary-action">إلغاء</button><button onClick={saveAgreement} className="lifeos-primary-action">حفظ الاتفاقية</button></div>
        </div>
      </FormModal>}

      {filtered.length === 0 ? <AnimatedEmptyState icon={Handshake} title={search || filterStatus ? 'لا توجد نتائج مطابقة' : 'لا توجد اتفاقيات بعد'} description={search || filterStatus ? 'غيّر البحث أو الفلتر لرؤية بقية الالتزامات.' : 'أضف أول التزام حتى يبقى واضحًا ومتابَعًا بدل الاعتماد على الذاكرة.'} action={!search && !filterStatus ? <button onClick={() => setShowForm(true)} className="lifeos-primary-action"><Plus size={15} /> إضافة أول اتفاقية</button> : undefined} /> : (
        <div className="space-y-3">
          {filtered.map(agreement => <AgreementCard key={agreement.id} agreement={agreement} updateStatus={updateStatus} edit={() => { setEditItem(agreement); setForm({ personName: agreement.personName, type: agreement.type, details: agreement.details, agreementDate: agreement.agreementDate, dueDate: agreement.dueDate || '', status: agreement.status }); setShowForm(true); }} remove={() => deleteAgreement(agreement.id)} />)}
        </div>
      )}
    </div>
  );
}

function AgreementCard({ agreement, updateStatus, edit, remove }: { agreement: any; updateStatus: (id: string, status: string) => void; edit: () => void; remove: () => void }) {
  const statusInfo = STATUSES.find(s => s.val === agreement.status) || STATUSES[0];
  const due = agreement.dueDate ? parseLocalDateKey(agreement.dueDate) : null;
  const today = parseLocalDateKey(localDateKey());
  const daysUntil = due && today ? Math.ceil((due.getTime() - today.getTime()) / 86400000) : null;
  const deadlineTone = daysUntil !== null && daysUntil < 0 ? 'is-overdue' : daysUntil !== null && daysUntil <= 7 ? 'is-soon' : '';
  return <article className="lifeos-v4-agreement-card">
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <div className={`lifeos-v4-deadline-badge ${deadlineTone}`}><CalendarClock size={16} /><strong>{daysUntil === null ? '—' : daysUntil < 0 ? Math.abs(daysUntil) : daysUntil}</strong><span>{daysUntil === null ? 'بدون موعد' : daysUntil < 0 ? 'يوم تأخير' : 'يوم'}</span></div>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-black text-foreground">{agreement.personName}</h3><span className="lifeos-chip">{agreement.type}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusInfo.color}`}>{statusInfo.label}</span></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{agreement.details}</p><p className="mt-2 text-[10px] text-muted-foreground">بدأت {new Date(agreement.agreementDate + 'T12:00').toLocaleDateString('ar-SA')}{agreement.dueDate ? ` · الموعد ${new Date(agreement.dueDate + 'T12:00').toLocaleDateString('ar-SA')}` : ''}</p></div>
    </div>
    <div className="lifeos-v4-agreement-actions"><label className="sr-only" htmlFor={`status-${agreement.id}`}>حالة الاتفاقية</label><select id={`status-${agreement.id}`} value={agreement.status} onChange={e => updateStatus(agreement.id, e.target.value)} className="lifeos-control min-h-9 px-2 text-xs">{STATUSES.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}</select><button onClick={edit} className="lifeos-icon-action min-h-9 h-9 w-9" aria-label="تعديل الاتفاقية"><Edit3 size={14} /></button><button onClick={remove} className="lifeos-icon-action min-h-9 h-9 w-9 hover:text-destructive" aria-label="حذف الاتفاقية"><Trash2 size={14} /></button></div>
  </article>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-bold text-foreground"><span className="mb-1.5 block">{label}</span>{children}</label>; }
