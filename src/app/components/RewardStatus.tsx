import { Play } from 'lucide-react';
import { GLOBAL_DAILY_REWARD_CAP } from '../../utils/ads/reward-policy.ts';

export function RewardStatus({ used }: { used: number }) {
  const safeUsed = Math.max(0, Math.min(GLOBAL_DAILY_REWARD_CAP, Number(used || 0)));
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/35 px-3.5 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground"><Play size={14} className="text-primary" /> مكافآت اليوم</div>
      <span className="text-xs font-black text-primary">{safeUsed}/{GLOBAL_DAILY_REWARD_CAP}</span>
    </div>
  );
}
