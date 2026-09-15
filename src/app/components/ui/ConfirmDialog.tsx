import * as React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { hapticLight, hapticWarning } from '../../../utils/haptics';
import { registerAndroidBackHandler } from '../../../utils/android-back';

type ConfirmTone = 'danger' | 'warning' | 'default';

type ConfirmOptions = {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type PendingConfirm = ConfirmOptions & { resolve: (value: boolean) => void };

const ConfirmDialogContext = React.createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<PendingConfirm | null>(null);

  const confirm = React.useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => {
    setPending(current => {
      current?.resolve(false);
      return { tone: 'danger', confirmLabel: 'حذف', cancelLabel: 'إلغاء', ...options, resolve };
    });
  }), []);

  const settle = React.useCallback((value: boolean) => {
    setPending(current => {
      if (current) current.resolve(value);
      return null;
    });
  }, []);

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <ConfirmDialog pending={pending} onCancel={() => settle(false)} onConfirm={() => settle(true)} />
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const value = React.useContext(ConfirmDialogContext);
  if (!value) throw new Error('useConfirmDialog must be used inside ConfirmDialogProvider');
  return value;
}

function ConfirmDialog({ pending, onCancel, onConfirm }: { pending: PendingConfirm | null; onCancel: () => void; onConfirm: () => void }) {
  const reduceMotion = useReducedMotion();
  const titleId = React.useId();
  const descriptionId = React.useId();
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!pending) return;
    const unregister = registerAndroidBackHandler(() => { onCancel(); return true; });
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const raf = window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('[data-confirm-cancel]')?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      unregister();
      window.cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, [pending, onCancel]);

  if (typeof document === 'undefined') return null;
  const tone = pending?.tone || 'danger';
  const destructive = tone === 'danger';

  return createPortal(
    <AnimatePresence>
      {pending && (
        <motion.div
          className="fixed inset-0 z-[260] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          dir="rtl"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}
        >
          <motion.div
            ref={panelRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="w-full max-w-md rounded-t-[1.75rem] border border-b-0 border-border bg-card p-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[1.5rem] sm:border sm:p-5"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 56, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 42, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${destructive ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600'}`}>
                {destructive ? <Trash2 size={19} /> : <AlertTriangle size={19} />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-base font-black text-foreground">{pending.title || 'تأكيد الإجراء'}</h2>
                <p id={descriptionId} className="mt-1 text-xs leading-6 text-muted-foreground">{pending.description}</p>
              </div>
              <button type="button" aria-label="إغلاق" onClick={onCancel} className="lifeos-touch-target flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"><X size={18} /></button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button data-confirm-cancel type="button" onClick={() => { hapticLight(); onCancel(); }} className="lifeos-secondary-action min-h-12">{pending.cancelLabel}</button>
              <button type="button" onClick={() => { hapticWarning(); onConfirm(); }} className={`min-h-12 rounded-xl px-4 text-sm font-black text-white shadow-sm ${destructive ? 'bg-destructive' : 'bg-amber-500'}`}>{pending.confirmLabel}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
