import { useState, useEffect, useMemo } from 'react';
import { api } from '../../utils/api';
import { toast } from 'sonner';
import {
  Plus, Trash2, Edit3, Loader2, Wallet, TrendingUp, TrendingDown,
  PiggyBank, Target, BarChart3, ArrowLeftRight, Settings, X,
  Search, DollarSign, AlertTriangle, CheckCircle2, Calendar, RefreshCw
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const INCOME_CATS = ['راتب', 'عمل حر', 'أعمال', 'استثمار', 'هدية', 'مكافأة', 'أخرى'];
const EXPENSE_CATS = [
  'طعام', 'سكن', 'مواصلات', 'تسوق', 'عناية شخصية', 'صحة',
  'تعليم', 'ترفيه', 'سفر', 'فواتير', 'صدقة', 'حيوانات أليفة', 'أطفال', 'أخرى',
];
const CURRENCIES = ['USD', 'EUR', 'TRY', 'SAR', 'AED', 'SYP', 'GBP', 'JOD', 'KWD', 'QAR', 'EGP', 'MAD', 'IQD', 'LYD'];
const PAY_METHODS = ['نقد', 'بطاقة ائتمان', 'تحويل بنكي', 'محفظة إلكترونية', 'شيك'];
const ACCOUNT_TYPES = ['نقد', 'محفظة', 'حساب بنكي', 'بطاقة ائتمان', 'PayPal', 'حساب توفير'];
const RECURRENCE = ['مرة واحدة', 'أسبوعي', 'شهري', 'سنوي'];
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const CAT_COLORS: Record<string, string> = {
  راتب: '#10b981', 'عمل حر': '#3b82f6', أعمال: '#8b5cf6', استثمار: '#f59e0b',
  هدية: '#ec4899', مكافأة: '#06b6d4',
  طعام: '#ef4444', سكن: '#f97316', مواصلات: '#eab308', تسوق: '#a855f7',
  'عناية شخصية': '#ec4899', صحة: '#14b8a6', تعليم: '#3b82f6',
  ترفيه: '#6366f1', سفر: '#06b6d4', فواتير: '#64748b', صدقة: '#10b981',
  أخرى: '#94a3b8',
};
const CHART_COLORS = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316','#ec4899','#14b8a6','#6366f1'];

type Tab = 'overview' | 'income' | 'expenses' | 'accounts' | 'budgets' | 'savings' | 'analytics';

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().split('T')[0]; }
function thisMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function toBase(amount: number, currency: string, rates: Record<string,number>, base: string) {
  if (!amount || isNaN(amount)) return 0;
  if (currency === base) return amount;
  const rate = rates[currency];
  return rate ? amount / rate : amount;
}
function fmtNum(n: number) {
  if (isNaN(n) || !isFinite(n)) return '0';
  return n.toLocaleString('ar-SA', { maximumFractionDigits: 2 });
}
function fmt(n: number, currency = 'USD') { return `${fmtNum(n)} ${currency}`; }

// ── Shared UI ─────────────────────────────────────────────────────────────────

const INP = 'w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground';
const SEL = 'w-full bg-input-background border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground';

function Bar({ pct, color }: { pct: number; color: string }) {
  const safe = isNaN(pct) || !isFinite(pct) ? 0 : Math.min(Math.max(pct, 0), 100);
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${safe}%`, background: color }} />
    </div>
  );
}

function StatCard({ label, value, sub, color, icon, onClick }: { label: string; value: string; sub?: string; color: string; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <div className={`bg-card rounded-2xl border border-border p-4 ${onClick ? 'cursor-pointer hover:border-primary/40 transition-colors' : ''}`} onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, color }}>
          {icon}
        </div>
      </div>
      <p className="text-xl font-bold text-foreground leading-tight truncate">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs mt-1 font-medium" style={{ color }}>{sub}</p>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function FinancePage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);
  const [settings, setSettings] = useState<{ baseCurrency: string; rates: Record<string,number> }>({ baseCurrency: 'USD', rates: {} });
  const [customExpCats, setCustomExpCats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Transaction form
  const [showTxnForm, setShowTxnForm] = useState(false);
  const [txnType, setTxnType] = useState<'income'|'expense'>('expense');
  const [editTxn, setEditTxn] = useState<any>(null);
  const emptyTxn = { title: '', category: '', amount: '', currency: 'USD', date: todayStr(), paymentMethod: 'نقد', account: '', recurrence: 'مرة واحدة', notes: '' };
  const [txnForm, setTxnForm] = useState({ ...emptyTxn });

  // Account form
  const [showAccForm, setShowAccForm] = useState(false);
  const [accForm, setAccForm] = useState({ name: '', type: 'نقد', balance: '', currency: 'USD' });

  // Budget form
  const [showBudForm, setShowBudForm] = useState(false);
  const [budForm, setBudForm] = useState({ category: '', amount: '', currency: 'USD', month: thisMonthStr() });

  // Savings form
  const [showSavForm, setShowSavForm] = useState(false);
  const [editSav, setEditSav] = useState<any>(null);
  const emptySav = { name: '', target: '', saved: '0', currency: 'USD', deadline: '', notes: '' };
  const [savForm, setSavForm] = useState({ ...emptySav });

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [rateInput, setRateInput] = useState<Record<string,string>>({});
  const [newExpCat, setNewExpCat] = useState('');

  // Transfer modal
  const [showTransfer, setShowTransfer] = useState(false);
  const [xferForm, setXferForm] = useState({ from: '', to: '', amount: '', notes: '' });

  // Filters
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterMonth, setFilterMonth] = useState(thisMonthStr());
  const [filterAcc, setFilterAcc] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [txns, accs, buds, sgs, cfg] = await Promise.all([
        api('/transactions').catch(() => []),
        api('/accounts').catch(() => []),
        api('/budgets').catch(() => []),
        api('/savingsGoals').catch(() => []),
        api('/financeSettings').catch(() => ({ baseCurrency: 'USD', rates: {} })),
      ]);
      setTransactions(Array.isArray(txns) ? txns : []);
      setAccounts(Array.isArray(accs) ? accs : []);
      setBudgets(Array.isArray(buds) ? buds : []);
      setSavingsGoals(Array.isArray(sgs) ? sgs : []);
      setSettings(cfg ?? { baseCurrency: 'USD', rates: {} });
      setCustomExpCats(cfg?.customExpCats ?? []);
    } catch { toast.error('فشل التحميل'); }
    finally { setLoading(false); }
  }

  const base = settings.baseCurrency;
  const rates = settings.rates ?? {};
  const allExpCats = [...EXPENSE_CATS, ...customExpCats];

  // ── Derived stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const m = thisMonthStr();
    const mTxns = transactions.filter(t => t.date?.startsWith(m));
    const allInc  = transactions.filter(t => t.type === 'income').reduce((s,t) => s + toBase(+t.amount||0, t.currency, rates, base), 0);
    const allExp  = transactions.filter(t => t.type === 'expense').reduce((s,t) => s + toBase(+t.amount||0, t.currency, rates, base), 0);
    const mInc    = mTxns.filter(t => t.type === 'income').reduce((s,t) => s + toBase(+t.amount||0, t.currency, rates, base), 0);
    const mExp    = mTxns.filter(t => t.type === 'expense').reduce((s,t) => s + toBase(+t.amount||0, t.currency, rates, base), 0);
    const totalSav= savingsGoals.reduce((s,g) => s + toBase(+g.saved||0, g.currency, rates, base), 0);
    const totalBud= budgets.filter(b => b.month === m).reduce((s,b) => s + toBase(+b.amount||0, b.currency, rates, base), 0);
    const savRate = mInc > 0 ? Math.round(((mInc - mExp) / mInc) * 100) : 0;
    return { allInc, allExp, balance: allInc - allExp, mInc, mExp, totalSav, totalBud, budRemain: totalBud - mExp, savRate };
  }, [transactions, savingsGoals, budgets, rates, base]);

  const filteredTxns = useMemo(() => {
    return transactions.filter(t => {
      if (filterMonth && !t.date?.startsWith(filterMonth)) return false;
      if (filterCat && t.category !== filterCat) return false;
      if (filterAcc && t.account !== filterAcc) return false;
      if (search && !(t.title?.includes(search) || t.category?.includes(search) || t.notes?.includes(search))) return false;
      return true;
    }).sort((a,b) => (b.date ?? '').localeCompare(a.date ?? ''));
  }, [transactions, filterMonth, filterCat, filterAcc, search]);

  const monthlyTrend = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const m = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const inc = transactions.filter(t => t.type==='income' && t.date?.startsWith(m)).reduce((s,t) => s + toBase(+t.amount||0, t.currency, rates, base), 0);
    const exp = transactions.filter(t => t.type==='expense' && t.date?.startsWith(m)).reduce((s,t) => s + toBase(+t.amount||0, t.currency, rates, base), 0);
    return { label: MONTHS_AR[d.getMonth()].slice(0,3), inc, exp, net: inc - exp };
  }), [transactions, rates, base]);

  const catSpend = useMemo(() => {
    const m = thisMonthStr();
    const map: Record<string,number> = {};
    transactions.filter(t => t.type==='expense' && t.date?.startsWith(m)).forEach(t => {
      map[t.category] = (map[t.category] ?? 0) + toBase(+t.amount||0, t.currency, rates, base);
    });
    return Object.entries(map).sort((a,b) => b[1]-a[1]);
  }, [transactions, rates, base]);

  const maxTrend = Math.max(...monthlyTrend.flatMap(m => [m.inc, m.exp]), 1);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function saveTxn() {
    if (!txnForm.title.trim()) { toast.error('أدخل العنوان'); return; }
    if (!txnForm.amount || isNaN(+txnForm.amount) || +txnForm.amount <= 0) { toast.error('أدخل مبلغاً صحيحاً'); return; }
    try {
      const body = { ...txnForm, type: txnType, amount: +txnForm.amount };
      if (editTxn) {
        const updated = await api(`/transactions/${editTxn.id}`, { method: 'PUT', body: JSON.stringify(body) });
        setTransactions(p => p.map(t => t.id === updated.id ? updated : t));
        toast.success('تم التحديث');
      } else {
        const created = await api('/transactions', { method: 'POST', body: JSON.stringify(body) });
        setTransactions(p => [created, ...p]);
        toast.success(txnType === 'income' ? 'تم إضافة الدخل' : 'تم إضافة المصروف');
      }
      setShowTxnForm(false); setEditTxn(null); setTxnForm({ ...emptyTxn });
    } catch { toast.error('فشل الحفظ'); }
  }

  async function deleteTxn(id: string) {
    if (!confirm('حذف هذه المعاملة؟')) return;
    await api(`/transactions/${id}`, { method: 'DELETE' });
    setTransactions(p => p.filter(t => t.id !== id));
    toast.success('تم الحذف');
  }

  async function saveAcc() {
    if (!accForm.name.trim()) { toast.error('أدخل الاسم'); return; }
    const created = await api('/accounts', { method: 'POST', body: JSON.stringify({ ...accForm, balance: +accForm.balance || 0 }) });
    setAccounts(p => [...p, created]);
    setAccForm({ name: '', type: 'نقد', balance: '', currency: 'USD' });
    setShowAccForm(false);
    toast.success('تم إضافة الحساب');
  }

  async function deleteAcc(id: string) {
    if (!confirm('حذف هذا الحساب؟')) return;
    await api(`/accounts/${id}`, { method: 'DELETE' });
    setAccounts(p => p.filter(a => a.id !== id));
  }

  async function saveBud() {
    if (!budForm.category || !budForm.amount || +budForm.amount <= 0) { toast.error('أكمل البيانات'); return; }
    const created = await api('/budgets', { method: 'POST', body: JSON.stringify({ ...budForm, amount: +budForm.amount }) });
    setBudgets(p => [...p, created]);
    setBudForm({ category: '', amount: '', currency: 'USD', month: thisMonthStr() });
    setShowBudForm(false);
    toast.success('تمت إضافة الميزانية');
  }

  async function deleteBud(id: string) {
    await api(`/budgets/${id}`, { method: 'DELETE' });
    setBudgets(p => p.filter(b => b.id !== id));
  }

  async function saveSav() {
    if (!savForm.name || !savForm.target || +savForm.target <= 0) { toast.error('أكمل البيانات'); return; }
    const body = { ...savForm, target: +savForm.target, saved: +savForm.saved || 0 };
    if (editSav) {
      const updated = await api(`/savingsGoals/${editSav.id}`, { method: 'PUT', body: JSON.stringify(body) });
      setSavingsGoals(p => p.map(g => g.id === updated.id ? updated : g));
    } else {
      const created = await api('/savingsGoals', { method: 'POST', body: JSON.stringify(body) });
      setSavingsGoals(p => [...p, created]);
    }
    setShowSavForm(false); setEditSav(null); setSavForm({ ...emptySav });
    toast.success('تم الحفظ');
  }

  async function deleteSav(id: string) {
    if (!confirm('حذف هذا الهدف؟')) return;
    await api(`/savingsGoals/${id}`, { method: 'DELETE' });
    setSavingsGoals(p => p.filter(g => g.id !== id));
  }

  async function saveSettings() {
    const newRates = { ...rates };
    Object.entries(rateInput).forEach(([k,v]) => { const n = parseFloat(v); if (!isNaN(n) && n > 0) newRates[k] = n; });
    const updated = await api('/financeSettings', { method: 'PUT', body: JSON.stringify({ ...settings, rates: newRates, customExpCats }) });
    setSettings(updated);
    setShowSettings(false); setRateInput({});
    toast.success('تم حفظ الإعدادات');
  }

  async function doTransfer() {
    if (!xferForm.from || !xferForm.to || !xferForm.amount || +xferForm.amount <= 0) { toast.error('أكمل البيانات'); return; }
    if (xferForm.from === xferForm.to) { toast.error('لا يمكن التحويل إلى نفس الحساب'); return; }
    const amt = +xferForm.amount;
    const fromAcc = accounts.find(a => a.id === xferForm.from);
    const toAcc = accounts.find(a => a.id === xferForm.to);
    if (!fromAcc || !toAcc) return;
    const [uFrom, uTo] = await Promise.all([
      api(`/accounts/${fromAcc.id}`, { method: 'PUT', body: JSON.stringify({ ...fromAcc, balance: (fromAcc.balance||0) - amt }) }),
      api(`/accounts/${toAcc.id}`,   { method: 'PUT', body: JSON.stringify({ ...toAcc,   balance: (toAcc.balance||0)   + amt }) }),
    ]);
    setAccounts(p => p.map(a => a.id === uFrom.id ? uFrom : a.id === uTo.id ? uTo : a));
    setShowTransfer(false); setXferForm({ from: '', to: '', amount: '', notes: '' });
    toast.success('تم التحويل بنجاح');
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={28} /></div>;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview',  label: 'نظرة عامة' },
    { id: 'income',    label: 'الدخل' },
    { id: 'expenses',  label: 'المصروفات' },
    { id: 'accounts',  label: 'الحسابات' },
    { id: 'budgets',   label: 'الميزانيات' },
    { id: 'savings',   label: 'التوفير' },
    { id: 'analytics', label: 'التحليلات' },
  ];

  const openAddTxn = (type: 'income'|'expense') => {
    setTxnType(type); setEditTxn(null); setTxnForm({ ...emptyTxn }); setShowTxnForm(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">الإدارة المالية</h2>
          <p className="text-sm text-muted-foreground mt-0.5">العملة الأساسية: <span className="font-semibold text-primary">{base}</span></p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground transition-colors" title="الإعدادات"><Settings size={16} /></button>
          <button onClick={() => setShowTransfer(true)} className="flex items-center gap-2 border border-border bg-card px-3 py-2 rounded-xl text-sm text-foreground hover:bg-muted transition-colors"><ArrowLeftRight size={14} /> تحويل</button>
          <button onClick={() => openAddTxn('income')} className="flex items-center gap-2 bg-green-500 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"><Plus size={14} /> دخل</button>
          <button onClick={() => openAddTxn('expense')} className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"><Plus size={14} /> مصروف</button>
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="الرصيد الإجمالي"  value={fmt(stats.balance, base)}  color={stats.balance >= 0 ? '#10b981' : '#ef4444'} icon={<Wallet size={16} />}     sub={stats.balance >= 0 ? '✓ إيجابي' : '⚠ سالب'} />
        <StatCard label="دخل هذا الشهر"    value={fmt(stats.mInc, base)}     color="#10b981" icon={<TrendingUp size={16} />} />
        <StatCard label="مصروف هذا الشهر"  value={fmt(stats.mExp, base)}     color="#ef4444" icon={<TrendingDown size={16} />} />
        <StatCard label="معدل التوفير"      value={`${stats.savRate}%`}       color="#3b82f6" icon={<PiggyBank size={16} />}   sub={stats.savRate >= 20 ? '✓ ممتاز' : stats.savRate >= 0 ? 'يمكن التحسين' : '⚠ عجز'} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="إجمالي الدخل"     value={fmt(stats.allInc, base)}   color="#10b981" icon={<TrendingUp size={16} />} />
        <StatCard label="إجمالي المصروفات" value={fmt(stats.allExp, base)}   color="#ef4444" icon={<TrendingDown size={16} />} />
        <StatCard label="إجمالي التوفير"   value={fmt(stats.totalSav, base)} color="#8b5cf6" icon={<PiggyBank size={16} />} />
        <StatCard label="ميزانية الشهر المتبقية" value={fmt(Math.max(stats.budRemain, 0), base)} color={stats.budRemain < 0 ? '#ef4444' : '#f59e0b'} icon={<Target size={16} />} sub={stats.budRemain < 0 ? '⚠ تجاوزت الميزانية' : undefined} />
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* OVERVIEW                                                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="space-y-5">

          {/* Monthly trend bar chart */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">الاتجاه المالي — آخر 6 أشهر</h3>
            <div className="flex items-end gap-2 h-36">
              {monthlyTrend.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-0.5 items-end" style={{ height: '110px' }}>
                    {/* income bar */}
                    <div className="flex-1 rounded-t cursor-default group relative transition-all duration-500"
                      style={{ height: `${(m.inc / maxTrend) * 100}%`, background: '#10b98166', minHeight: m.inc > 0 ? '4px' : '2px' }}>
                      {m.inc > 0 && (
                        <span className="absolute bottom-full mb-1 right-0 z-10 bg-popover border border-border text-foreground text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none shadow-sm">
                          {fmt(m.inc, base)}
                        </span>
                      )}
                    </div>
                    {/* expense bar */}
                    <div className="flex-1 rounded-t cursor-default group relative transition-all duration-500"
                      style={{ height: `${(m.exp / maxTrend) * 100}%`, background: '#ef444466', minHeight: m.exp > 0 ? '4px' : '2px' }}>
                      {m.exp > 0 && (
                        <span className="absolute bottom-full mb-1 right-0 z-10 bg-popover border border-border text-foreground text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none shadow-sm">
                          {fmt(m.exp, base)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  {/* net indicator */}
                  <span className={`text-[9px] font-medium ${m.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {m.net >= 0 ? '+' : ''}{fmtNum(Math.round(m.net))}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500/40 inline-block" />دخل</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/40 inline-block" />مصروف</span>
            </div>
          </div>

          {/* Category spending */}
          {catSpend.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4">المصروفات حسب الفئة — {MONTHS_AR[new Date().getMonth()]}</h3>
              <div className="space-y-3">
                {catSpend.slice(0, 8).map(([cat, amount], i) => {
                  const total = catSpend.reduce((s,[,v]) => s + v, 0);
                  const pct = total > 0 ? (amount / total) * 100 : 0;
                  const color = CAT_COLORS[cat] ?? CHART_COLORS[i % CHART_COLORS.length];
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground font-medium flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                          {cat}
                        </span>
                        <span className="text-muted-foreground">{fmt(amount, base)} · {Math.round(pct)}%</span>
                      </div>
                      <Bar pct={pct} color={color} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent transactions */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">آخر المعاملات</h3>
              <button onClick={() => setTab('expenses')} className="text-xs text-primary hover:underline">عرض الكل</button>
            </div>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد معاملات بعد. ابدأ بإضافة دخل أو مصروف.</p>
            ) : (
              <div className="space-y-0.5">
                {[...transactions].sort((a,b) => (b.date??'').localeCompare(a.date??'')).slice(0, 10).map(t => (
                  <TxnRow key={t.id} t={t} base={base} rates={rates} onDelete={deleteTxn} onEdit={() => {
                    setEditTxn(t); setTxnType(t.type);
                    setTxnForm({ title: t.title, category: t.category, amount: String(t.amount), currency: t.currency, date: t.date, paymentMethod: t.paymentMethod||'نقد', account: t.account||'', recurrence: t.recurrence||'مرة واحدة', notes: t.notes||'' });
                    setShowTxnForm(true);
                  }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* INCOME / EXPENSES                                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {(tab === 'income' || tab === 'expenses') && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-40">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className={`${INP} pr-9`} />
            </div>
            
            
            {accounts.length > 0 && (
              null
            )}
          </div>

          {/* List */}
          {(() => {
            const typeFilter = tab === 'income' ? 'income' : 'expense';
            const list = filteredTxns.filter(t => t.type === typeFilter);
            const totalShown = list.reduce((s,t) => s + toBase(+t.amount||0, t.currency, rates, base), 0);
            return (
              <>
                {list.length > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground px-1">
                    <span>{list.length} سجل</span>
                    <span className="font-semibold" style={{ color: tab === 'income' ? '#10b981' : '#ef4444' }}>
                      {tab === 'income' ? '+' : '-'}{fmt(totalShown, base)}
                    </span>
                  </div>
                )}
                {list.length === 0 ? (
                  <div className="text-center py-14 bg-card rounded-2xl border border-border">
                    <DollarSign size={36} className="text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">لا توجد سجلات مطابقة</p>
                    <button onClick={() => openAddTxn(tab === 'income' ? 'income' : 'expense')} className="mt-3 text-sm text-primary hover:underline">
                      إضافة {tab === 'income' ? 'دخل' : 'مصروف'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {list.map(t => (
                      <TxnCard key={t.id} t={t} base={base} rates={rates} onDelete={deleteTxn} onEdit={() => {
                        setEditTxn(t); setTxnType(t.type);
                        setTxnForm({ title: t.title, category: t.category, amount: String(t.amount), currency: t.currency, date: t.date, paymentMethod: t.paymentMethod||'نقد', account: t.account||'', recurrence: t.recurrence||'مرة واحدة', notes: t.notes||'' });
                        setShowTxnForm(true);
                      }} />
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ACCOUNTS                                                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{accounts.length} حساب</p>
            <button onClick={() => setShowAccForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"><Plus size={14} /> حساب جديد</button>
          </div>

          {showAccForm && (
            <div className="bg-card rounded-2xl border border-primary/30 p-5 space-y-4">
              <h3 className="font-semibold text-foreground">حساب جديد</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">الاسم *</label><input value={accForm.name} onChange={e => setAccForm(f => ({...f,name:e.target.value}))} className={INP} placeholder="مثال: بنك الراجحي" /></div>
                <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">النوع</label><select value={accForm.type} onChange={e => setAccForm(f => ({...f,type:e.target.value}))} className={SEL}>{ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">الرصيد الابتدائي</label><input type="number" value={accForm.balance} onChange={e => setAccForm(f => ({...f,balance:e.target.value}))} className={INP} /></div>
                <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">العملة</label><select value={accForm.currency} onChange={e => setAccForm(f => ({...f,currency:e.target.value}))} className={SEL}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowAccForm(false)} className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:bg-muted transition-colors">إلغاء</button>
                <button onClick={saveAcc} className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">حفظ</button>
              </div>
            </div>
          )}

          {accounts.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border">
              <Wallet size={40} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium mb-1">لا توجد حسابات</p>
              <p className="text-sm text-muted-foreground">أضف حساباتك المالية لتتبع أرصدتها</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc, idx) => {
                const color = CHART_COLORS[idx % CHART_COLORS.length];
                const positive = (acc.balance ?? 0) >= 0;
                return (
                  <div key={acc.id} className="bg-card rounded-2xl border border-border p-5 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1 h-full rounded-r-2xl" style={{ background: color }} />
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-foreground">{acc.name}</h4>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full mt-1 inline-block">{acc.type}</span>
                      </div>
                      <button onClick={() => deleteAcc(acc.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"><Trash2 size={13} /></button>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: positive ? '#10b981' : '#ef4444' }}>{fmt(acc.balance??0, acc.currency)}</p>
                    {acc.currency !== base && <p className="text-xs text-muted-foreground mt-1">≈ {fmt(toBase(acc.balance??0, acc.currency, rates, base), base)}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* BUDGETS                                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'budgets' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{budgets.length} ميزانية</p>
            <button onClick={() => setShowBudForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"><Plus size={14} /> ميزانية جديدة</button>
          </div>

          {showBudForm && (
            <div className="bg-card rounded-2xl border border-primary/30 p-5 space-y-4">
              <h3 className="font-semibold text-foreground">ميزانية جديدة</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">الفئة *</label>
                  <select value={budForm.category} onChange={e => setBudForm(f => ({...f,category:e.target.value}))} className={SEL}>
                    <option value="">اختر...</option>
                    {allExpCats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">المبلغ *</label><input type="number" value={budForm.amount} onChange={e => setBudForm(f => ({...f,amount:e.target.value}))} className={INP} /></div>
                <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">العملة</label><select value={budForm.currency} onChange={e => setBudForm(f => ({...f,currency:e.target.value}))} className={SEL}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">الشهر</label><input type="month" value={budForm.month} onChange={e => setBudForm(f => ({...f,month:e.target.value}))} className={INP} /></div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowBudForm(false)} className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:bg-muted transition-colors">إلغاء</button>
                <button onClick={saveBud} className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">حفظ</button>
              </div>
            </div>
          )}

          {budgets.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border">
              <Target size={40} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium mb-1">لا توجد ميزانيات</p>
              <p className="text-sm text-muted-foreground">حدد ميزانية لكل فئة للتحكم في الإنفاق</p>
            </div>
          ) : (
            <div className="space-y-3">
              {budgets.map(b => {
                const spent = transactions.filter(t => t.type==='expense' && t.category===b.category && t.date?.startsWith(b.month))
                  .reduce((s,t) => s + toBase(+t.amount||0, t.currency, rates, base), 0);
                const budBase = toBase(+b.amount||0, b.currency, rates, base);
                const pct = budBase > 0 ? (spent / budBase) * 100 : 0;
                const over = pct > 100;
                const remaining = budBase - spent;
                const color = over ? '#ef4444' : pct > 75 ? '#f59e0b' : '#10b981';
                const monthName = MONTHS_AR[parseInt(b.month?.split('-')[1]??'1') - 1];
                return (
                  <div key={b.id} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{b.category}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{monthName} {b.month?.split('-')[0]}</span>
                        {over && <span className="flex items-center gap-1 text-xs text-red-500 font-medium"><AlertTriangle size={11} />تجاوزت الحد!</span>}
                        {!over && pct > 75 && <span className="flex items-center gap-1 text-xs text-amber-500 font-medium"><AlertTriangle size={11} />تقترب من الحد</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color }}>{Math.round(pct)}%</span>
                        <button onClick={() => deleteBud(b.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    <Bar pct={Math.min(pct, 100)} color={color} />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>الإنفاق: <span className="font-medium text-foreground">{fmt(spent, base)}</span></span>
                      <span>الميزانية: <span className="font-medium text-foreground">{fmt(budBase, base)}</span></span>
                      <span style={{ color: remaining >= 0 ? '#10b981' : '#ef4444' }} className="font-medium">المتبقي: {fmt(remaining, base)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SAVINGS                                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'savings' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{savingsGoals.length} هدف توفير</p>
            <button onClick={() => { setEditSav(null); setSavForm({...emptySav}); setShowSavForm(true); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"><Plus size={14} /> هدف جديد</button>
          </div>

          {showSavForm && (
            <div className="bg-card rounded-2xl border border-primary/30 p-5 space-y-4">
              <h3 className="font-semibold text-foreground">{editSav ? 'تعديل الهدف' : 'هدف توفير جديد'}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="md:col-span-2"><label className="block text-xs font-medium text-muted-foreground mb-1.5">اسم الهدف *</label><input value={savForm.name} onChange={e => setSavForm(f => ({...f,name:e.target.value}))} className={INP} placeholder="مثال: شراء سيارة" /></div>
                <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">العملة</label><select value={savForm.currency} onChange={e => setSavForm(f => ({...f,currency:e.target.value}))} className={SEL}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">المبلغ المستهدف *</label><input type="number" value={savForm.target} onChange={e => setSavForm(f => ({...f,target:e.target.value}))} className={INP} /></div>
                <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">المبلغ المدخر حالياً</label><input type="number" value={savForm.saved} onChange={e => setSavForm(f => ({...f,saved:e.target.value}))} className={INP} /></div>
                <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">الموعد المستهدف</label><input type="date" value={savForm.deadline} onChange={e => setSavForm(f => ({...f,deadline:e.target.value}))} className={INP} /></div>
                <div className="col-span-2 md:col-span-3"><label className="block text-xs font-medium text-muted-foreground mb-1.5">ملاحظات</label><input value={savForm.notes} onChange={e => setSavForm(f => ({...f,notes:e.target.value}))} className={INP} placeholder="خطط، مصدر التوفير..." /></div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setShowSavForm(false); setEditSav(null); }} className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:bg-muted transition-colors">إلغاء</button>
                <button onClick={saveSav} className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">حفظ</button>
              </div>
            </div>
          )}

          {savingsGoals.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border">
              <PiggyBank size={40} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium mb-1">لا توجد أهداف توفير</p>
              <p className="text-sm text-muted-foreground">حدد هدفاً مالياً وابدأ رحلة التوفير</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savingsGoals.map((g, idx) => {
                const pct = g.target > 0 ? Math.min((g.saved / g.target) * 100, 100) : 0;
                const remaining = (+g.target||0) - (+g.saved||0);
                const done = pct >= 100;
                const color = done ? '#10b981' : CHART_COLORS[idx % CHART_COLORS.length];
                return (
                  <div key={g.id} className="bg-card rounded-2xl border border-border p-5 group">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">{g.name}</h4>
                          {done && <CheckCircle2 size={15} className="text-green-500" />}
                        </div>
                        {g.deadline && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Calendar size={10} /> الموعد: {g.deadline}</p>}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditSav(g); setSavForm({ name: g.name, target: String(g.target), saved: String(g.saved), currency: g.currency, deadline: g.deadline||'', notes: g.notes||'' }); setShowSavForm(true); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><Edit3 size={13} /></button>
                        <button onClick={() => deleteSav(g.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-bold text-foreground">{fmt(+g.saved||0, g.currency)}</span>
                      <span className="text-muted-foreground">من {fmt(+g.target||0, g.currency)}</span>
                    </div>
                    <Bar pct={pct} color={color} />
                    <div className="flex justify-between text-xs mt-2">
                      <span className="font-semibold" style={{ color }}>{Math.round(pct)}% مكتمل</span>
                      {!done && <span className="text-muted-foreground">المتبقي: {fmt(remaining, g.currency)}</span>}
                      {done && <span className="text-green-500 font-medium">🎉 تم تحقيق الهدف!</span>}
                    </div>
                    {g.notes && <p className="text-xs text-muted-foreground mt-2 bg-muted rounded-lg px-2.5 py-1.5">{g.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ANALYTICS                                                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'analytics' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Income vs Expenses per month */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4">الدخل مقابل المصروفات</h3>
              <div className="space-y-4">
                {monthlyTrend.map((m, i) => {
                  const maxV = Math.max(...monthlyTrend.map(x => Math.max(x.inc, x.exp)), 1);
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-foreground font-medium">{m.label}</span>
                        <span className={m.net >= 0 ? 'text-green-500' : 'text-red-500'} style={{ fontWeight: 600 }}>
                          {m.net >= 0 ? '+' : ''}{fmt(m.net, base)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${(m.inc / maxV) * 100}%` }} />
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-red-500 transition-all duration-500" style={{ width: `${(m.exp / maxV) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 rounded-full bg-green-500 inline-block" />دخل</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 rounded-full bg-red-500 inline-block" />مصروف</span>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4">توزيع المصروفات — {MONTHS_AR[new Date().getMonth()]}</h3>
              {catSpend.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">لا توجد مصروفات هذا الشهر</p>
              ) : (
                <div className="space-y-3">
                  {catSpend.map(([cat, amount], i) => {
                    const total = catSpend.reduce((s,[,v]) => s+v, 0);
                    const pct = total > 0 ? (amount / total) * 100 : 0;
                    const color = CAT_COLORS[cat] ?? CHART_COLORS[i % CHART_COLORS.length];
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-sm text-foreground flex-1 truncate">{cat}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{fmt(amount, base)}</span>
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden flex-shrink-0">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-7 flex-shrink-0">{Math.round(pct)}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Budget performance */}
            {budgets.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 className="font-semibold text-foreground mb-4">أداء الميزانية</h3>
                <div className="space-y-3">
                  {budgets.filter(b => b.month === thisMonthStr()).map(b => {
                    const spent = transactions.filter(t => t.type==='expense' && t.category===b.category && t.date?.startsWith(b.month))
                      .reduce((s,t) => s + toBase(+t.amount||0, t.currency, rates, base), 0);
                    const budBase = toBase(+b.amount||0, b.currency, rates, base);
                    const pct = budBase > 0 ? (spent / budBase) * 100 : 0;
                    const color = pct > 100 ? '#ef4444' : pct > 75 ? '#f59e0b' : '#10b981';
                    return (
                      <div key={b.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-foreground">{b.category}</span>
                          <span className="font-medium" style={{ color }}>{Math.round(pct)}%</span>
                        </div>
                        <Bar pct={Math.min(pct, 100)} color={color} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Savings progress */}
            {savingsGoals.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 className="font-semibold text-foreground mb-4">تقدم أهداف التوفير</h3>
                <div className="space-y-3">
                  {savingsGoals.map((g, i) => {
                    const pct = g.target > 0 ? Math.min((g.saved / g.target) * 100, 100) : 0;
                    const color = pct >= 100 ? '#10b981' : CHART_COLORS[i % CHART_COLORS.length];
                    return (
                      <div key={g.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-foreground">{g.name}</span>
                          <span className="font-medium" style={{ color }}>{Math.round(pct)}%</span>
                        </div>
                        <Bar pct={pct} color={color} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Account balances */}
            {accounts.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-5 md:col-span-2">
                <h3 className="font-semibold text-foreground mb-4">أرصدة الحسابات</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {accounts.map((acc, i) => {
                    const color = CHART_COLORS[i % CHART_COLORS.length];
                    const pos = (acc.balance ?? 0) >= 0;
                    return (
                      <div key={acc.id} className="bg-muted/50 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">{acc.name}</p>
                        <p className="font-bold text-base" style={{ color: pos ? '#10b981' : '#ef4444' }}>{fmt(acc.balance??0, acc.currency)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Financial insights */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-5">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><BarChart3 size={16} className="text-primary" /> ملخص مالي</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                { label: 'إجمالي المعاملات', value: `${transactions.length}` },
                { label: 'إجمالي الدخل',     value: fmt(stats.allInc, base) },
                { label: 'إجمالي المصروفات', value: fmt(stats.allExp, base) },
                { label: 'صافي الرصيد',      value: fmt(stats.balance, base) },
                { label: 'عدد الحسابات',     value: `${accounts.length}` },
                { label: 'عدد الميزانيات',   value: `${budgets.length}` },
                { label: 'أهداف التوفير',    value: `${savingsGoals.length}` },
                { label: 'معدل التوفير',      value: `${stats.savRate}%` },
              ].map((s, i) => (
                <div key={i} className="bg-card/60 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="font-bold text-foreground mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Transaction Form                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showTxnForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowTxnForm(false); setEditTxn(null); }} />
          <div className="relative bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-base">
                {editTxn ? 'تعديل المعاملة' : txnType === 'income' ? 'إضافة دخل' : 'إضافة مصروف'}
              </h3>
              <button onClick={() => { setShowTxnForm(false); setEditTxn(null); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><X size={16} /></button>
            </div>

            {!editTxn && (
              <div className="flex p-1 bg-muted rounded-xl gap-1">
                <button onClick={() => setTxnType('income')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${txnType === 'income' ? 'bg-green-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>دخل</button>
                <button onClick={() => setTxnType('expense')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${txnType === 'expense' ? 'bg-red-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>مصروف</button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">العنوان *</label>
                <input value={txnForm.title} onChange={e => setTxnForm(f => ({...f,title:e.target.value}))} className={INP} placeholder={txnType === 'income' ? 'مثال: راتب شهر يوليو' : 'مثال: فاتورة الكهرباء'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">المبلغ *</label>
                <input type="number" value={txnForm.amount} onChange={e => setTxnForm(f => ({...f,amount:e.target.value}))} className={INP} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">العملة</label>
                <select value={txnForm.currency} onChange={e => setTxnForm(f => ({...f,currency:e.target.value}))} className={SEL}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">الفئة</label>
                <select value={txnForm.category} onChange={e => setTxnForm(f => ({...f,category:e.target.value}))} className={SEL}>
                  <option value="">اختر...</option>
                  {(txnType === 'income' ? INCOME_CATS : allExpCats).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">التاريخ</label>
                <input type="date" value={txnForm.date} onChange={e => setTxnForm(f => ({...f,date:e.target.value}))} className={INP} />
              </div>
              {txnType === 'expense' && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">طريقة الدفع</label>
                  <select value={txnForm.paymentMethod} onChange={e => setTxnForm(f => ({...f,paymentMethod:e.target.value}))} className={SEL}>
                    {PAY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">الحساب</label>
                <select value={txnForm.account} onChange={e => setTxnForm(f => ({...f,account:e.target.value}))} className={SEL}>
                  <option value="">اختر...</option>
                  {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">التكرار</label>
                <select value={txnForm.recurrence} onChange={e => setTxnForm(f => ({...f,recurrence:e.target.value}))} className={SEL}>
                  {RECURRENCE.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">ملاحظات</label>
                <textarea value={txnForm.notes} onChange={e => setTxnForm(f => ({...f,notes:e.target.value}))} className={`${INP} resize-none h-16`} />
              </div>
            </div>

            {txnForm.currency !== base && txnForm.amount && rates[txnForm.currency] && (
              <div className="text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2.5">
                ≈ <span className="font-semibold text-foreground">{fmt(toBase(+txnForm.amount||0, txnForm.currency, rates, base), base)}</span>
                <span className="mx-1">·</span>
                سعر الصرف: 1 {txnForm.currency} = {rates[txnForm.currency] ? fmtNum(1/rates[txnForm.currency]) : '?'} {base}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => { setShowTxnForm(false); setEditTxn(null); }} className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:bg-muted transition-colors">إلغاء</button>
              <button onClick={saveTxn} className="px-5 py-2 rounded-xl text-sm bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                {editTxn ? 'تحديث' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Transfer                                                       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowTransfer(false)} />
          <div className="relative bg-card rounded-2xl border border-border p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">تحويل بين الحسابات</h3>
              <button onClick={() => setShowTransfer(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">من حساب</label>
                <select value={xferForm.from} onChange={e => setXferForm(f => ({...f,from:e.target.value}))} className={SEL}>
                  <option value="">اختر...</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance??0,a.currency)})</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">إلى حساب</label>
                <select value={xferForm.to} onChange={e => setXferForm(f => ({...f,to:e.target.value}))} className={SEL}>
                  <option value="">اختر...</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">المبلغ</label>
                <input type="number" value={xferForm.amount} onChange={e => setXferForm(f => ({...f,amount:e.target.value}))} className={INP} placeholder="0" />
              </div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">ملاحظة</label>
                <input value={xferForm.notes} onChange={e => setXferForm(f => ({...f,notes:e.target.value}))} className={INP} />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowTransfer(false)} className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:bg-muted transition-colors">إلغاء</button>
              <button onClick={doTransfer} className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">تحويل</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Settings                                                       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">إعدادات العملة والفئات</h3>
              <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">العملة الأساسية</label>
              <select value={settings.baseCurrency} onChange={e => setSettings(s => ({...s,baseCurrency:e.target.value}))} className={SEL}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">أسعار الصرف (وحدات لكل 1 {settings.baseCurrency})</p>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {CURRENCIES.filter(c => c !== settings.baseCurrency).map(c => (
                  <div key={c} className="flex items-center gap-3">
                    <span className="text-sm text-foreground w-12 font-semibold">{c}</span>
                    <input type="number" placeholder={String(rates[c] ?? '')} value={rateInput[c] ?? ''} onChange={e => setRateInput(r => ({...r,[c]:e.target.value}))} className={`${INP} flex-1`} />
                    {rates[c] && <span className="text-xs text-muted-foreground w-28 flex-shrink-0">≈ {fmtNum(1/rates[c])} {settings.baseCurrency}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">فئات مصروفات مخصصة</p>
              <div className="flex gap-2 mb-2">
                <input value={newExpCat} onChange={e => setNewExpCat(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newExpCat.trim()) { setCustomExpCats(p => [...p, newExpCat.trim()]); setNewExpCat(''); } }} className={`${INP} flex-1`} placeholder="اسم الفئة..." />
                <button onClick={() => { if (newExpCat.trim()) { setCustomExpCats(p => [...p, newExpCat.trim()]); setNewExpCat(''); } }} className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm"><Plus size={14} /></button>
              </div>
              <div className="flex flex-wrap gap-2">
                {customExpCats.map((c, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs bg-muted px-2.5 py-1 rounded-full text-foreground">
                    {c}
                    <button onClick={() => setCustomExpCats(p => p.filter((_,j) => j !== i))} className="hover:text-destructive transition-colors"><X size={10} /></button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:bg-muted transition-colors">إلغاء</button>
              <button onClick={saveSettings} className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">حفظ الإعدادات</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Transaction sub-components ────────────────────────────────────────────────

function TxnRow({ t, base, rates, onEdit, onDelete }: any) {
  const amtBase = toBase(+t.amount||0, t.currency, rates, base);
  const color = CAT_COLORS[t.category] ?? '#94a3b8';
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0 group">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
        style={{ background: `${color}20`, color }}>
        {t.type === 'income' ? '↑' : '↓'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
        <p className="text-xs text-muted-foreground">{t.category} · {t.date}</p>
      </div>
      <div className="text-left flex-shrink-0 flex items-center gap-2">
        <div>
          <p className={`text-sm font-bold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
            {t.type === 'income' ? '+' : '-'}{t.amount} {t.currency}
          </p>
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1 rounded hover:bg-muted text-muted-foreground"><Edit3 size={11} /></button>
          <button onClick={() => onDelete(t.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={11} /></button>
        </div>
      </div>
    </div>
  );
}

function TxnCard({ t, base, rates, onEdit, onDelete }: any) {
  const amtBase = toBase(+t.amount||0, t.currency, rates, base);
  const color = CAT_COLORS[t.category] ?? '#94a3b8';
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 group hover:border-border/80 transition-colors">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
        style={{ background: `${color}18` }}>
        {t.type === 'income' ? '📈' : '📉'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground text-sm">{t.title}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${color}18`, color }}>{t.category}</span>
          {t.recurrence !== 'مرة واحدة' && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{t.recurrence}</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><Calendar size={10} />{t.date}</span>
          {t.account && <span>📁 {t.account}</span>}
          {t.paymentMethod && t.paymentMethod !== 'نقد' && <span>💳 {t.paymentMethod}</span>}
          {t.notes && <span className="truncate max-w-xs">{t.notes}</span>}
        </div>
      </div>
      <div className="text-left flex-shrink-0">
        <p className={`font-bold text-base ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
          {t.type === 'income' ? '+' : '-'}{t.amount} {t.currency}
        </p>
        {t.currency !== base && <p className="text-xs text-muted-foreground">≈ {fmt(amtBase, base)}</p>}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
        <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><Edit3 size={13} /></button>
        <button onClick={() => onDelete(t.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}
