import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

export function PageHero({ eyebrow, title, description, icon, actions, meta, className = '' }: PageHeroProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      className={`lifeos-page-hero ${className}`}
      initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.992 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="lifeos-page-hero-glow" aria-hidden="true" />
      <div className="relative z-10 flex min-w-0 flex-1 items-start gap-3.5">
        {icon && <div className="lifeos-page-hero-icon">{icon}</div>}
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="lifeos-eyebrow">{eyebrow}</p>}
          <h1 className="lifeos-page-title">{title}</h1>
          {description && <p className="lifeos-page-subtitle">{description}</p>}
          {meta && <div className="mt-3">{meta}</div>}
        </div>
      </div>
      {actions && <div className="relative z-10 flex flex-shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
    </motion.section>
  );
}

interface MetricTileProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  iconClassName?: string;
  helper?: ReactNode;
  progress?: number;
  className?: string;
}

export function MetricTile({ label, value, icon, iconClassName = '', helper, progress, className = '' }: MetricTileProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div whileHover={reduceMotion ? undefined : { y: -2 }} className={`lifeos-metric-tile ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="lifeos-metric-label">{label}</p>
          <p className="lifeos-metric-value">{value}</p>
          {helper && <div className="mt-1 text-[11px] leading-5 text-muted-foreground">{helper}</div>}
        </div>
        <div className={`lifeos-metric-icon ${iconClassName}`}>{icon}</div>
      </div>
      {typeof progress === 'number' && (
        <div className="lifeos-progress-track mt-3">
          <motion.div
            className="lifeos-progress-fill"
            initial={reduceMotion ? false : { width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            transition={{ duration: reduceMotion ? 0.12 : 0.65, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      )}
    </motion.div>
  );
}

export function SectionHeading({ title, description, trailing }: { title: string; description?: string; trailing?: ReactNode }) {
  return (
    <div className="lifeos-section-heading">
      <div className="min-w-0">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {trailing}
    </div>
  );
}


export function LoadingPage({ label = 'جارٍ التحميل' }: { label?: string }) {
  return (
    <div className="lifeos-v3-loading" role="status" aria-live="polite">
      <div className="lifeos-v3-loading-shell">
        <div className="flex items-center gap-3">
          <div className="lifeos-v3-skeleton h-11 w-11 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <div className="lifeos-v3-skeleton h-4 w-32" />
            <div className="lifeos-v3-skeleton h-3 w-52 max-w-full" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="lifeos-v3-skeleton h-20" />
          <div className="lifeos-v3-skeleton h-20" />
          <div className="lifeos-v3-skeleton h-20" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="lifeos-v3-skeleton h-12" />
          <div className="lifeos-v3-skeleton h-12" />
          <div className="lifeos-v3-skeleton h-12" />
        </div>
        <p className="mt-4 text-center text-xs font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function SummaryCard({ value, label, helper }: { value: ReactNode; label: string; helper?: ReactNode }) {
  return (
    <div className="lifeos-v3-summary-card">
      <strong>{value}</strong>
      <span>{label}</span>
      {helper && <div className="mt-1 text-[10px] leading-4 text-muted-foreground">{helper}</div>}
    </div>
  );
}


export function ErrorState({
  title = 'تعذر تحميل هذه المساحة',
  description = 'تحقق من الاتصال وحاول مرة أخرى. بياناتك الحالية لن تتغير.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      role="alert"
      className="lifeos-v4-error-state"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="lifeos-v4-error-icon"><AlertTriangle size={20} /></div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="lifeos-secondary-action flex-shrink-0" aria-label="إعادة المحاولة">
          <RotateCcw size={14} /> إعادة المحاولة
        </button>
      )}
    </motion.div>
  );
}
