import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { hapticLight } from '../../../utils/haptics';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useIsMobile } from './use-mobile';
import { cn } from './utils';
import { registerAndroidBackHandler } from '../../../utils/android-back';

type FormModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  panelClassName?: string;
  layoutId?: string;
};

export function FormModal({ open, title, onClose, children, panelClassName, layoutId }: FormModalProps) {
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const titleId = React.useId();
  const panelRef = React.useRef<HTMLElement | null>(null);
  const onCloseRef = React.useRef(onClose);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!open || !isMobile || typeof document === 'undefined') return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    const focusPanel = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      // Do not auto-focus the first input on Android. Let the user choose the
      // field so opening a sheet never forces or immediately reopens the IME.
      const explicitTarget = panel?.querySelector<HTMLElement>('[data-autofocus]');
      (explicitTarget || panel)?.focus({ preventScroll: true });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    const unregisterBack = registerAndroidBackHandler(() => { onCloseRef.current(); return true; });

    return () => {
      unregisterBack();
      window.cancelAnimationFrame(focusPanel);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, [open, isMobile]);

  if (!isMobile) return open ? <>{children}</> : null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-end justify-center"
          style={{
            paddingTop: 'max(12px, env(safe-area-inset-top))',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.18 }}
          onClick={onClose}
        >
          <motion.div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.section
            ref={panelRef}
            tabIndex={-1}
            layoutId={layoutId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              'relative z-[121] w-full max-w-lg overflow-hidden rounded-t-[1.75rem] border border-b-0 border-border bg-background shadow-2xl',
              'max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-12px)]',
              panelClassName,
            )}
            onClick={(event) => event.stopPropagation()}
            onFocusCapture={(event) => {
              const target = event.target as HTMLElement;
              if (!target.matches('input, textarea, select, [contenteditable="true"]')) return;
              window.setTimeout(() => target.scrollIntoView({ block: 'center', behavior: 'auto' }), 160);
            }}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.14, ease: 'easeOut' }}
          >
            <div className="flex justify-center pb-1 pt-2.5" aria-hidden="true">
              <div className="h-1.5 w-11 rounded-full bg-muted-foreground/25" />
            </div>
            <h2 id={titleId} className="sr-only">{title}</h2>
            <motion.button
              type="button"
              onClick={() => { hapticLight(); onCloseRef.current(); }}
              whileTap={reduceMotion ? undefined : { scale: 0.9 }}
              className="lifeos-fast-close absolute left-2.5 top-2.5 z-30 flex h-11 w-11 touch-manipulation select-none items-center justify-center rounded-full border border-border bg-background/95 text-muted-foreground shadow-md backdrop-blur transition-transform hover:bg-muted hover:text-foreground active:scale-95"
              aria-label="إغلاق النافذة"
            >
              <X size={20} />
            </motion.button>
            <div className="lifeos-mobile-form-modal max-h-[calc(90dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain pb-[max(12px,env(safe-area-inset-bottom))] [touch-action:pan-y]">
              {children}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
