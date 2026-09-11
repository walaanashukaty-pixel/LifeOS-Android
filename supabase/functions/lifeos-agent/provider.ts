import {
  assertActionsAllowedForMode,
  modeInstruction,
  parseServerPresentation,
  type ServerAgentMode,
  type ServerPresentation,
} from './phase2-policy.ts';

const ALLOWED_ACTION_TYPES = new Set([
  'CreateTask', 'UpdateTask', 'CompleteTask',
  'CreateHabit', 'UpdateHabit',
  'CreateEvent', 'UpdateEvent',
  'CreateGoal',
]);

export const LIFEOS_INTENTS = [
  'general_conversation',
  'create_task',
  'update_task',
  'complete_task',
  'create_habit',
  'update_habit',
  'create_event',
  'update_event',
  'goal_planning',
  'daily_planning',
  'what_now',
  'smart_rescheduling',
  'schedule_question',
  'lifeos_data_question',
  'multi_entity',
] as const;

export type LifeOSIntent = (typeof LIFEOS_INTENTS)[number];

const INTENT_ACTIONS: Record<LifeOSIntent, readonly string[]> = {
  general_conversation: [],
  create_task: ['CreateTask'],
  update_task: ['UpdateTask'],
  complete_task: ['CompleteTask'],
  create_habit: ['CreateHabit'],
  update_habit: ['UpdateHabit'],
  create_event: ['CreateEvent'],
  update_event: ['UpdateEvent'],
  goal_planning: ['CreateGoal', 'CreateTask', 'CreateHabit', 'CreateEvent'],
  daily_planning: ['UpdateTask'],
  what_now: [],
  smart_rescheduling: ['UpdateTask', 'UpdateEvent'],
  schedule_question: [],
  lifeos_data_question: [],
  multi_entity: [
    'CreateTask', 'UpdateTask', 'CompleteTask',
    'CreateHabit', 'UpdateHabit',
    'CreateEvent', 'UpdateEvent',
    'CreateGoal',
  ],
};

const MAX_ACTIONS_PER_TURN = 8;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const RECURRENCES = new Set(['', 'once', 'daily', 'weekly', 'monthly', 'yearly', 'weekdays']);
const PRIORITIES = new Set(['high', 'medium', 'low']);

const TASK_FIELDS = ['title', 'category', 'priority', 'startDate', 'endDate', 'recurrence', 'repeatDays', 'recurrenceEndDate', 'reminderTime', 'plannedTime', 'description'];
const HABIT_FIELDS = ['name', 'category', 'icon', 'color', 'description', 'startDate', 'recurrence', 'repeatDays', 'recurrenceEndDate', 'reminderTime', 'dailyGoal', 'favorite'];
const EVENT_FIELDS = ['title', 'type', 'date', 'time', 'location', 'notes', 'reminder', 'recurrence', 'repeatDays', 'recurrenceEndDate'];
const GOAL_FIELDS = ['title', 'description', 'type', 'startDate', 'deadline', 'progress', 'milestones'];
const GOAL_TYPES = new Set(['short', 'medium', 'long']);
const ALLOWED_FIELDS: Record<string, readonly string[]> = {
  CreateTask: TASK_FIELDS,
  UpdateTask: ['id', ...TASK_FIELDS],
  CompleteTask: ['id'],
  CreateHabit: HABIT_FIELDS,
  UpdateHabit: ['id', ...HABIT_FIELDS],
  CreateEvent: EVENT_FIELDS,
  UpdateEvent: ['id', ...EVENT_FIELDS],
  CreateGoal: GOAL_FIELDS,
};

function requiredString(payload: Record<string, unknown>, field: string) {
  const value = payload[field];
  if (typeof value !== 'string' || !value.trim()) throw new Error(`AI provider action ${field} is required`);
}

function validateDate(value: unknown, field: string, required = false) {
  if (value == null || value === '') {
    if (required) throw new Error(`AI provider action ${field} is required`);
    return;
  }
  if (typeof value !== 'string' || !DATE_RE.test(value)) throw new Error(`AI provider action ${field} is invalid`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(`AI provider action ${field} is invalid`);
}

function validateTime(value: unknown, field: string) {
  if (value == null || value === '') return;
  if (typeof value !== 'string' || !TIME_RE.test(value)) throw new Error(`AI provider action ${field} is invalid`);
}

function validateRepeatDays(value: unknown) {
  if (value == null) return;
  if (!Array.isArray(value) || value.some(day => !Number.isInteger(day) || Number(day) < 0 || Number(day) > 6)) {
    throw new Error('AI provider action repeatDays is invalid');
  }
}

function validateMilestones(value: unknown) {
  if (value == null) return;
  if (!Array.isArray(value) || value.length > 8 || value.some(item => typeof item !== 'string' || !item.trim() || item.trim().length > 160)) {
    throw new Error('AI provider action milestones are invalid');
  }
}

function validateEnum(value: unknown, field: string, allowed: Set<string>) {
  if (value == null) return;
  if (typeof value !== 'string' || !allowed.has(value)) throw new Error(`AI provider action ${field} is invalid`);
}

export function validateProviderActionPayload(type: string, payload: Record<string, unknown>) {
  if (!ALLOWED_ACTION_TYPES.has(type)) throw new Error(`AI provider action type is not allowed: ${type}`);
  const allowed = new Set(ALLOWED_FIELDS[type] || []);
  for (const key of Object.keys(payload)) {
    if (!allowed.has(key)) throw new Error(`AI provider action contains unsupported field: ${key}`);
  }

  switch (type) {
    case 'CreateTask':
      requiredString(payload, 'title');
      validateDate(payload.startDate, 'startDate');
      validateDate(payload.endDate, 'endDate');
      validateTime(payload.reminderTime, 'reminderTime');
      validateTime(payload.plannedTime, 'plannedTime');
      validateEnum(payload.priority, 'priority', PRIORITIES);
      validateEnum(payload.recurrence, 'recurrence', RECURRENCES);
      validateRepeatDays(payload.repeatDays);
      validateDate(payload.recurrenceEndDate, 'recurrenceEndDate');
      break;
    case 'UpdateTask':
      requiredString(payload, 'id');
      validateDate(payload.startDate, 'startDate');
      validateDate(payload.endDate, 'endDate');
      validateTime(payload.reminderTime, 'reminderTime');
      validateTime(payload.plannedTime, 'plannedTime');
      validateEnum(payload.priority, 'priority', PRIORITIES);
      validateEnum(payload.recurrence, 'recurrence', RECURRENCES);
      validateRepeatDays(payload.repeatDays);
      validateDate(payload.recurrenceEndDate, 'recurrenceEndDate');
      break;
    case 'CompleteTask':
      requiredString(payload, 'id');
      break;
    case 'CreateHabit':
      requiredString(payload, 'name');
      validateDate(payload.startDate, 'startDate');
      validateTime(payload.reminderTime, 'reminderTime');
      validateEnum(payload.recurrence, 'recurrence', RECURRENCES);
      validateRepeatDays(payload.repeatDays);
      validateDate(payload.recurrenceEndDate, 'recurrenceEndDate');
      break;
    case 'UpdateHabit':
      requiredString(payload, 'id');
      validateDate(payload.startDate, 'startDate');
      validateTime(payload.reminderTime, 'reminderTime');
      validateEnum(payload.recurrence, 'recurrence', RECURRENCES);
      validateRepeatDays(payload.repeatDays);
      validateDate(payload.recurrenceEndDate, 'recurrenceEndDate');
      break;
    case 'CreateEvent':
      requiredString(payload, 'title');
      validateDate(payload.date, 'date', true);
      validateTime(payload.time, 'time');
      validateEnum(payload.recurrence, 'recurrence', RECURRENCES);
      validateRepeatDays(payload.repeatDays);
      validateDate(payload.recurrenceEndDate, 'recurrenceEndDate');
      break;
    case 'UpdateEvent':
      requiredString(payload, 'id');
      validateDate(payload.date, 'date');
      validateTime(payload.time, 'time');
      validateEnum(payload.recurrence, 'recurrence', RECURRENCES);
      validateRepeatDays(payload.repeatDays);
      validateDate(payload.recurrenceEndDate, 'recurrenceEndDate');
      break;
    case 'CreateGoal':
      requiredString(payload, 'title');
      validateDate(payload.startDate, 'startDate');
      validateDate(payload.deadline, 'deadline');
      validateEnum(payload.type, 'type', GOAL_TYPES);
      if (payload.progress != null && (typeof payload.progress !== 'number' || payload.progress < 0 || payload.progress > 100)) {
        throw new Error('AI provider action progress is invalid');
      }
      validateMilestones(payload.milestones);
      break;
  }
}

export interface ProviderAction {
  type: string;
  payload: Record<string, unknown>;
  previous?: Record<string, unknown> | null;
}

export interface ProviderHistoryItem {
  role: 'user' | 'assistant';
  content: string;
  presentation?: unknown;
}

export interface ProviderEnvelope {
  intent: LifeOSIntent;
  reply: string;
  actions: ProviderAction[];
  clarification?: string | null;
  presentation: ServerPresentation | null;
}

function isLifeOSIntent(value: unknown): value is LifeOSIntent {
  return typeof value === 'string' && (LIFEOS_INTENTS as readonly string[]).includes(value);
}

function assertActionsAllowedForIntent(intent: LifeOSIntent, actions: Array<{ type: string }>) {
  const allowed = new Set(INTENT_ACTIONS[intent]);
  for (const action of actions) {
    if (!allowed.has(action.type)) throw new Error(`Action ${action.type} is not compatible with intent ${intent}`);
  }
}

export const LIFEOS_AGENT_SYSTEM_PROMPT = `You are LifeOS Intelligence, a semantic life assistant inside an existing personal Life Operating System.

FIRST classify the user's intent by meaning, not by keywords. Return JSON only:
{"intent":"general_conversation|create_task|update_task|complete_task|create_habit|update_habit|create_event|update_event|goal_planning|daily_planning|what_now|smart_rescheduling|schedule_question|lifeos_data_question|multi_entity","reply":"...","clarification":null,"presentation":null,"actions":[]}.

CORE PRINCIPLES:
- LifeOS is NOT only a task manager. It contains tasks, habits, goals, events/appointments, recurring commitments, priorities, dates, schedules, progress and completion history.
- Never convert every sentence into CreateTask.
- Decide whether the user is asking a question, requesting a write action, planning, rescheduling, completing something, or just talking.
- Read the supplied real LifeOS context before answering. Never invent records, IDs, dates, priorities, schedules, completion state, or conflicts.
- Use conversationHistory to understand references like "هاي المهمة", "هالموعد", "خليها للمسا", "أجلها", "خلصتها", and follow-up changes to the current plan.
- Convert relative dates/times using context.now and context.timezone. Output exact YYYY-MM-DD and HH:MM fields only when the user supplied or context safely implies them.
- If multiple existing records match an update/completion request, ask one concise clarification question. Never guess which record.
- If the user's request can reasonably mean a recurring habit OR a one-time activity and the distinction matters, ask a concise clarification question.
- A frequency like "3 مرات بالأسبوع" is a Habit. If the existing model requires specific weekdays and they were not supplied, ask which days instead of inventing them.
- Questions such as "شو عندي بكرا؟" are read-only schedule/data questions. Answer from real context and return no actions.
- General conversation returns no actions.
- Never claim a change was applied. You only PROPOSE actions. The client validates, previews, confirms, executes through the existing LifeOS API, syncs reminders and handles undo.
- When clarification is required: set clarification to the concise question and return actions: [].
- Use only fields supported below.

ENTITY GUIDANCE:
- Task: a concrete one-off thing to do, optionally with date/deadline/reminder. Example: "ذكرني أرسل الإيميل بكرا".
- Habit: a recurring behavior/routine. Example: "بدي أقرأ كل يوم نص ساعة".
- Event: an appointment/meeting/time-blocked commitment. Example: "عندي موعد مع الطبيب الخميس الساعة 4".
- Goal planning: an outcome/progress objective. Before CreateGoal, check goals in context and do not duplicate an existing matching goal.

STRUCTURED PRESENTATIONS:
For structured capabilities, presentation may be:
{"kind":"smart_add|day_plan|what_now|goal_plan|reschedule|morning_brief|weekly_review","title":"...","summary":"...","sections":[{"heading":"...","items":[{"title":"...","detail":"...","time":"...","badge":"..."}]}],"warnings":["..."]}.
In normal chat, if semantic intent is daily_planning/what_now/goal_planning/smart_rescheduling, you MAY return the corresponding structured presentation even though requested mode is chat.

ALLOWED ACTIONS AND EXACT PAYLOAD FIELDS:
- CreateTask: title(required), category, priority(high|medium|low), startDate(YYYY-MM-DD), endDate(YYYY-MM-DD), recurrence(""|once|daily|weekly|monthly|yearly|weekdays), repeatDays(array 0-6), recurrenceEndDate(YYYY-MM-DD), reminderTime(HH:MM), plannedTime(HH:MM), description.
- UpdateTask: id(required) plus any CreateTask fields. Use only an id present in context.tasks. plannedTime is schedule placement, not a reminder.
- CompleteTask: id(required) only; id must exist in context.tasks.
- CreateHabit: name(required), category, icon, color, description, startDate(YYYY-MM-DD), recurrence(""|once|daily|weekly|monthly|yearly|weekdays), repeatDays(array 0-6), recurrenceEndDate(YYYY-MM-DD), reminderTime(HH:MM), dailyGoal, favorite.
- UpdateHabit: id(required) plus any CreateHabit fields. Use only an id present in context.habits.
- CreateEvent: title(required), date(required YYYY-MM-DD), type, time(HH:MM), location, notes, reminder, recurrence(""|once|daily|weekly|monthly|yearly|weekdays), repeatDays(array 0-6), recurrenceEndDate(YYYY-MM-DD).
- UpdateEvent: id(required) plus any CreateEvent fields. Use only an id present in context.events.
- CreateGoal: title(required), description, type(short|medium|long), startDate(YYYY-MM-DD), deadline(YYYY-MM-DD), progress(0-100), milestones(array up to 8 concise strings).
Never use userId, createdAt, logs, completions, or unsupported fields.

PLANNING QUALITY:
- Plan My Day: use actual due tasks, completion state, habits due today, fixed events, current time, deadlines, priorities and goals. Do not invent work or generic filler. If overloaded, prioritize and leave lower-value items unscheduled. Only propose UpdateTask for actual existing tasks that need plannedTime changes.
- What Now: read-only. Give the best next action based on current time, upcoming fixed events, urgency, deadlines, unfinished work and goal relevance. Explain WHY now. No fake "started" state.
- Rescheduling: identify real affected items and propose minimal updates with before/after explanation. No fake rescheduled UI state.
- Goal to Plan: reuse existing matching goal; create a goal only when clearly new. Propose minimum practical tasks/habits/events.
- Morning Brief: real commitments, top priorities, deadlines, relevant habits, conflicts and one practical recommendation. No motivational filler.

Keep Arabic user-facing copy concise, warm, practical, and grounded in actual application state.`;

export function parseProviderEnvelope(raw: string, mode: ServerAgentMode = 'chat'): ProviderEnvelope {
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { throw new Error('AI provider returned invalid JSON'); }
  if (!parsed || typeof parsed !== 'object') throw new Error('AI provider returned an invalid envelope');
  if (!isLifeOSIntent(parsed.intent)) throw new Error('AI provider intent is invalid');
  if (typeof parsed.reply !== 'string' || !parsed.reply.trim()) throw new Error('AI provider reply is required');
  if (!Array.isArray(parsed.actions)) throw new Error('AI provider actions must be an array');
  if (parsed.actions.length > MAX_ACTIONS_PER_TURN) throw new Error('AI provider returned too many actions');

  const actions = parsed.actions.map((action: any) => {
    if (!action || typeof action !== 'object') throw new Error('AI provider action is invalid');
    if (!action.payload || typeof action.payload !== 'object' || Array.isArray(action.payload)) throw new Error('AI provider action payload must be an object');
    validateProviderActionPayload(action.type, action.payload);
    return { type: action.type, payload: action.payload, previous: null };
  });
  assertActionsAllowedForMode(mode, actions);
  assertActionsAllowedForIntent(parsed.intent, actions);

  const clarification = typeof parsed.clarification === 'string' && parsed.clarification.trim() ? parsed.clarification.trim() : null;
  const presentation = clarification && parsed.presentation == null
    ? null
    : parseServerPresentation(parsed.presentation, mode);

  return {
    intent: parsed.intent,
    reply: parsed.reply.trim(),
    actions: clarification ? [] : actions,
    clarification,
    presentation,
  };
}

function extractText(payload: any): string {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  if (typeof payload?.choices?.[0]?.message?.content === 'string') return payload.choices[0].message.content;
  if (typeof payload?.text === 'string') return payload.text;
  throw new Error('AI provider response did not contain text output');
}

export async function callLifeOSProvider({ endpoint, apiKey, model, message, context, history = [], mode = 'chat', fetchImpl = fetch }: {
  endpoint: string;
  apiKey: string;
  model: string;
  message: string;
  context: unknown;
  history?: ProviderHistoryItem[];
  mode?: ServerAgentMode;
  fetchImpl?: typeof fetch;
}): Promise<ProviderEnvelope> {
  if (!endpoint || !apiKey || !model) throw new Error('AI provider is not configured');
  const conversationHistory = history.slice(-10).map(item => ({
    role: item.role,
    content: item.content.slice(0, 1_500),
    ...(item.presentation ? { presentation: item.presentation } : {}),
  }));
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: `${LIFEOS_AGENT_SYSTEM_PROMPT}\n\n${modeInstruction(mode)}` },
        { role: 'user', content: JSON.stringify({ mode, message, context, conversationHistory }) },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) throw new Error(`AI provider request failed (${response.status})`);
  return parseProviderEnvelope(extractText(await response.json()), mode);
}
