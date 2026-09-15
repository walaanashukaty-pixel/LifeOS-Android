import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BarChart3, Bot, Crown, Sparkles } from 'lucide-react';
import { AIAssistantPage } from '../components/AIAssistantPage';
import { useAuth } from '../App';
import { useMonetization } from '../monetization/MonetizationProvider';
import { consumeAgentLaunch } from './agent-launch';
import { LifeOSAgentPage } from './LifeOSAgentPage';
import { ProAIHomeSection } from './ProAIHomeSection';
import type { AgentLaunchRequest } from './phase2-modes';
import { DailyReviewPage } from '../pro/DailyReviewPage.tsx';
import { PageHero } from '../components/ui/LifeOSPrimitives';
import { AIAnalyticsPanel } from '../pro/AIAnalyticsPanel.tsx';

export function AIHubPage() {
  const reduceMotion = useReducedMotion();
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
    <motion.div
      className="space-y-5"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28 }}
    >
      <div className="mx-auto max-w-4xl">
        <PageHero
          eyebrow="مركز الذكاء"
          title="LifeOS Intelligence"
          description="ابدأ من الرؤية، ثم خلّي LifeOS يفهم سياق يومك ويقترح إجراءات واضحة قبل أي تنفيذ."
          icon={<Bot size={22} />}
          meta={<div className="flex flex-wrap gap-2"><span className="lifeos-chip"><Crown size={12} /> {proExperienceEnabled ? (isPro ? 'Pro مفعّل' : 'معاينة Pro') : 'ميزات Pro متاحة'}</span><span className="lifeos-chip">موافقتك مطلوبة قبل أي تغيير</span></div>}
          actions={<motion.button onClick={() => { if (!proExperienceEnabled) return openPro(); setInitialLaunch(null); setAgentOpen(true); }} whileTap={reduceMotion ? undefined : { scale: 0.96 }} whileHover={reduceMotion ? undefined : { y: -1 }} className="lifeos-primary-action"><motion.span animate={reduceMotion ? undefined : { rotate: [0, 12, -8, 0], scale: [1, 1.12, 1] }} transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.5 }}><Sparkles size={14} /></motion.span>{proExperienceEnabled ? (proPreviewActive && !isPro ? 'فتح معاينة LifeOS AI' : 'فتح LifeOS AI') : 'اكتشف LifeOS Pro'}</motion.button>}
        />
      </div>

      {proExperienceEnabled && (
        <div className="mx-auto max-w-4xl space-y-3">
          <ProAIHomeSection onLaunch={openPhase2} onDailyReview={() => setDailyReviewOpen(true)} />
          <motion.button
            onClick={() => setAnalyticsOpen(true)}
            whileTap={reduceMotion ? undefined : { scale: 0.985 }}
            whileHover={reduceMotion ? undefined : { y: -2 }}
            className="lifeos-ai-feature-card flex w-full items-center gap-3 p-4 text-right"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><BarChart3 size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-black text-foreground">📊 تحليلات LifeOS</span>
              <span className="mt-1 block text-[10px] leading-5 text-muted-foreground">شوفي نمط إنجازك الحقيقي خلال آخر 7 أيام واقتراحًا واحدًا للأسبوع القادم.</span>
            </span>
          </motion.button>
        </div>
      )}

      {!proExperienceEnabled && <AIAssistantPage />}
    </motion.div>
  );
}
