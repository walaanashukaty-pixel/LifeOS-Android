import {
  Calendar,
  CalendarClock,
  CheckSquare,
  RefreshCw,
  Sparkles,
  Target,
  Zap,
  BarChart3,
  Moon,
} from 'lucide-react';
import type { ComponentType } from 'react';
import {
  buildPhase2Launch,
  buildP1Launch,
  isP1AgentMode,
  type AgentLaunchRequest,
  type StructuredAgentMode,
} from './phase2-modes';

type Tone = 'primary' | 'amber' | 'sky' | 'violet' | 'rose' | 'teal' | 'indigo';

const TONES: Record<Tone, { icon: string; badge: string }> = {
  primary: { icon: 'bg-primary/10 text-primary', badge: 'text-primary' },
  amber: { icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-300', badge: 'text-amber-600 dark:text-amber-300' },
  sky: { icon: 'bg-sky-500/10 text-sky-600 dark:text-sky-300', badge: 'text-sky-600 dark:text-sky-300' },
  violet: { icon: 'bg-violet-500/10 text-violet-600 dark:text-violet-300', badge: 'text-violet-600 dark:text-violet-300' },
  rose: { icon: 'bg-rose-500/10 text-rose-600 dark:text-rose-300', badge: 'text-rose-600 dark:text-rose-300' },
  teal: { icon: 'bg-teal-500/10 text-teal-600 dark:text-teal-300', badge: 'text-teal-600 dark:text-teal-300' },
  indigo: { icon: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300', badge: 'text-indigo-600 dark:text-indigo-300' },
};

const FEATURES: Array<{
  mode: StructuredAgentMode;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  tone: Tone;
  home: boolean;
}> = [
  { mode: 'day_plan', label: 'رتبلي يومي', description: 'خطة فعلية من مهامك وعاداتك ومواعيدك الحالية.', icon: CalendarClock, tone: 'primary', home: true },
  { mode: 'what_now', label: 'شو أعمل هلا؟', description: 'أفضل خطوة الآن مع سبب واضح من بياناتك الحقيقية.', icon: Zap, tone: 'amber', home: true },
  { mode: 'smart_add', label: 'أضف بالذكاء', description: 'احكي بطبيعتك؛ LifeOS يميّز مهمة، عادة، موعد أو هدف.', icon: CheckSquare, tone: 'sky', home: true },
  { mode: 'reschedule', label: 'عدّل جدولي', description: 'حل التعارضات وتأجيل المتأخر مع مقارنة قبل/بعد.', icon: RefreshCw, tone: 'violet', home: true },
  { mode: 'goal_plan', label: 'خطط لهدفي', description: 'يبني خطة حول هدف موجود أو هدف جديد بدون تكرار.', icon: Target, tone: 'rose', home: false },
  { mode: 'morning_brief', label: 'ملخص يومي', description: 'التزاماتك وأولوياتك والمخاطر وتوصية عملية واحدة.', icon: Calendar, tone: 'teal', home: false },
  { mode: 'weekly_review', label: 'مراجعة أسبوعية', description: 'ما نجح، ما تعثر، والنمط الحقيقي من سجل إنجازك.', icon: BarChart3, tone: 'indigo', home: false },
];

export function ProAIHomeSection({
  onLaunch,
  compact = false,
  onDailyReview,
}: {
  onLaunch: (launch: AgentLaunchRequest) => void;
  compact?: boolean;
  onDailyReview?: () => void;
}) {
  const visible = compact ? FEATURES.filter(feature => feature.home) : FEATURES;

  return (
    <section className="overflow-hidden rounded-[26px] border border-border bg-card shadow-sm">
      <div className="flex items-start gap-3 border-b border-border/70 p-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black text-foreground">LifeOS Intelligence</h2>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-black text-amber-600 dark:text-amber-300">PRO</span>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">مساعد واحد يفهم حياتك؛ هاي اختصارات لقدراته، مو أدوات منفصلة.</p>
        </div>
      </div>

      <div className={`grid grid-cols-2 ${compact ? 'gap-2 p-3' : 'gap-3 p-4'}`}>
        {visible.map(feature => {
          const Icon = feature.icon;
          const tone = TONES[feature.tone];
          return (
            <button
              key={feature.mode}
              onClick={() => onLaunch(isP1AgentMode(feature.mode) ? buildP1Launch(feature.mode) : buildPhase2Launch(feature.mode))}
              className={`group rounded-2xl border border-border bg-background/55 text-right transition hover:bg-muted/60 active:scale-[0.985] ${compact ? 'p-3' : 'min-h-[112px] p-3.5'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone.icon}`}><Icon size={17} /></span>
                <span className={`mt-1 text-[9px] font-black ${tone.badge}`}>AI</span>
              </div>
              <p className="mt-2.5 text-xs font-black text-foreground">{feature.label}</p>
              {!compact && <p className="mt-1 text-[10px] leading-5 text-muted-foreground">{feature.description}</p>}
            </button>
          );
        })}

        {!compact && onDailyReview && (
          <button onClick={onDailyReview} className="group min-h-[112px] rounded-2xl border border-border bg-background/55 p-3.5 text-right transition hover:bg-muted/60 active:scale-[0.985]">
            <div className="flex items-start justify-between gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-300"><Moon size={17} /></span><span className="mt-1 text-[9px] font-black text-muted-foreground">PRO</span></div>
            <p className="mt-2.5 text-xs font-black text-foreground">مراجعة اليوم</p>
            <p className="mt-1 text-[10px] leading-5 text-muted-foreground">دقيقة لتسجيل كيف كان يومك وتحسين اقتراحات LifeOS.</p>
          </button>
        )}
      </div>
    </section>
  );
}
