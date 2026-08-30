import { Crown, Loader2, Play, X } from 'lucide-react';
import type { GateDecision } from '../../utils/ads/reward-gate-model.ts';
import type { RewardPolicy } from '../../utils/ads/reward-policy.ts';

interface RewardGateDialogProps {
  open: boolean;
  policy: RewardPolicy | null;
  decision: GateDecision | null;
  busy?: boolean;
  error?: string;
  serverUnavailable?: boolean;
  onReward: () => void;
  onPro: () => void;
  onCancel: () => void;
}

export function RewardGateDialog({
  open,
  policy,
  decision,
  busy = false,
  error = '',
  serverUnavailable = false,
  onReward,
  onPro,
  onCancel,
}: RewardGateDialogProps) {
  if (!open || !policy || !decision) return null;

  const rewardAvailable = decision.kind === 'reward_available' && !serverUnavailable;
  const title = decision.kind === 'daily_reward_cap'
    ? 'استخدمت مكافآت اليوم'
    : decision.kind === 'pro_only'
      ? 'وصلت لأقصى حد مجاني'
      : serverUnavailable
        ? 'تعذر التحقق من المكافآت'
        : 'وصلت للحد المجاني';

  const body = decision.kind === 'daily_reward_cap'
    ? 'استخدمت كل مكافآت الإعلانات المتاحة اليوم. تعود المكافآت غدًا، أو انتقل إلى LifeOS Pro بدون حدود.'
    : decision.kind === 'pro_only'
      ? `وصلت لأقصى سعة مجانية في ${policy.title}. استخدم LifeOS Pro لإزالة الحدود والإعلانات.`
      : serverUnavailable
        ? 'لا نستطيع التحقق من رصيد مكافآتك الآن. جرّب لاحقًا أو استخدم LifeOS Pro.'
        : `استخدمت الحد المجاني في ${policy.title}. شاهد إعلانًا واحصل على ${policy.reward} ${policy.unitLabel} إضافية.`;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" dir="rtl">
      <div className="w-full max-w-md rounded-t-[28px] border border-border bg-card p-5 shadow-2xl sm:rounded-[28px]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Play size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-black text-foreground">{title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{body}</p>
          </div>
          <button disabled={busy} onClick={onCancel} className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted disabled:opacity-50" aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-3 text-xs leading-5 text-amber-700 dark:text-amber-300">
            {error}
          </div>
        )}

        <div className="mt-5 grid gap-2.5">
          {rewardAvailable && (
            <button disabled={busy} onClick={onReward} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20 disabled:opacity-60">
              {busy ? <Loader2 size={17} className="animate-spin" /> : <Play size={17} />}
              {error ? 'إعادة المحاولة' : `مشاهدة إعلان (+${policy.reward})`}
            </button>
          )}
          <button disabled={busy} onClick={onPro} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3.5 text-sm font-bold text-amber-700 transition hover:bg-amber-500/10 disabled:opacity-60 dark:text-amber-300">
            <Crown size={17} /> LifeOS Pro
          </button>
          <button disabled={busy} onClick={onCancel} className="w-full rounded-2xl px-4 py-3 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
