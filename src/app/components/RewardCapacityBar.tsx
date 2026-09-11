import { Play, Sparkles } from 'lucide-react';
import { useMonetization } from '../monetization/MonetizationProvider';
import { REWARD_POLICIES, type RewardKey } from '../../utils/ads/reward-policy';
import { effectiveLimit } from '../../utils/ads/reward-gate-model';

export function RewardCapacityBar({ rewardKey, currentCount }: { rewardKey: RewardKey; currentCount: number }) {
  const { isPro, rewards } = useMonetization();
  if (isPro) return null;

  const policy = REWARD_POLICIES[rewardKey];
  const packs = rewards.boostsByKey[rewardKey] || 0;
  const adViews = rewards.adViewsByKey[rewardKey] || 0;
  const limit = effectiveLimit(rewardKey, packs);
  const used = Math.max(0, Number(currentCount || 0));
  const remaining = Math.max(0, limit - used);
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const pairProgress = adViews % policy.adsPerReward;
  const bonus = packs * policy.reward;

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3.5" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-foreground">سعة {policy.title} في النسخة المجانية</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            مستخدم {used} من {limit} • متبقي {remaining}
          </p>
        </div>
        <div className="shrink-0 rounded-xl bg-primary/10 px-2.5 py-1.5 text-xs font-black text-primary">
          {used}/{limit}
        </div>
      </div>

      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>

      {used >= limit && (
        <div className="mt-2.5 rounded-xl bg-primary/5 px-3 py-2 text-[11px] font-semibold text-foreground">
          القائمة ممتلئة حاليًا. عند محاولة إضافة عنصر جديد سيطلب منك مشاهدة إعلانين لفتح +{policy.reward} أماكن لليوم فقط.
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Sparkles size={11} className="text-primary" />
          {bonus > 0 ? `مكافأة اليوم +${bonus}` : `الحد الأساسي ${policy.base}`}
        </span>
        <span className="flex items-center gap-1 font-semibold">
          <Play size={11} className="text-primary" />
          تقدم الإعلانات: {pairProgress}/{policy.adsPerReward} • كل إعلانين = +{policy.reward}
        </span>
      </div>
    </div>
  );
}
