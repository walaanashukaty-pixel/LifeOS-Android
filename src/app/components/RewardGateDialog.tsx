import { Crown, Loader2, Play, X } from 'lucide-react';
import type { GateDecision } from '../../utils/ads/reward-gate-model.ts';
import type { RewardPolicy } from '../../utils/ads/reward-policy.ts';

interface RewardGateDialogProps {
  open: boolean;
  policy: RewardPolicy | null;
  decision: GateDecision | null;
  currentCount?: number;
  adsInCurrentPack?: number;
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
  currentCount = 0,
  adsInCurrentPack = 0,
  busy = false,
  error = '',
  serverUnavailable = false,
  onReward,
  onPro,
  onCancel,
}: RewardGateDialogProps) {
  if (!open || !policy || !decision) return null;

  const rewardAvailable = decision.kind === 'reward_available' && !serverUnavailable;
  const watched = Math.max(0, Math.min(policy.adsPerReward, adsInCurrentPack));
  const nextNumber = Math.min(policy.adsPerReward, watched + 1);
  const title = serverUnavailable ? 'تعذر التحقق من المكافآت' : 'وصلت لسعة النسخة المجانية';
  const body = serverUnavailable
    ? 'لا نستطيع التحقق من مكافآتك الآن. جرّب لاحقًا أو استخدم LifeOS Pro.'
    : `لديك ${currentCount} ${policy.unitLabel} في القائمة، وسعة اليوم الحالية ${decision.limit}. شاهد إعلانين كاملين لتحصل على +${policy.reward} سعة إضافية لليوم فقط. إذا بقيت القائمة ممتلئة بعد ذلك، يمكنك مشاهدة إعلانين آخرين. تتصفر السعة الإضافية في اليوم التالي.`;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" dir="rtl">
      <div className="w-full max-w-md rounded-t-[28px] border border-border bg-card p-5 shadow-2xl sm:rounded-[28px]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Play size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-black text-foreground">{title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{body}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="lifeos-fast-close flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted active:scale-95 disabled:opacity-50"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        {!serverUnavailable && (
          <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 px-3.5 py-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>تقدم المكافأة الحالية</span>
              <span className="text-primary">{watched}/{policy.adsPerReward}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {Array.from({ length: policy.adsPerReward }, (_, i) => (
                <div key={i} className={`h-2 rounded-full ${i < watched ? 'bg-primary' : 'bg-muted'}`} />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {watched === 0 ? 'شاهد الإعلان الأول، ثم الإعلان الثاني لفتح السعة.' : 'بقي إعلان واحد فقط لتحصل على المكافأة.'}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-3 text-xs leading-5 text-amber-700 dark:text-amber-300">
            {error}
          </div>
        )}

        <div className="mt-5 grid gap-2.5">
          {rewardAvailable && (
            <button disabled={busy} onClick={onReward} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20 disabled:opacity-60 active:scale-[0.99]">
              {busy ? <Loader2 size={17} className="animate-spin" /> : <Play size={17} />}
              {error ? 'إعادة المحاولة' : `مشاهدة الإعلان ${nextNumber} من ${policy.adsPerReward}`}
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
