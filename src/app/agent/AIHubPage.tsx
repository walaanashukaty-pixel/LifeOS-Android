import { useState } from 'react';
import { BarChart3, Bot, Crown, Sparkles } from 'lucide-react';
import { AIAssistantPage } from '../components/AIAssistantPage';
import { useAuth } from '../App';
import { useMonetization } from '../monetization/MonetizationProvider';
import { consumeAgentLaunch } from './agent-launch';
import { LifeOSAgentPage } from './LifeOSAgentPage';
import { ProAIHomeSection } from './ProAIHomeSection';
import type { AgentLaunchRequest } from './phase2-modes';
import { DailyReviewPage } from '../pro/DailyReviewPage.tsx';
import { AIAnalyticsPanel } from '../pro/AIAnalyticsPanel.tsx';

export function AIHubPage() {
  const { user } = useAuth();
  const { isPro, proPreviewActive, proExperienceEnabled, openPro } = useMonetization();
  const [initialLaunch, setInitialLaunch] = useState<AgentLaunchRequest | null>(() => consumeAgentLaunch());
  const [agentOpen, setAgentOpen] = useState(() => proExperienceEnabled && initialLaunch !== null);
  const [dailyReviewOpen, setDailyReviewOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  function openPhase2(launch: AgentLaunchRequest) {
    setInitialLaunch(launch);
    setAgentOpen(true);
  }

  if (dailyReviewOpen && proExperienceEnabled) {
    return <DailyReviewPage onBack={() => setDailyReviewOpen(false)} />;
  }

  if (analyticsOpen && proExperienceEnabled && user?.id) {
    return <AIAnalyticsPanel userId={user.id} onBack={() => setAnalyticsOpen(false)} />;
  }

  if (agentOpen && proExperienceEnabled) {
    return (
      <LifeOSAgentPage
        initialLaunch={initialLaunch}
        onBack={() => {
          setAgentOpen(false);
          setInitialLaunch(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-sm">
        <div className="relative p-5">
          <div className="absolute -left-10 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Bot size={23} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-black text-foreground">LifeOS Intelligence</p>
                <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-300"><Crown size={11} /> Pro</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">احكي بطبيعتك. LifeOS يقرأ بياناتك الحقيقية، يفهم المقصود، ويقترح قبل أي تغيير.</p>
              <button
                onClick={() => {
                  if (!proExperienceEnabled) return openPro();
                  setInitialLaunch(null);
                  setAgentOpen(true);
                }}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-primary/20"
              >
                <Sparkles size={14} /> {proExperienceEnabled ? (proPreviewActive && !isPro ? 'افتح معاينة LifeOS AI' : 'افتح LifeOS AI') : 'اكتشف LifeOS Pro'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {proExperienceEnabled && (
        <div className="mx-auto max-w-3xl space-y-3">
          <ProAIHomeSection onLaunch={openPhase2} onDailyReview={() => setDailyReviewOpen(true)} />
          <button
            onClick={() => setAnalyticsOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl border border-primary/20 bg-card p-4 text-right shadow-sm transition active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><BarChart3 size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-black text-foreground">📊 تحليلات LifeOS</span>
              <span className="mt-1 block text-[10px] leading-5 text-muted-foreground">شوفي نمط إنجازك الحقيقي خلال آخر 7 أيام واقتراحًا واحدًا للأسبوع القادم.</span>
            </span>
          </button>
        </div>
      )}

      {!proExperienceEnabled && <AIAssistantPage />}
    </div>
  );
}
