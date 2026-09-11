import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Bot, Loader2, RotateCcw, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../utils/api';
import { useAuth } from '../App';
import { cancelEntityReminders, scheduleEventReminder, scheduleHabitReminders, scheduleTaskReminders } from '../../utils/notifications';
import { useMonetization } from '../monetization/MonetizationProvider';
import { ActionPreviewCard } from './ActionPreviewCard';
import { AgentPresentationCard } from './AgentPresentationCard';
import { sendLifeOSAgentTurn, recordLifeOSAgentActionStatus } from './agent-client';
import { buildAgentContext } from './context-builder';
import { executeApprovedAction, undoExecutedAction } from './action-executor';
import { attachPreviousState, loadScopedSnapshot } from './agent-snapshot';
import type { AgentAction, AgentMode, ExecutedAgentAction } from './agent-types';
import type { AgentPresentation } from './agent-presentation';
import { syncAgentRemindersAfterExecution, syncAgentRemindersAfterUndo } from './agent-reminders';
import type { AgentLaunchRequest } from './phase2-modes';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  presentation?: AgentPresentation | null;
}

const SUGGESTED_PROMPTS = [
  'ضيفلي مهمة أراجع شغلي بكرا',
  'شو أهم شي لازم أعمله اليوم؟',
  'عندي موعد، ساعدني أرتب اللي قبله',
];

export function LifeOSAgentPage({
  onBack,
  initialLaunch = null,
}: {
  onBack: () => void;
  initialLaunch?: AgentLaunchRequest | null;
}) {
  const { isPro, proPreviewActive, proExperienceEnabled, openPro } = useMonetization();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: initialLaunch?.mode === 'smart_add'
        ? 'اكتبلي شو بدك تضيف — مهمة، عادة، أو موعد — وأنا رح أفهمه وأعرضه عليك قبل الحفظ.'
        : 'احكيلي شو بدك تعمل. رح أفهم طلبك وأعرض أي تغيير عليك قبل التنفيذ.',
    },
  ]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<AgentAction[]>([]);
  const [executedActions, setExecutedActions] = useState<ExecutedAgentAction[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<AgentMode>(initialLaunch?.mode ?? 'chat');
  const initialLaunchSent = useRef(false);

  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);
  const reminderAdapter = useMemo(() => ({
    scheduleTask: scheduleTaskReminders,
    scheduleHabit: scheduleHabitReminders,
    scheduleEvent: scheduleEventReminder,
    cancelEntity: cancelEntityReminders,
  }), []);

  useEffect(() => {
    if (!proExperienceEnabled || !initialLaunch || initialLaunchSent.current) return;
    initialLaunchSent.current = true;
    setActiveMode(initialLaunch.mode);
    if (initialLaunch.autoSend) void send(initialLaunch.prompt, initialLaunch.mode);
  }, [proExperienceEnabled, initialLaunch]);

  async function send(messageOverride?: string, modeOverride?: AgentMode) {
    const text = (messageOverride ?? input).trim();
    if (!text || busy) return;
    const mode = modeOverride ?? activeMode;
    if (modeOverride && modeOverride !== activeMode) setActiveMode(modeOverride);
    setInput('');
    setMessages(current => [...current, { id: crypto.randomUUID(), role: 'user', text }]);
    setBusy(true);
    try {
      const snapshot = await loadScopedSnapshot(text, api, mode);
      const context = buildAgentContext({
        message: text,
        mode,
        timezone,
        now: new Date().toISOString(),
        snapshot,
      });
      const result = await sendLifeOSAgentTurn({
        message: text,
        mode,
        timezone,
        now: context.now,
        context: context.data,
        conversationId,
      });
      setConversationId(result.conversationId);
      const assistantText = result.clarification && result.clarification !== result.reply
        ? `${result.reply}\n\n${result.clarification}`
        : result.reply;
      setMessages(current => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: assistantText,
        presentation: result.presentation,
      }]);
      setPendingActions(result.actions.map(action => attachPreviousState(action, snapshot)));
    } catch (error: any) {
      const message = String(error?.message || 'تعذر التواصل مع LifeOS Agent.');
      setMessages(current => [...current, { id: crypto.randomUUID(), role: 'system', text: friendlyAgentError(message) }]);
    } finally {
      setBusy(false);
    }
  }

  async function approveAction(action: AgentAction) {
    setActionBusyId(action.id);
    const approved = { ...action, status: 'approved' as const };
    try {
      await recordLifeOSAgentActionStatus({ actionId: action.id, status: 'approved', approvedPayload: action.payload }).catch(() => undefined);
      const executed = await executeApprovedAction(approved, api);
      if (user?.id) await syncAgentRemindersAfterExecution(user.id, executed, reminderAdapter).catch(() => undefined);
      setPendingActions(current => current.filter(item => item.id !== action.id));
      setExecutedActions(current => [executed, ...current].slice(0, 10));
      setMessages(current => [...current, { id: crypto.randomUUID(), role: 'system', text: 'تم تنفيذ الإجراء الذي وافقت عليه.' }]);
      await recordLifeOSAgentActionStatus({
        actionId: action.id,
        status: 'executed',
        result: executed.result,
        undo: executed.undo,
      }).catch(() => undefined);
    } catch (error: any) {
      toast.error(error?.message || 'تعذر تنفيذ الإجراء');
      await recordLifeOSAgentActionStatus({ actionId: action.id, status: 'failed', result: { error: String(error?.message || error) } }).catch(() => undefined);
    } finally {
      setActionBusyId(null);
    }
  }


  async function approveAllPendingActions() {
    if (busy || actionBusyId || pendingActions.length === 0) return;
    const actionsToRun = [...pendingActions];
    const completed: ExecutedAgentAction[] = [];
    setActionBusyId('batch');
    try {
      for (const action of actionsToRun) {
        let executed: ExecutedAgentAction;
        await recordLifeOSAgentActionStatus({ actionId: action.id, status: 'approved', approvedPayload: action.payload }).catch(() => undefined);
        executed = await executeApprovedAction({ ...action, status: 'approved' }, api);
        await recordLifeOSAgentActionStatus({ actionId: action.id, status: 'executed', result: executed.result, undo: executed.undo }).catch(() => undefined);
        if (user?.id) await syncAgentRemindersAfterExecution(user.id, executed, reminderAdapter).catch(() => undefined);
        completed.push(executed);
      }
      setPendingActions([]);
      setExecutedActions(current => [...completed.reverse(), ...current].slice(0, 10));
      const text = activeMode === 'goal_plan' ? 'تمت إضافة الخطة إلى LifeOS ✓' : activeMode === 'weekly_review' ? 'تم تطبيق اقتراح الأسبوع القادم ✓' : 'تم اعتماد الخطة وتطبيقها ✓';
      setMessages(current => [...current, { id: crypto.randomUUID(), role: 'system', text }]);
      toast.success(text);
    } catch (error: any) {
      const completedIds = new Set(completed.map(item => item.id));
      setPendingActions(current => current.filter(item => !completedIds.has(item.id)));
      if (completed.length) setExecutedActions(current => [...completed.reverse(), ...current].slice(0, 10));
      toast.error(completed.length ? `تم تطبيق ${completed.length} إجراء، وتوقفنا عند أول خطأ.` : (error?.message || 'تعذر تطبيق الخطة'));
    } finally {
      setActionBusyId(null);
    }
  }

  async function rejectAction(action: AgentAction) {
    setPendingActions(current => current.filter(item => item.id !== action.id));
    await recordLifeOSAgentActionStatus({ actionId: action.id, status: 'rejected' }).catch(() => undefined);
  }

  async function undo(action: ExecutedAgentAction) {
    setActionBusyId(action.id);
    try {
      const undone = await undoExecutedAction(action, api);
      if (user?.id) await syncAgentRemindersAfterUndo(user.id, undone, reminderAdapter).catch(() => undefined);
      setExecutedActions(current => current.map(item => item.id === action.id ? undone : item));
      await recordLifeOSAgentActionStatus({ actionId: action.id, status: 'undone' }).catch(() => undefined);
      toast.success('تم التراجع عن الإجراء');
    } catch (error: any) {
      toast.error(error?.message || 'تعذر التراجع عن الإجراء');
    } finally {
      setActionBusyId(null);
    }
  }

  if (!proExperienceEnabled) {
    return (
      <div className="mx-auto max-w-2xl">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-xs font-bold text-muted-foreground"><ArrowRight size={15} /> رجوع</button>
        <div className="rounded-3xl border border-primary/20 bg-card p-6 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Bot size={26} /></div>
          <h2 className="mt-4 text-xl font-black text-foreground">LifeOS Agent ضمن Pro</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">المساعد الحالي يبقى متاحًا، وPro يضيف تجربة أعمق مرتبطة ببيانات LifeOS مع معاينة وموافقة قبل أي تنفيذ.</p>
          <button onClick={openPro} className="mt-5 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white">عرض مزايا Pro</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 pb-4">
      {proPreviewActive && !isPro && (
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] px-4 py-3 text-[11px] leading-5 text-primary">
          <span className="font-black">وضع Test Pro:</span> الذكاء الحقيقي مفعّل لحساب الاختبار. رح يقرأ بيانات LifeOS الفعلية، وأي تغيير يبقى بانتظار موافقتك قبل التنفيذ.
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"><ArrowRight size={17} /></button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><h2 className="font-black text-foreground">{initialLaunch?.title || 'LifeOS Agent'}</h2><Sparkles size={15} className="text-primary" /></div>
          <p className="text-[11px] text-muted-foreground">يفهم → يقترح → يعرض عليك → ينفذ بعد موافقتك</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1.5 text-[10px] font-bold text-primary"><ShieldCheck size={12} /> أنت صاحب القرار</span>
      </div>

      <div className="min-h-[46vh] space-y-3 rounded-3xl border border-border bg-card p-4 shadow-sm">
        {messages.map(message => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div className="max-w-[92%]">
              <div className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-primary text-white' : message.role === 'system' ? 'border border-amber-500/20 bg-amber-500/5 text-foreground' : 'bg-muted text-foreground'}`}>
                {message.text}
              </div>
              {message.presentation && <AgentPresentationCard presentation={message.presentation} />}
            </div>
          </div>
        ))}
        {busy && <div className="flex justify-end"><div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" /> عم رتّب طلبك...</div></div>}
      </div>

      {pendingActions.length > 0 && (
        <section className="space-y-3">
          <div><p className="text-sm font-black text-foreground">إجراءات مقترحة</p><p className="text-xs text-muted-foreground">ما رح يتغير شي قبل ما تعتمده.</p></div>
          {(activeMode === 'day_plan' || activeMode === 'goal_plan' || activeMode === 'weekly_review') && pendingActions.length > 0 && (
            <button disabled={!!actionBusyId} onClick={() => void approveAllPendingActions()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-black text-white shadow-sm shadow-primary/20 disabled:opacity-50">
              <ShieldCheck size={16} /> {activeMode === 'goal_plan' ? 'إضافة الخطة إلى LifeOS' : activeMode === 'weekly_review' ? 'طبّق الاقتراح' : 'اعتماد الخطة'}
            </button>
          )}
          {pendingActions.map(action => (
            <ActionPreviewCard
              key={action.id}
              action={action}
              busy={!!actionBusyId}
              onChange={next => setPendingActions(current => current.map(item => item.id === next.id ? next : item))}
              onApprove={() => void approveAction(action)}
              onReject={() => void rejectAction(action)}
            />
          ))}
        </section>
      )}

      {executedActions.some(action => action.status === 'executed' && action.undo) && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold text-muted-foreground">آخر إجراء قابل للتراجع</p>
          {executedActions.filter(action => action.status === 'executed' && action.undo).slice(0, 1).map(action => (
            <button key={action.id} disabled={actionBusyId === action.id} onClick={() => void undo(action)} className="mt-2 flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs font-bold text-foreground disabled:opacity-50"><RotateCcw size={14} /> تراجع عن آخر تغيير</button>
          ))}
        </section>
      )}

      {messages.length <= 1 && activeMode === 'chat' && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map(prompt => <button key={prompt} onClick={() => void send(prompt)} className="rounded-full border border-border bg-card px-3 py-2 text-[11px] font-semibold text-muted-foreground">{prompt}</button>)}
        </div>
      )}

      <div className="relative z-10 flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-lg md:sticky md:bottom-3">
        <textarea
          value={input}
          onChange={event => setInput(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          rows={1}
          placeholder={activeMode === 'smart_add' ? 'مثال: عندي موعد دكتور الثلاثاء الساعة 4...' : activeMode === 'chat' ? 'مثال: ضيفلي موعد دكتور الثلاثاء الساعة 4...' : 'كمّل أو وضّح طلبك...'}
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button disabled={!input.trim() || busy} onClick={() => void send()} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-40"><Send size={17} /></button>
      </div>
    </div>
  );
}

function friendlyAgentError(message: string) {
  if (message.includes('PRO_REQUIRED')) return 'اشتراك LifeOS Pro غير مفعّل لهذا الحساب. إذا هذا حساب اختبار، تأكد أنه مضاف لقائمة Test Pro على السيرفر.';
  if (message.includes('PRO_VERIFICATION_UNCONFIGURED')) return 'التحقق الآمن من اشتراك Pro يحتاج إعداد السيرفر أولًا.';
  if (message.includes('AI_PROVIDER_UNCONFIGURED')) return 'LifeOS Agent جاهز داخل التطبيق، وباقي ربط مزود الذكاء على السيرفر.';
  if (message.includes('INVALID_MODE') || message.includes('INVALID_PRESENTATION')) return 'رجع رد غير صالح من المساعد، لذلك ما تم تنفيذ أي تغيير.';
  return 'صار خطأ مؤقت وما تم تنفيذ أي تغيير. جرّب مرة ثانية.';
}
