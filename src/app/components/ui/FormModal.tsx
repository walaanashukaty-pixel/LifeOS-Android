import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useIsMobile } from './use-mobile';
import { cn } from './utils';

type FormModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  panelClassName?: string;
};

export function FormModal({ open, title, onClose, children, panelClassName }: FormModalProps) {
  const isMobile = useIsMobile();
  const titleId = React.useId();

  React.useEffect(() => {
    if (!open || !isMobile || typeof document === 'undefined') return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, isMobile, onClose]);

  if (!open) return null;
  if (!isMobile) return <>{children}</>;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-3"
      style={{
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      }}
    >
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative z-[121] w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl',
          'max-h-[calc(100dvh-24px-env(safe-area-inset-top)-env(safe-area-inset-bottom))]',
          panelClassName,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="sr-only">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/95 text-muted-foreground shadow-sm backdrop-blur hover:bg-muted hover:text-foreground"
          aria-label="إغلاق النافذة"
        >
          <X size={18} />
        </button>
        <div className="lifeos-mobile-form-modal max-h-[calc(100dvh-24px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain">
          {children}
        </div>
      </section>
    </div>,
    document.body,
  );
}
