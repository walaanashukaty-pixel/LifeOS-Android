import { ArrowLeft, Bot, Sparkles } from 'lucide-react';
import type { ProDashboardInsight } from './pro-dashboard-model.ts';

export function ProDashboardInsightCard({
  insight,
  onPlanDay,
  onAskLifeOS,
}: {
  insight: ProDashboardInsight;
  onPlanDay: () => void;
  onAskLifeOS: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-sm">
      <div className="relative p-4 sm:p-5">
        <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles size={18} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-foreground">✨ LifeOS يقترح لك</h3>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black text-primary">PRO</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{insight.summary}</p>
            </div>
          </div>

          {insight.priorities.length > 0 && (
            <div className="mt-4 space-y-2">
              {insight.priorities.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2 rounded-xl bg-background/70 px-3 py-2.5">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-foreground">{item.title}</span>
                  {item.overdue && <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[9px] font-bold text-amber-600 dark:text-amber-300">متأخرة</span>}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={onPlanDay} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-primary/20">
              عرض خطتي <ArrowLeft size={13} />
            </button>
            <button onClick={onAskLifeOS} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold text-foreground">
              <Bot size={14} className="text-primary" /> اسأل LifeOS
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
