import * as React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { hapticLight, hapticSelection } from '../../../utils/haptics';
import { registerAndroidBackHandler } from '../../../utils/android-back';

type QuickAction = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

export function QuickActionSheet({
  open,
  title,
  subtitle,
  actions,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  actions: QuickAction[];
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const titleId = React.useId();
  const panelRef = React.useRef<HTMLElement | null>(null);
  React.useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const previous = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    const frame = window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('button:not([disabled])')?.focus({ preventScroll: true }));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    const unregisterBack = registerAndroidBackHandler(() => { onClose(); return true; });
    return () => {
      unregisterBack();
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[145] flex items-end justify-center md:items-center md:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.08 : 0.16 }}
          onClick={onClose}
          dir="rtl"
        >
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden="true" />
          <motion.section
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-md rounded-t-[1.75rem] border border-b-0 border-border bg-card p-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-2xl md:rounded-[1.5rem] md:border"
            onClick={event => event.stopPropagation()}
            drag={reduceMotion ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 800) {
                hapticLight();
                onClose();
              }
            }}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 72, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 72, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 430, damping: 35, mass: 0.78 }}
          >
            <div className="flex justify-center pb-2 pt-0.5 md:hidden" aria-hidden="true"><div className="h-1.5 w-11 rounded-full bg-muted-foreground/25" /></div>
            <div className="flex items-start gap-3 px-2 pb-3 pt-1">
              <div className="min-w-0 flex-1">
                <p id={titleId} className="truncate text-sm font-black text-foreground">{title}</p>
                {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
              </div>
              <motion.button type="button" whileTap={reduceMotion ? undefined : { scale: 0.9 }} onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted" aria-label="إغلاق"><X size={17} /></motion.button>
            </div>
            <div className="grid gap-1.5">
              {actions.map((action, index) => (
                <motion.button
                  type="button"
                  key={action.id}
                  disabled={action.disabled}
                  onClick={() => {
                    if (action.disabled) return;
                    hapticSelection();
                    onClose();
                    action.onSelect();
                  }}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.14) }}
                  whileTap={reduceMotion || action.disabled ? undefined : { scale: 0.985 }}
                  className={`flex min-h-12 items-center gap-3 rounded-2xl px-3.5 py-3 text-right text-sm font-semibold transition-colors disabled:opacity-45 ${action.destructive ? 'text-destructive hover:bg-destructive/8' : 'text-foreground hover:bg-muted'}`}
                >
                  <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${action.destructive ? 'bg-destructive/10' : 'bg-muted'}`}>{action.icon}</span>
                  <span className="flex-1">{action.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
