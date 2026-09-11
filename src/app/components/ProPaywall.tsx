import { useEffect, useMemo, useState } from 'react';
import { Bot, Check, Crown, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  getSubscriptionPackages,
  purchaseSubscriptionPackage,
  restoreSubscriptionPurchases,
  type LifeOSSubscriptionPackage,
} from '../../utils/subscriptions';
import type { SubscriptionState } from '../../utils/subscription-model';
import { PRO_FEATURES } from '../agent/pro-features';

interface ProPaywallProps {
  open: boolean;
  state: SubscriptionState;
  onClose: () => void;
  onStateChange: (state: SubscriptionState) => void;
  previewAllowed?: boolean;
  onPreview?: () => void;
  onProActivated?: () => void;
}

const PRIMARY_FEATURE_IDS = ['lifeos-personal', 'plan-my-day', 'goal-to-plan', 'lifeos-ai', 'proactive-help', 'smart-review', 'what-now'] as const;

export function ProPaywall({ open, state, onClose, onStateChange, previewAllowed = false, onPreview, onProActivated }: ProPaywallProps) {
  const [packages, setPackages] = useState<LifeOSSubscriptionPackage[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');
  const [differenceOpen, setDifferenceOpen] = useState(true);

  useEffect(() => {
    if (!open || !state.available || state.isPro) return;
    let active = true;
    setLoading(true);
    setError('');
    getSubscriptionPackages()
      .then(items => {
        if (!active) return;
        setPackages(items);
        const annual = items.find(isAnnualPackage);
        setSelectedId((annual || items[0])?.id || '');
        if (!items.length) setError('باقات Pro غير متاحة حاليًا.');
      })
      .catch(() => active && setError('ما قدرنا نحمّل باقات Pro حاليًا. جرّبي مرة ثانية.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [open, state.available, state.isPro]);

  const selected = useMemo(() => packages.find(item => item.id === selectedId) || null, [packages, selectedId]);
  const primaryFeatures = useMemo(() => PRIMARY_FEATURE_IDS.map(id => PRO_FEATURES.find(feature => feature.id === id)).filter(Boolean), []);
  if (!open) return null;

  async function purchase() {
    if (!selected || purchasing) return;
    setPurchasing(true);
    try {
      const next = await purchaseSubscriptionPackage(selected);
      onStateChange(next);
      if (next.isPro) {
        onClose();
        onProActivated?.();
      }
    } catch (err: any) {
      if (err?.message !== 'تم إلغاء عملية الشراء.') {
        toast.error('لم نتمكن من إتمام الاشتراك. يمكنك المحاولة مرة أخرى.');
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function restore() {
    if (purchasing) return;
    setPurchasing(true);
    try {
      const next = await restoreSubscriptionPurchases();
      onStateChange(next);
      toast.success(next.isPro ? '✨ تم استعادة LifeOS Pro' : 'لم نجد اشتراك Pro نشطًا لهذا الحساب.');
      if (next.isPro) {
        onClose();
        onProActivated?.();
      }
    } catch {
      toast.error('ما قدرنا نستعيد المشتريات حاليًا.');
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" dir="rtl">
      <div className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-[32px] border border-border bg-card shadow-2xl sm:rounded-[32px]">
        <div className="relative overflow-hidden border-b border-border p-6 pb-5">
          <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="absolute -right-12 top-10 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
          <button onClick={onClose} aria-label="إغلاق" className="lifeos-fast-close absolute left-3 top-3 flex h-11 w-11 touch-manipulation items-center justify-center rounded-2xl bg-muted text-muted-foreground transition hover:text-foreground active:scale-95"><X size={18} /></button>
          <div className="relative pr-1">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/20"><Crown size={26} /></div>
            <div className="flex items-center gap-2"><h2 className="text-2xl font-black text-foreground">✨ LifeOS Pro</h2></div>
            <p className="mt-2 text-base font-black leading-7 text-foreground">مو بس تنظّمي حياتك... خلي LifeOS يساعدك تعيشيها.</p>
            <p className="mt-2 max-w-md text-xs leading-6 text-muted-foreground">LifeOS Pro يفهم أهدافك، مهامك، عاداتك ومواعيدك، ويساعدك تحولي خططك إلى خطوات حقيقية قابلة للتنفيذ.</p>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <section>
            <div className="mb-3 flex items-center gap-2"><Bot size={18} className="text-primary" /><h3 className="text-sm font-black text-foreground">شو بيتغيّر مع Pro؟</h3></div>
            <div className="grid gap-2.5">
              {primaryFeatures.map(feature => feature && (
                <div key={feature.id} className="flex items-start gap-3 rounded-2xl border border-border bg-muted/35 px-3.5 py-3">
                  <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Check size={15} strokeWidth={3} /></span>
                  <div className="min-w-0"><p className="text-sm font-bold text-foreground">{feature.title}</p><p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{feature.description}</p></div>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-primary/20 bg-primary/[0.035]">
            <button onClick={() => setDifferenceOpen(value => !value)} className="flex w-full items-center justify-between gap-3 px-4 py-4 text-right">
              <div><p className="text-sm font-black text-foreground">شوفي الفرق</p><p className="mt-1 text-[11px] text-muted-foreground">نفس الهدف، بس Pro يحوله لخطة تتحرك.</p></div>
              <Sparkles size={18} className="text-primary" />
            </button>
            {differenceOpen && (
              <div className="border-t border-primary/10 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-card p-3.5"><p className="text-[10px] font-black text-muted-foreground">Free</p><p className="mt-2 text-sm font-bold text-foreground">لدي هدف: تعلم اللغة التركية.</p><p className="mt-2 text-[11px] leading-5 text-muted-foreground">بتضيفي الهدف وبتنظمي خطواته بنفسك.</p></div>
                  <div className="rounded-2xl border border-primary/20 bg-card p-3.5"><p className="text-[10px] font-black text-primary">Pro ✨</p><p className="mt-2 text-sm font-bold text-foreground">بدي أوصل لمستوى B1 بالتركي خلال 4 أشهر.</p><div className="mt-3 space-y-2 text-[11px] leading-5 text-muted-foreground"><p><strong className="text-foreground">هدف:</strong> الوصول إلى B1</p><p><strong className="text-foreground">عادات:</strong> 20 دقيقة مفردات يوميًا · استماع 3 مرات أسبوعيًا</p><p><strong className="text-foreground">مهام:</strong> إنهاء الوحدة الحالية · مراجعة 100 كلمة · كتابة فقرة</p><p><strong className="text-foreground">مراجعة:</strong> كل أحد</p></div></div>
                </div>
                <button type="button" className="mt-3 w-full rounded-2xl border border-primary/20 bg-card px-4 py-3 text-xs font-black text-primary">هكذا يعمل LifeOS Pro ✨</button>
              </div>
            )}
          </section>

          <section>
            <div className="mb-3"><p className="text-sm font-black text-foreground">اختاري الخطة</p><p className="mt-1 text-[11px] text-muted-foreground">الأسعار الجاية مباشرة من Google Play.</p></div>
            {state.isPro ? (
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center"><Crown className="mx-auto mb-2 text-amber-500" size={28} /><p className="font-bold text-foreground">اشتراك Pro فعّال</p><p className="mt-1 text-xs text-muted-foreground">ميزات Pro مرتبطة بحساب LifeOS الحالي.</p></div>
            ) : !state.available ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-amber-700 dark:text-amber-300">{state.error || 'نظام الاشتراك غير مهيأ على هذه النسخة بعد.'}</div>
            ) : loading ? (
              <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" /> جاري تحميل الأسعار من Google Play...</div>
            ) : error ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-amber-700 dark:text-amber-300">{error}</div>
            ) : (
              <div className="grid gap-3">
                {packages.map(pkg => {
                  const active = selectedId === pkg.id;
                  const annual = isAnnualPackage(pkg);
                  return (
                    <button key={pkg.id} onClick={() => setSelectedId(pkg.id)} className={`relative flex items-center gap-3 rounded-2xl border p-4 text-right transition ${active ? 'border-primary bg-primary/5 ring-2 ring-primary/10' : 'border-border bg-background hover:bg-muted/40'}`}>
                      {annual && <span className="absolute -top-2.5 left-4 rounded-full bg-amber-500 px-2.5 py-1 text-[9px] font-black text-white shadow-sm">الأفضل قيمة ✨</span>}
                      <span className={`h-5 w-5 rounded-full border-2 ${active ? 'border-[6px] border-primary' : 'border-muted-foreground/30'}`} />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-foreground">{pkg.title || packageTypeLabel(pkg.packageType)}</p>{pkg.pricePerMonthString && pkg.pricePerMonthString !== pkg.priceString && <p className="mt-1 text-[11px] text-muted-foreground">ما يعادل {pkg.pricePerMonthString} شهريًا</p>}</div>
                      <div className="text-left"><p className="text-sm font-black text-foreground">{pkg.priceString}</p><p className="mt-1 text-[10px] text-muted-foreground">{packageTypeLabel(pkg.packageType)}</p></div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {!state.isPro && state.available && selected && (
            <button disabled={purchasing} onClick={purchase} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-sm font-black text-white shadow-lg shadow-primary/20 transition active:scale-[0.99] disabled:opacity-60">{purchasing && <Loader2 size={17} className="animate-spin" />}{purchasing ? 'جارٍ إتمام اشتراكك...' : `اشتركي في LifeOS Pro — ${selected.priceString}`}</button>
          )}

          {previewAllowed && !state.isPro && onPreview && (
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-3">
              <button onClick={onPreview} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-card px-4 py-3.5 text-sm font-bold text-primary shadow-sm transition active:scale-[0.99]"><Sparkles size={16} /> معاينة LifeOS Pro</button>
              <p className="mt-2 text-center text-[10px] leading-5 text-muted-foreground">نسخة اختبار للواجهة فقط: ما بتفعّل اشتراك حقيقي، وما بتنشئ ردود أو إجراءات AI وهمية. الذكاء الحقيقي وقراءة بياناتك يحتاجان اشتراك Pro فعّال.</p>
            </div>
          )}

          {state.available && <button disabled={purchasing} onClick={restore} className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted disabled:opacity-50"><RefreshCw size={14} /> استعادة المشتريات</button>}
          <p className="text-center text-[10px] leading-5 text-muted-foreground">يتم الدفع وإدارة الاشتراك من خلال Google Play. الأسعار الظاهرة تأتي مباشرة من المتجر.</p>
        </div>
      </div>
    </div>
  );
}

function isAnnualPackage(pkg: LifeOSSubscriptionPackage): boolean {
  const value = `${pkg.packageType} ${pkg.id} ${pkg.title}`.toLowerCase();
  return value.includes('annual') || value.includes('year') || value.includes('سنوي');
}

function packageTypeLabel(type: string) {
  const value = type.toLowerCase();
  if (value.includes('annual') || value.includes('year')) return 'سنوي';
  if (value.includes('monthly') || value.includes('month')) return 'شهري';
  if (value.includes('weekly')) return 'أسبوعي';
  if (value.includes('lifetime')) return 'مدى الحياة';
  return 'خطة Pro';
}
