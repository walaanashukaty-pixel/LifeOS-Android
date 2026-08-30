import { useEffect, useMemo, useState } from 'react';
import { Check, Crown, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  getSubscriptionPackages,
  purchaseSubscriptionPackage,
  restoreSubscriptionPurchases,
  type LifeOSSubscriptionPackage,
} from '../../utils/subscriptions';
import type { SubscriptionState } from '../../utils/subscription-model';

interface ProPaywallProps {
  open: boolean;
  state: SubscriptionState;
  onClose: () => void;
  onStateChange: (state: SubscriptionState) => void;
}

const PRO_BENEFITS = [
  'بدون إعلانات مكافأة داخل LifeOS',
  'إضافة المهام والعادات والأهداف وباقي السعات بلا حدود',
  'كل الفتحات المشمولة في Free متاحة مباشرة بدون مشاهدة إعلان',
  'الاشتراك مرتبط بحساب LifeOS الحالي',
];

export function ProPaywall({ open, state, onClose, onStateChange }: ProPaywallProps) {
  const [packages, setPackages] = useState<LifeOSSubscriptionPackage[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !state.available || state.isPro) return;
    let active = true;
    setLoading(true);
    setError('');
    getSubscriptionPackages()
      .then(items => {
        if (!active) return;
        setPackages(items);
        const annual = items.find(item => item.packageType.toLowerCase().includes('annual'));
        setSelectedId((annual || items[0])?.id || '');
        if (!items.length) setError('لم يتم إنشاء باقات الاشتراك في RevenueCat/Google Play بعد.');
      })
      .catch(err => active && setError(err?.message || 'تعذر تحميل الباقات.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [open, state.available, state.isPro]);

  const selected = useMemo(() => packages.find(item => item.id === selectedId) || null, [packages, selectedId]);
  if (!open) return null;

  async function purchase() {
    if (!selected) return;
    setPurchasing(true);
    try {
      const next = await purchaseSubscriptionPackage(selected);
      onStateChange(next);
      if (next.isPro) {
        toast.success('أهلًا بك في LifeOS Pro ✨');
        onClose();
      }
    } catch (err: any) {
      if (err?.message !== 'تم إلغاء عملية الشراء.') toast.error(err?.message || 'تعذر إتمام الاشتراك');
    } finally {
      setPurchasing(false);
    }
  }

  async function restore() {
    setPurchasing(true);
    try {
      const next = await restoreSubscriptionPurchases();
      onStateChange(next);
      toast.success(next.isPro ? 'تم استعادة اشتراك LifeOS Pro' : 'لم نجد اشتراك Pro نشطًا لهذا الحساب');
      if (next.isPro) onClose();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر استعادة المشتريات');
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" dir="rtl">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[32px] border border-border bg-card shadow-2xl sm:rounded-[32px]">
        <div className="relative overflow-hidden border-b border-border p-6">
          <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="absolute -right-12 top-10 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
          <button onClick={onClose} className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition hover:text-foreground"><X size={18} /></button>
          <div className="relative">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/20"><Crown size={26} /></div>
            <div className="flex items-center gap-2"><h2 className="text-2xl font-black text-foreground">LifeOS Pro</h2><Sparkles size={18} className="text-amber-500" /></div>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">استخدم LifeOS بلا حدود الإضافة وبدون إعلانات مكافأة.</p>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-2.5">
            {PRO_BENEFITS.map(item => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-muted/50 px-3.5 py-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary"><Check size={15} strokeWidth={3} /></span>
                <span className="text-sm font-medium text-foreground">{item}</span>
              </div>
            ))}
          </div>

          {state.isPro ? (
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
              <Crown className="mx-auto mb-2 text-amber-500" size={28} />
              <p className="font-bold text-foreground">اشتراك Pro فعّال</p>
              <p className="mt-1 text-xs text-muted-foreground">ميزات Pro مرتبطة بحساب LifeOS الحالي.</p>
            </div>
          ) : !state.available ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-amber-700 dark:text-amber-300">
              {state.error || 'نظام الاشتراك غير مهيأ على هذه النسخة بعد.'}
            </div>
          ) : loading ? (
            <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" /> جاري تحميل الأسعار من Google Play...</div>
          ) : error ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-amber-700 dark:text-amber-300">{error}</div>
          ) : (
            <div className="grid gap-3">
              {packages.map(pkg => {
                const active = selectedId === pkg.id;
                return (
                  <button key={pkg.id} onClick={() => setSelectedId(pkg.id)} className={`flex items-center gap-3 rounded-2xl border p-4 text-right transition ${active ? 'border-primary bg-primary/5 ring-2 ring-primary/10' : 'border-border bg-background hover:bg-muted/40'}`}>
                    <span className={`h-5 w-5 rounded-full border-2 ${active ? 'border-[6px] border-primary' : 'border-muted-foreground/30'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">{pkg.title || packageTypeLabel(pkg.packageType)}</p>
                      {pkg.pricePerMonthString && pkg.pricePerMonthString !== pkg.priceString && <p className="mt-1 text-[11px] text-muted-foreground">ما يعادل {pkg.pricePerMonthString} شهريًا</p>}
                    </div>
                    <div className="text-left"><p className="text-sm font-black text-foreground">{pkg.priceString}</p><p className="mt-1 text-[10px] text-muted-foreground">{packageTypeLabel(pkg.packageType)}</p></div>
                  </button>
                );
              })}
            </div>
          )}

          {!state.isPro && state.available && selected && (
            <button disabled={purchasing} onClick={purchase} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition active:scale-[0.99] disabled:opacity-60">
              {purchasing && <Loader2 size={17} className="animate-spin" />}
              الاشتراك في LifeOS Pro — {selected.priceString}
            </button>
          )}

          {state.available && (
            <button disabled={purchasing} onClick={restore} className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted disabled:opacity-50"><RefreshCw size={14} /> استعادة مشتريات سابقة</button>
          )}

          <p className="text-center text-[10px] leading-5 text-muted-foreground">يتم الدفع وإدارة الاشتراك من خلال Google Play. الأسعار الظاهرة تأتي مباشرة من المتجر.</p>
        </div>
      </div>
    </div>
  );
}

function packageTypeLabel(type: string) {
  const value = type.toLowerCase();
  if (value.includes('annual')) return 'سنوي';
  if (value.includes('monthly')) return 'شهري';
  if (value.includes('weekly')) return 'أسبوعي';
  if (value.includes('lifetime')) return 'مدى الحياة';
  return 'خطة Pro';
}
