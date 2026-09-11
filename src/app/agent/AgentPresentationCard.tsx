import { AlertTriangle, Clock3, Sparkles } from 'lucide-react';
import type { AgentPresentation } from './agent-presentation';

export function AgentPresentationCard({ presentation }: { presentation: AgentPresentation }) {
  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border/70 bg-primary/[0.035] px-4 py-3">
        <div className="flex items-center gap-2 text-primary"><Sparkles size={14} /><p className="text-xs font-black">{presentation.title}</p></div>
        {presentation.summary && <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">{presentation.summary}</p>}
      </div>

      {presentation.sections.length > 0 && (
        <div className="space-y-4 p-4">
          {presentation.sections.map((section, sectionIndex) => (
            <section key={`${section.heading}-${sectionIndex}`}>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{section.heading}</p>
              <div className="space-y-2">
                {section.items.map((item, itemIndex) => (
                  <div key={`${item.title}-${itemIndex}`} className="rounded-xl border border-border/70 bg-background/70 px-3 py-2.5">
                    <div className="flex items-start gap-2.5">
                      {item.time && <span className="mt-0.5 flex flex-shrink-0 items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[9px] font-bold text-primary"><Clock3 size={10} />{item.time}</span>}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-[11px] font-bold leading-5 text-foreground">{item.title}</p>
                          {item.badge && <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground">{item.badge}</span>}
                        </div>
                        {item.detail && <p className="mt-0.5 text-[10px] leading-4.5 text-muted-foreground">{item.detail}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}


      {presentation.warnings.length > 0 && (
        <div className="space-y-1.5 border-t border-border/70 bg-amber-500/[0.04] px-4 py-3">
          {presentation.warnings.map((warning, index) => (
            <div key={`${warning}-${index}`} className="flex items-start gap-2 text-[10px] leading-4.5 text-amber-700 dark:text-amber-300">
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
