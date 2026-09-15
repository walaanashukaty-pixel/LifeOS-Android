import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check, Loader2, RefreshCw } from 'lucide-react';
import { hapticSelection, hapticSuccess } from '../../../utils/haptics';

type PullToRefreshProps = {
  children: React.ReactNode;
  onRefresh?: () => void | Promise<void>;
  disabled?: boolean;
};

const TRIGGER = 68;
const MAX_PULL = 96;

export function PullToRefresh({ children, onRefresh, disabled }: PullToRefreshProps) {
  const reduceMotion = useReducedMotion();
  const [pull, setPull] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const [completed, setCompleted] = React.useState(false);
  const startPoint = React.useRef<{ x: number; y: number } | null>(null);
  const armed = React.useRef(false);

  const getScrollTop = (node: HTMLElement) => (node.closest('main') as HTMLElement | null)?.scrollTop ?? 0;

  const reset = () => {
    startPoint.current = null;
    armed.current = false;
    setPull(0);
  };

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (disabled || refreshing || !onRefresh || event.touches.length !== 1) return;
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, [role="dialog"], [data-pull-block="true"]')) return;
    if (getScrollTop(event.currentTarget) > 0) return;
    startPoint.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };

  const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (startPoint.current == null || refreshing) return;
    if (getScrollTop(event.currentTarget) > 0) {
      reset();
      return;
    }

    const deltaY = event.touches[0].clientY - startPoint.current.y;
    const deltaX = event.touches[0].clientX - startPoint.current.x;
    if (Math.abs(deltaX) > 18 && Math.abs(deltaX) > Math.abs(deltaY) * 0.85) {
      reset();
      return;
    }
    if (deltaY <= 0) {
      setPull(0);
      return;
    }

    if (event.cancelable && deltaY > 14 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) event.preventDefault();
    const resisted = Math.min(MAX_PULL, Math.pow(deltaY, 0.84) * 1.08);
    setPull(resisted);
    if (resisted >= TRIGGER && !armed.current) {
      armed.current = true;
      hapticSelection();
    } else if (resisted < TRIGGER) {
      armed.current = false;
    }
  };

  const finish = async () => {
    if (startPoint.current == null) return;
    startPoint.current = null;
    const shouldRefresh = pull >= TRIGGER && !!onRefresh;
    armed.current = false;

    if (!shouldRefresh) {
      setPull(0);
      return;
    }

    setRefreshing(true);
    setPull(54);
    try {
      await Promise.all([
        Promise.resolve(onRefresh?.()),
        new Promise(resolve => window.setTimeout(resolve, reduceMotion ? 120 : 420)),
      ]);
      setCompleted(true);
      hapticSuccess();
      await new Promise(resolve => window.setTimeout(resolve, reduceMotion ? 80 : 220));
    } finally {
      setCompleted(false);
      setRefreshing(false);
      setPull(0);
    }
  };

  const progress = Math.min(1, pull / TRIGGER);

  return (
    <div
      className="relative min-h-full overscroll-y-contain [touch-action:pan-y]"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={finish}
      onTouchCancel={reset}
    >
      <span className="sr-only" role="status" aria-live="polite">
        {completed ? 'تم تحديث البيانات' : refreshing ? 'جارٍ تحديث البيانات' : pull >= TRIGGER ? 'اترك الشاشة للتحديث' : ''}
      </span>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 z-20 flex -translate-x-1/2 items-center justify-center md:hidden"
        animate={{ y: pull > 0 || refreshing ? Math.max(8, pull - 46) : -44, opacity: pull > 5 || refreshing ? 1 : 0 }}
        transition={reduceMotion ? { duration: 0.08 } : { type: 'spring', stiffness: 430, damping: 34 }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/95 text-primary shadow-lg backdrop-blur-xl">
          {completed ? (
            <Check size={18} />
          ) : refreshing ? (
            <motion.span className="flex" animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }}>
              <Loader2 size={18} />
            </motion.span>
          ) : (
            <motion.span className="flex" animate={{ rotate: progress * 220 }} transition={{ duration: 0 }}>
              <RefreshCw size={17} />
            </motion.span>
          )}
        </div>
      </motion.div>

      <motion.div
        animate={{ y: refreshing ? 20 : pull * 0.34 }}
        transition={startPoint.current != null ? { duration: 0 } : reduceMotion ? { duration: 0.08 } : { type: 'spring', stiffness: 450, damping: 38 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
