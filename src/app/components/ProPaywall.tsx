import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Bot, Check, Crown, Loader2, RefreshCw, ShieldCheck, Sparkles, WandSparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  getSubscriptionPackages,
  purchaseSubscriptionPackage,
  restoreSubscriptionPurchases,
  type LifeOSSubscriptionPackage,
} from '../../utils/subscriptions';
import type { SubscriptionState } from '../../utils/subscription-model';
import { PRO_FEATURES } from '../agent/pro-features';
import { useAndroidBackHandler } from './ui/useAndroidBackHandler';

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
  const reduceMotion = useReducedMotion();
  const [packages, setPackages] = useState<LifeOSSubscriptionPackage[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');
  const [differenceOpen, setDifferenceOpen] = useState(true);
  useAndroidBackHandler(open && !purchasing, onClose);

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

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  const selected = useMemo(() => packages.find(item => item.id === selectedId) || null, [packages, selectedId]);
  const primaryFeatures = useMemo(() => PRIMARY_FEATURE_IDS.map(id => PRO_FEATURES.find(feature => feature.id === id)).filter(Boolean), []);

  async function purchase() {
    if (!selected || purchasing) return;
    setPurchasing(true);
    try {
      const next = await purchaseSubscriptionPackage(selected);
      onStateChange(next);
      if (next.isPro) { onClose(); onProActivated?.(); }
    } catch (err: any) {
      if (err?.message !== 'تم إلغاء عملية الشراء.') toast.error('لم نتمكن من إتمام الاشتراك. يمكنك المحاولة مرة أخرى.');
    } finally { setPurchasing(false); }
  }

  async function restore() {
    if (purchasing) return;
    setPurchasing(true);
    try {
      const next = await restoreSubscriptionPurchases();
      onStateChange(next);
      toast.success(next.isPro ? '✨ تم استعادة LifeOS Pro' : 'لم نجد اشتراك Pro نشطًا لهذا الحساب.');
      if (next.isPro) { onClose(); onProActivated?.(); }
    } catch { toast.error('ما قدرنا نستعيد المشتريات حاليًا.'); }
    finally { setPurchasing(false); }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[220] lifeos-v4-paywall-backdrop"
          dir="rtl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
        >
          <motion.button aria-label="إغلاق نافذة LifeOS Pro" className="absolute inset-0" onClick={onClose} />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="lifeos-pro-title"
            className="lifeos-v4-paywall"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 52, scale: .985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 42, scale: .985 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36, mass: .82 }}
          >
            <header className="lifeos-v4-paywall-hero">
              <div className="lifeos-v4-paywall-glow" aria-hidden="true" />
              <button onClick={onClose} aria-label="إغلاق" className="lifeos-fast-close lifeos-v4-paywall-close"><X size={18} /></button>
              <div className="lifeos-v4-paywall-crown"><Crown size={25} /></div>
              <p className="lifeos-eyebrow">LIFEOS INTELLIGENCE</p>
              <h2 id="lifeos-pro-title" className="text-2xl font-black text-foreground">✨ LifeOS Pro</h2>
              <p className="mt-2 text-base font-black leading-7 text-foreground">مو بس تنظّمي حياتك... خلي LifeOS يساعدك تعيشيها.</p>
              <p className="mt-2 max-w-md text-xs leading-6 text-muted-foreground">LifeOS Pro يفهم أهدافك، مهامك، عاداتك ومواعيدك، ويساعدك تحولي خططك إلى خطوات حقيقية قابلة للتنفيذ.</p>
              <div className="lifeos-v4-pro-trust-row"><span><ShieldCheck size={13} /> موافقتك أولًا قبل التنفيذ</span><span><Sparkles size={13} /> ذكاء مرتبط بسياق LifeOS</span></div>
            </header>

            <div className="space-y-6 p-5 pb-28 sm:p-6 sm:pb-6">
              <section>
                <div className="mb-3 flex items-center gap-2"><Bot size={18} className="text-primary" /><div><h3 className="text-sm font-black text-foreground">شو بيتغيّر مع Pro؟</h3><p className="mt-0.5 text-[10px] text-muted-foreground">من تنظيم يدوي إلى نظام يساعدك يقترح ويرتب ويذكّر.</p></div></div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {primaryFeatures.map((feature, index) => feature && (
                    <motion.div key={feature.id} className="lifeos-v4-pro-feature" initial={reduceMotion ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : Math.min(index * .035, .18) }}>
                      <span><Check size={14} strokeWidth={3} /></span>
                      <div className="min-w-0"><p className="text-xs font-black text-foreground">{feature.title}</p><p className="mt-0.5 text-[10px] leading-5 text-muted-foreground">{feature.description}</p></div>
                    </motion.div>
                  ))}
                </div>
              </section>

              <section className="lifeos-v4-pro-difference">
                <button type="button" aria-expanded={differenceOpen} onClick={() => setDifferenceOpen(value => !value)} className="flex w-full items-center justify-between gap-3 px-4 py-4 text-right">
                  <div><p className="text-sm font-black text-foreground">شوفي الفرق</p><p className="mt-1 text-[11px] text-muted-foreground">نفس الهدف، بس Pro يحوله لخطة تتحرك.</p></div><WandSparkles size={18} className="text-primary" />
                </button>
                <AnimatePresence initial={false}>{differenceOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="border-t border-primary/10 p-4"><div className="grid gap-3 sm:grid-cols-2"><div className="lifeos-v4-free-pro-card"><p className="text-[10px] font-black text-muted-foreground">Free</p><p className="mt-2 text-sm font-bold text-foreground">لدي هدف: تعلم اللغة التركية.</p><p className="mt-2 text-[11px] leading-5 text-muted-foreground">بتضيفي الهدف وبتنظمي خطواته بنفسك.</p></div><div className="lifeos-v4-free-pro-card is-pro"><p className="text-[10px] font-black text-primary">Pro ✨</p><p className="mt-2 text-sm font-bold text-foreground">بدي أوصل لمستوى B1 بالتركي خلال 4 أشهر.</p><div className="mt-3 space-y-2 text-[11px] leading-5 text-muted-foreground"><p><strong className="text-foreground">هدف:</strong> الوصول إلى B1</p><p><strong className="text-foreground">عادات:</strong> 20 دقيقة مفردات يوميًا · استماع 3 مرات أسبوعيًا</p><p><strong className="text-foreground">مهام:</strong> إنهاء الوحدة الحالية · مراجعة 100 كلمة · كتابة فقرة</p><p><strong className="text-foreground">مراجعة:</strong> كل أحد</p></div></div></div><button type="button" className="mt-3 w-full rounded-2xl border border-primary/20 bg-card px-4 py-3 text-xs font-black text-primary">هكذا يعمل LifeOS Pro ✨</button></div></motion.div>}</AnimatePresence>
              </section>

              <section aria-labelledby="pro-plans-title">
                <div className="mb-3"><p id="pro-plans-title" className="text-sm font-black text-foreground">اختاري الخطة</p><p className="mt-1 text-[11px] text-muted-foreground">الأسعار الجاية مباشرة من Google Play، وما منخترع سعر داخل التطبيق.</p></div>
                {state.isPro ? (
                  <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center"><Crown className="mx-auto mb-2 text-amber-500" size={28} /><p className="font-bold text-foreground">اشتراك Pro فعّال</p><p className="mt-1 text-xs text-muted-foreground">ميزات Pro مرتبطة بحساب LifeOS الحالي.</p></div>
                ) : !state.available ? (
                  <div role="status" className="lifeos-v4-paywall-message is-warning">{state.error || 'نظام الاشتراك غير مهيأ على هذه النسخة بعد.'}</div>
                ) : loading ? (
                  <div role="status" className="flex min-h-28 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" /> جاري تحميل الأسعار من Google Play...</div>
                ) : error ? (
                  <div role="alert" className="lifeos-v4-paywall-message is-warning">{error}</div>
                ) : (
                  <div className="grid gap-3" role="radiogroup" aria-label="باقات LifeOS Pro">
                    {packages.map(pkg => {
                      const active = selectedId === pkg.id;
                      const annual = isAnnualPackage(pkg);
                      return <button key={pkg.id} role="radio" aria-checked={active} onClick={() => setSelectedId(pkg.id)} className={`lifeos-v4-plan-card ${active ? 'is-active' : ''}`}>{annual && <span className="lifeos-v4-best-value">الأفضل قيمة ✨</span>}<span className="lifeos-v4-plan-radio" data-active={active} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-foreground">{pkg.title || packageTypeLabel(pkg.packageType)}</p>{pkg.pricePerMonthString && pkg.pricePerMonthString !== pkg.priceString && <p className="mt-1 text-[11px] text-muted-foreground">ما يعادل {pkg.pricePerMonthString} شهريًا</p>}</div><div className="text-left"><p className="text-sm font-black text-foreground">{pkg.priceString}</p><p className="mt-1 text-[10px] text-muted-foreground">{packageTypeLabel(pkg.packageType)}</p></div></button>;
                    })}
                  </div>
                )}
              </section>

              {previewAllowed && !state.isPro && onPreview && <div className="lifeos-v4-preview-card"><button onClick={onPreview} className="lifeos-secondary-action w-full"><Sparkles size={16} /> معاينة LifeOS Pro</button><p className="mt-2 text-center text-[10px] leading-5 text-muted-foreground">نسخة اختبار للواجهة فقط: ما بتفعّل اشتراك حقيقي، وما بتنشئ ردود أو إجراءات AI وهمية. الذكاء الحقيقي وقراءة بياناتك يحتاجان اشتراك Pro فعّال.</p></div>}
              {state.available && <button disabled={purchasing} onClick={restore} className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted disabled:opacity-50"><RefreshCw size={14} /> استعادة المشتريات</button>}
              <p className="text-center text-[10px] leading-5 text-muted-foreground">يتم الدفع وإدارة الاشتراك من خلال Google Play. الأسعار الظاهرة تأتي مباشرة من المتجر.</p>
            </div>

            {!state.isPro && state.available && selected && <div className="lifeos-v4-paywall-checkout"><div className="min-w-0"><p className="text-[10px] font-bold text-muted-foreground">الخطة المختارة</p><p className="truncate text-sm font-black text-foreground">{selected.title || packageTypeLabel(selected.packageType)} · {selected.priceString}</p></div><button disabled={purchasing} onClick={purchase} className="lifeos-primary-action flex-shrink-0">{purchasing && <Loader2 size={16} className="animate-spin" />}{purchasing ? 'جارٍ الاشتراك…' : `اشتركي في LifeOS Pro — ${selected.priceString}`}</button></div>}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
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
