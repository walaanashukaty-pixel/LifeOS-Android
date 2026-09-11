import type { AgentActionType, AgentMode } from './agent-types.ts';

export const PHASE2_AGENT_MODES = [
  'smart_add',
  'day_plan',
  'what_now',
  'goal_plan',
  'reschedule',
  'morning_brief',
] as const satisfies readonly AgentMode[];

export const P1_AGENT_MODES = [
  'weekly_review',
] as const satisfies readonly AgentMode[];

export type Phase2AgentMode = (typeof PHASE2_AGENT_MODES)[number];
export type P1AgentMode = (typeof P1_AGENT_MODES)[number];
export type StructuredAgentMode = Phase2AgentMode | P1AgentMode;

export interface AgentModePolicy {
  readOnly: boolean;
  allowedActionTypes: AgentActionType[];
}

export interface AgentLaunchRequest {
  mode: StructuredAgentMode;
  title: string;
  prompt: string;
  autoSend: boolean;
}

const MODE_POLICIES: Record<StructuredAgentMode, AgentModePolicy> = {
  smart_add: { readOnly: false, allowedActionTypes: ['CreateTask', 'CreateHabit', 'CreateEvent', 'CreateGoal'] },
  day_plan: { readOnly: false, allowedActionTypes: ['UpdateTask'] },
  what_now: { readOnly: true, allowedActionTypes: [] },
  goal_plan: { readOnly: false, allowedActionTypes: ['CreateGoal', 'CreateTask', 'CreateHabit', 'CreateEvent'] },
  reschedule: { readOnly: false, allowedActionTypes: ['UpdateTask', 'UpdateEvent'] },
  morning_brief: { readOnly: true, allowedActionTypes: [] },
  weekly_review: { readOnly: false, allowedActionTypes: ['UpdateTask', 'CreateTask', 'UpdateHabit'] },
};

const MODE_COPY: Record<StructuredAgentMode, { title: string; prompt: string; autoSend: boolean }> = {
  smart_add: {
    title: 'إضافة ذكية',
    prompt: 'اكتب شو بدك تضيف إلى LifeOS، وأنا رح أحدد إذا هو مهمة أو عادة أو موعد وأعرضه عليك قبل الحفظ.',
    autoSend: false,
  },
  day_plan: {
    title: 'رتبلي يومي',
    prompt: 'رتبلي يومي اليوم بشكل واقعي حسب مهامي وعاداتي ومواعيدي وأهدافي، واعرض علي خطة قابلة للاعتماد قبل أي تعديل.',
    autoSend: true,
  },
  what_now: {
    title: 'شو أعمل هلا؟',
    prompt: 'قلّي شو أفضل شي أعمله هلا. أعطيني من خيار إلى 3 خيارات كحد أقصى حسب الوقت والأولوية ومواعيدي وطاقتي الحالية.',
    autoSend: true,
  },
  goal_plan: {
    title: 'حوّل هدفي إلى خطة',
    prompt: 'اكتب الهدف الذي تريدين الوصول إليه والمدة إن كانت مهمة، وأنا رح أحوله إلى هدف ومراحل ومهام وعادات ومراجعة قبل الإضافة.',
    autoSend: false,
  },
  reschedule: {
    title: 'إعادة جدولة ذكية',
    prompt: 'راجع مهامي ومواعيدي الحالية واقترح إعادة جدولة فقط للأشياء المتعارضة أو المتأخرة، واعرض أي تعديل للموافقة قبل تنفيذه.',
    autoSend: true,
  },
  morning_brief: {
    title: 'ملخص الصباح',
    prompt: 'حضّرلي ملخص صباحي قصير لليوم: أهم 3 أولويات، مواعيدي، أي تعارض أو خطر، وتوصية عملية واحدة. لا تعدّل أي بيانات.',
    autoSend: true,
  },
  weekly_review: {
    title: 'مراجعة أسبوعية',
    prompt: 'راجع آخر أسبوع في LifeOS: شو نجح، شو تعثر، النمط اللي لاحظته، واقتراح واحد للأسبوع القادم. إذا الاقتراح يحتاج تعديل بالخطة، اعرضه علي قبل التنفيذ.',
    autoSend: true,
  },
};

export function getAgentModePolicy(mode: StructuredAgentMode): AgentModePolicy {
  const policy = MODE_POLICIES[mode];
  return { readOnly: policy.readOnly, allowedActionTypes: [...policy.allowedActionTypes] };
}

export function buildPhase2Launch(mode: Phase2AgentMode): AgentLaunchRequest {
  const copy = MODE_COPY[mode];
  return { mode, title: copy.title, prompt: copy.prompt, autoSend: copy.autoSend };
}

export function buildP1Launch(mode: P1AgentMode): AgentLaunchRequest {
  const copy = MODE_COPY[mode];
  return { mode, title: copy.title, prompt: copy.prompt, autoSend: copy.autoSend };
}

export function isPhase2AgentMode(value: unknown): value is Phase2AgentMode {
  return typeof value === 'string' && (PHASE2_AGENT_MODES as readonly string[]).includes(value);
}

export function isP1AgentMode(value: unknown): value is P1AgentMode {
  return typeof value === 'string' && (P1_AGENT_MODES as readonly string[]).includes(value);
}

export function isStructuredAgentMode(value: unknown): value is StructuredAgentMode {
  return isPhase2AgentMode(value) || isP1AgentMode(value);
}
