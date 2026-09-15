import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[LifeOS] Unhandled UI error', error);
  }

  private reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="flex min-h-dvh items-center justify-center bg-background p-5" dir="rtl">
        <section role="alert" className="w-full max-w-md rounded-[2rem] border border-border bg-card p-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle size={26} />
          </div>
          <p className="mt-5 text-[10px] font-black tracking-[0.18em] text-muted-foreground">LIFEOS RECOVERY</p>
          <h1 className="mt-2 text-xl font-black text-foreground">صار خطأ غير متوقع بالواجهة</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">بياناتك المحفوظة ما انحذفت. أعد تحميل LifeOS للرجوع إلى آخر حالة مستقرة.</p>
          <button type="button" onClick={this.reload} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 font-bold text-primary-foreground transition hover:brightness-95 focus-visible:outline-offset-4">
            <RefreshCw size={17} /> إعادة تحميل التطبيق
          </button>
        </section>
      </main>
    );
  }
}
