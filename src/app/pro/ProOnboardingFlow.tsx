import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, Sparkles, Target, X } from 'lucide-react';
import {
  PERSONALIZATION_CHALLENGES,
  PERSONALIZATION_DAILY_TIME,
  PERSONALIZATION_ENERGY_PEAKS,
  PERSONALIZATION_FOCUS_AREAS,
  PERSONALIZATION_PLANNING_STYLES,
  emptyPersonalizationDraft,
  type LifeOSPersonalizationDraft,
  type LifeOSPersonalizationProfile,
} from './personalization-types.ts';

interface ProOnboardingFlowProps {
  open: boolean;
  showCelebration?: boolean;
  initialProfile?: LifeOSPersonalizationProfile | null;
  onSave: (draft: LifeOSPersonalizationDraft) => Promise<void>;
  onClose: () => void;
}

type Step = 'welcome' | 0 | 1 | 2 | 3 | 4 | 5 | 'result';

function profileDraft(profile?: LifeOSPersonalizationProfile | null): LifeOSPersonalizationDraft {
  if (!profile) return emptyPersonalizationDraft();
  return {
    focusAreas: [...profile.focusAreas],
    biggestChallenge: profile.biggestChallenge,
    planningStyle: profile.planningStyle,
    energyPeak: profile.energyPeak,
    primaryGoal: profile.primaryGoal,
    dailyTime: profile.dailyTime,
  };
}

export function ProOnboardingFlow({ open, showCelebration = false, initialProfile, onSave, onClose }: ProOnboardingFlowProps) {
  const [step, setStep] = useState<Step>(() => showCelebration ? 'welcome' : 0);
  const [draft, setDraft] = useState<LifeOSPersonalizationDraft>(() => profileDraft(initialProfile));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const completion = useMemo(() => typeof step === 'number' ? Math.round(((step + 1) / 6) * 100) : step === 'result' ? 100 : 0, [step]);
  if (!open) return null;

  function next() {
    if (step === 'welcome') { setStep(0); return; }
    if (typeof step === 'number') {
      if (!isStepValid(step, draft)) return;
      setStep(step === 5 ? 'result' : (step + 1) as Step);
    }
  }

  function back() {
    if (step === 'result') { setStep(5); return; }
    if (typeof step === 'number') {
      if (step === 0) {
        if (showCelebration) setStep('welcome');
        else onClose();
      } else setStep((step - 1) as Step);
    }
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      await onSave(draft);
    } catch (err: any) {
      setError(err?.message || 'ما قدرنا نحفظ إعدادك. جرّبي مرة ثانية.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4" dir="rtl">
      <div className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-[32px] border border-border bg-card shadow-2xl sm:rounded-[32px]">
        <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="lifeos-fast-close flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl bg-muted text-muted-foreground active:scale-95"><X size={17} /></button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-foreground">إعداد LifeOS الشخصي</p>
              {typeof step === 'number' && <p className="mt-0.5 text-[10px] text-muted-foreground">سؤال {step + 1} من 6</p>}
            </div>
            {typeof step === 'number' && <span className="text-[10px] font-bold text-primary">{completion}%</span>}
          </div>
          {typeof step === 'number' && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completion}%` }} /></div>}
        </div>

        <div className="p-5 sm:p-6">
          {step === 'welcome' && (
            <div className="py-5 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl shadow-amber-500/20"><Sparkles size={34} /></div>
              <h2 className="mt-6 text-2xl font-black text-foreground">✨ أهلًا بك في LifeOS Pro</h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-muted-foreground">من اليوم، LifeOS ما عاد مجرد قائمة مهام. صار عندك مساعد شخصي يساعدك تفهمي أهدافك وتنظمي يومك وتتحركي خطوة بخطوة.</p>
              <button onClick={next} className="mt-7 w-full rounded-2xl bg-primary px-4 py-4 text-sm font-black text-white shadow-lg shadow-primary/20">لنبدأ</button>
            </div>
          )}

          {step === 0 && <MultiQuestion title="ما أكثر شيء تريدين تحسينه حاليًا؟" options={PERSONALIZATION_FOCUS_AREAS} selected={draft.focusAreas} onChange={focusAreas => setDraft(current => ({ ...current, focusAreas }))} />}
          {step === 1 && <SingleQuestion title="ما أكبر مشكلة تواجهك في تنظيم حياتك؟" options={PERSONALIZATION_CHALLENGES} value={draft.biggestChallenge} onChange={biggestChallenge => setDraft(current => ({ ...current, biggestChallenge }))} />}
          {step === 2 && <SingleQuestion title="كيف تحبين أن تكون خطتك؟" options={PERSONALIZATION_PLANNING_STYLES} value={draft.planningStyle} onChange={planningStyle => setDraft(current => ({ ...current, planningStyle }))} />}
          {step === 3 && <SingleQuestion title="متى تكون طاقتك أفضل؟" options={PERSONALIZATION_ENERGY_PEAKS} value={draft.energyPeak} onChange={energyPeak => setDraft(current => ({ ...current, energyPeak }))} />}
          {step === 4 && (
            <div>
              <QuestionTitle title="ما أهم هدف تريدين العمل عليه الآن؟" />
              <div className="mt-5 rounded-3xl border border-border bg-background p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Target size={19} /></div>
                <textarea value={draft.primaryGoal} onChange={event => setDraft(current => ({ ...current, primaryGoal: event.target.value.slice(0, 500) }))} rows={4} placeholder="مثال: أوصل لمستوى B1 بالتركي خلال 4 أشهر" className="w-full resize-none bg-transparent text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground" />
              </div>
            </div>
          )}
          {step === 5 && <SingleQuestion title="كم من الوقت تستطيعين تخصيصه يوميًا؟" options={PERSONALIZATION_DAILY_TIME} value={draft.dailyTime} onChange={dailyTime => setDraft(current => ({ ...current, dailyTime }))} />}

          {step === 'result' && (
            <div className="py-3">
              <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles size={22} /></span><div><h2 className="text-xl font-black text-foreground">عرفت من وين نبدأ ✨</h2><p className="mt-1 text-xs text-muted-foreground">رح أبني اقتراحاتي على هالمعلومات.</p></div></div>
              <div className="mt-5 grid gap-2.5">
                <SummaryRow label="تركيزك الحالي" value={draft.focusAreas.join('، ')} />
                <SummaryRow label="أكبر تحدي" value={draft.biggestChallenge} />
                <SummaryRow label="أسلوب خطتك" value={draft.planningStyle} />
                <SummaryRow label="أفضل وقت لطاقةك" value={draft.energyPeak} />
                <SummaryRow label="هدفك الأساسي" value={draft.primaryGoal} />
                <SummaryRow label="وقتك اليومي" value={draft.dailyTime} />
              </div>
              <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/[0.04] p-3 text-[11px] leading-5 text-muted-foreground">LifeOS يستخدم هالمعلومات فقط لتخصيص اقتراحاتك داخل التطبيق، وبتقدري تعدلي إعدادك لاحقًا من حسابك.</div>
              {error && <p className="mt-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{error}</p>}
              <button disabled={saving} onClick={() => void save()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-sm font-black text-white disabled:opacity-50">{saving && <Loader2 size={17} className="animate-spin" />} ابدئي مع LifeOS</button>
            </div>
          )}

          {typeof step === 'number' && (
            <div className="mt-7 flex gap-3">
              <button onClick={back} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground"><ChevronRight size={18} /></button>
              <button disabled={!isStepValid(step, draft)} onClick={next} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white disabled:opacity-40">التالي <ChevronLeft size={17} /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function isStepValid(step: number, draft: LifeOSPersonalizationDraft): boolean {
  if (step === 0) return draft.focusAreas.length > 0;
  if (step === 1) return !!draft.biggestChallenge;
  if (step === 2) return !!draft.planningStyle;
  if (step === 3) return !!draft.energyPeak;
  if (step === 4) return draft.primaryGoal.trim().length > 1;
  if (step === 5) return !!draft.dailyTime;
  return false;
}

function QuestionTitle({ title }: { title: string }) {
  return <div><span className="text-[10px] font-black text-primary">حتى أصير أذكى معك</span><h3 className="mt-2 text-xl font-black leading-8 text-foreground">{title}</h3></div>;
}

function MultiQuestion({ title, options, selected, onChange }: { title: string; options: readonly string[]; selected: string[]; onChange: (next: string[]) => void }) {
  return <div><QuestionTitle title={title} /><p className="mt-1 text-xs text-muted-foreground">بتقدري تختاري أكثر من خيار.</p><div className="mt-5 grid grid-cols-2 gap-2.5">{options.map(option => { const active = selected.includes(option); return <button key={option} onClick={() => onChange(active ? selected.filter(item => item !== option) : [...selected, option])} className={`flex min-h-14 items-center justify-between gap-2 rounded-2xl border px-3 py-3 text-right text-xs font-bold transition ${active ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-foreground'}`}><span>{option}</span>{active && <Check size={15} />}</button>; })}</div></div>;
}

function SingleQuestion({ title, options, value, onChange }: { title: string; options: readonly string[]; value: string; onChange: (next: string) => void }) {
  return <div><QuestionTitle title={title} /><div className="mt-5 grid gap-2.5">{options.map(option => { const active = value === option; return <button key={option} onClick={() => onChange(option)} className={`flex min-h-13 items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-right text-sm font-bold transition ${active ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-foreground'}`}><span>{option}</span><span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${active ? 'border-primary bg-primary text-white' : 'border-muted-foreground/25'}`}>{active && <Check size={12} strokeWidth={3} />}</span></button>; })}</div></div>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-muted/55 px-4 py-3"><p className="text-[10px] font-bold text-muted-foreground">{label}</p><p className="mt-1 text-sm font-bold text-foreground">{value || '—'}</p></div>;
}
