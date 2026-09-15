import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { api } from '../../utils/api';
import { toast } from 'sonner';
import { Compass, Eye, Save, Sparkles, Star } from 'lucide-react';
import { ErrorState, LoadingPage, PageHero, SectionHeading, SummaryCard } from './ui/LifeOSPrimitives';

const EMPTY_VISION = { oneYear: '', fiveYears: '', tenYears: '', notes: '' };
const VISIONS = [
  { key: 'oneYear', label: 'بعد سنة', eyebrow: 'الخطوة الأقرب', emoji: '🌱', description: 'ما النتيجة التي تريد أن تراها في حياتك خلال 12 شهرًا؟', prompt: 'صف حياتك بعد سنة: عملك، صحتك، علاقاتك، تعلمك وما الذي تغيّر فعليًا.' },
  { key: 'fiveYears', label: 'بعد 5 سنوات', eyebrow: 'المسار', emoji: '🚀', description: 'ما الصورة الأكبر التي تعمل باتجاهها؟', prompt: 'تخيل يومًا عاديًا من حياتك بعد 5 سنوات: أين أنت؟ ماذا تعمل؟ كيف يبدو إيقاع يومك؟' },
  { key: 'tenYears', label: 'بعد 10 سنوات', eyebrow: 'الأثر', emoji: '🌟', description: 'أي حياة وأثر تريد أن تكون بنيتهما؟', prompt: 'اكتب عن الأثر، الاستقرار، الخبرة والعلاقات التي تريد أن تكون جزءًا ثابتًا من حياتك.' },
] as const;

export function FutureVisionPage() {
  const reduceMotion = useReducedMotion();
  const [data, setData] = useState<any>(EMPTY_VISION);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    api('/future').then(d => {
      setData(d || EMPTY_VISION);
      setDirty(false);
    }).catch(() => setError(true)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      const updated = await api('/future', { method: 'PUT', body: JSON.stringify(data) });
      setData(updated);
      setDirty(false);
      toast.success('تم حفظ رؤيتك المستقبلية');
    } catch { toast.error('فشل الحفظ'); }
    finally { setSaving(false); }
  }

  const filledHorizons = useMemo(() => VISIONS.filter(v => String(data?.[v.key] || '').trim().length > 0).length, [data]);
  const writtenWords = useMemo(() => VISIONS.reduce((sum, v) => sum + String(data?.[v.key] || '').trim().split(/\s+/).filter(Boolean).length, 0), [data]);
  const clarity = Math.round((filledHorizons / VISIONS.length) * 100);

  const update = (key: string, value: string) => {
    setData((current: any) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  if (loading) return <LoadingPage label="نجهّز مساحة رؤيتك المستقبلية" />;
  if (error) return <ErrorState title="تعذر تحميل رؤيتك" onRetry={load} />;

  return (
    <div className="lifeos-page-shell max-w-4xl space-y-5">
      <PageHero
        eyebrow="VISION COMPASS"
        title="رؤية المستقبل"
        description="حوّل الصورة البعيدة إلى بوصلة تساعدك تعرف لماذا تعمل على أهدافك اليوم."
        icon={<Eye size={20} />}
        meta={<div className="lifeos-v3-hero-meta"><span className="lifeos-chip">{filledHorizons}/3 آفاق مكتوبة</span><span className="lifeos-chip">وضوح {clarity}%</span><span className="lifeos-chip">{writtenWords} كلمة</span></div>}
        actions={<button onClick={save} disabled={saving || !dirty} className="lifeos-primary-action disabled:opacity-50" aria-busy={saving}>{saving ? 'جارٍ الحفظ…' : <><Save size={16} /> حفظ الرؤية</>}</button>}
      />

      <div className="lifeos-v3-summary-grid">
        <SummaryCard value={`${clarity}%`} label="اكتمال البوصلة" helper="كل أفق مكتوب يجعل قراراتك اليومية أوضح" />
        <SummaryCard value={filledHorizons} label="آفاق واضحة" helper="سنة · خمس سنوات · عشر سنوات" />
        <SummaryCard value={writtenWords} label="كلمة في الرؤية" helper="الوضوح أهم من طول النص" />
        <SummaryCard value={data.updatedAt ? new Date(data.updatedAt).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }) : '—'} label="آخر تحديث" helper={dirty ? 'لديك تغييرات غير محفوظة' : 'الرؤية محفوظة'} />
      </div>

      <div className="lifeos-v4-vision-compass">
        <div className="lifeos-v4-compass-icon"><Compass size={20} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-foreground">اكتب ما تريد أن تعيشه، لا ما يبدو جيدًا على الورق.</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">ابدأ بالصورة التي تريد الوصول إليها، وبعدها خَلّي أهدافك ومهامك وعاداتك تخدم هذه الصورة.</p>
        </div>
        <Star size={18} className="flex-shrink-0 text-amber-500" />
      </div>

      <section>
        <SectionHeading title="خط الزمن الشخصي" description="ثلاث مسافات زمنية، لكن قصة واحدة مترابطة." />
        <div className="lifeos-v4-vision-timeline">
          {VISIONS.map((vision, index) => {
            const text = String(data?.[vision.key] || '');
            const completed = text.trim().length > 0;
            return (
              <motion.article
                key={vision.key}
                className="lifeos-v4-vision-card"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : index * 0.06 }}
              >
                <div className="lifeos-v4-vision-card-head">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">{vision.emoji}</span>
                    <div>
                      <p className="lifeos-eyebrow">{vision.eyebrow}</p>
                      <h3 className="text-sm font-black text-foreground">{vision.label}</h3>
                    </div>
                  </div>
                  <span className={`lifeos-v4-completion-dot ${completed ? 'is-complete' : ''}`} aria-label={completed ? 'مكتوبة' : 'غير مكتوبة'} />
                </div>
                <p className="mb-3 text-xs leading-5 text-muted-foreground">{vision.description}</p>
                <label className="sr-only" htmlFor={`vision-${vision.key}`}>{vision.label}</label>
                <textarea
                  id={`vision-${vision.key}`}
                  value={text}
                  onChange={e => update(vision.key, e.target.value)}
                  rows={5}
                  placeholder={vision.prompt}
                  className="lifeos-v4-vision-textarea"
                />
                <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                  <span>{text.trim() ? `${text.trim().split(/\s+/).filter(Boolean).length} كلمة` : 'ابدأ بجملة واحدة'}</span>
                  <span>{completed ? 'محدد' : 'بحاجة لصورة أوضح'}</span>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="lifeos-v3-content-panel">
        <div className="lifeos-v3-panel-header">
          <div><h3>ملاحظات خارج الخط الزمني</h3><p>أفكار، مبادئ أو أشياء لا تريد أن تنساها أثناء البناء.</p></div>
          <Sparkles size={17} className="text-primary" />
        </div>
        <div className="p-4">
          <label className="sr-only" htmlFor="vision-notes">ملاحظات وأفكار إضافية</label>
          <textarea id="vision-notes" value={data.notes || ''} onChange={e => update('notes', e.target.value)} rows={4} placeholder="ما المبادئ أو الحدود أو الأفكار التي يجب أن تبقى حاضرة وأنت تتقدم؟" className="lifeos-v4-vision-textarea" />
        </div>
      </section>

      <div className="lifeos-v4-sticky-save" aria-live="polite">
        <div><p className="text-xs font-black text-foreground">{dirty ? 'لديك تغييرات غير محفوظة' : 'كل شيء محفوظ'}</p><p className="text-[10px] text-muted-foreground">{dirty ? 'احفظ البوصلة قبل مغادرة الصفحة.' : 'يمكنك العودة وتعديل الرؤية بأي وقت.'}</p></div>
        <button onClick={save} disabled={saving || !dirty} className="lifeos-primary-action disabled:opacity-50">{saving ? 'جارٍ الحفظ…' : <><Save size={15} /> حفظ</>}</button>
      </div>
    </div>
  );
}
