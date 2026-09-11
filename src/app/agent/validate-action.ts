import {
  isAgentActionType,
  type AgentAction,
  type AgentActionType,
  type AgentValidationResult,
} from './agent-types.ts';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const RECURRENCES = new Set(['', 'once', 'daily', 'weekly', 'monthly', 'yearly', 'weekdays']);
const PRIORITIES = new Set(['high', 'medium', 'low']);

const TASK_FIELDS = ['title', 'category', 'priority', 'startDate', 'endDate', 'recurrence', 'repeatDays', 'recurrenceEndDate', 'reminderTime', 'plannedTime', 'description'] as const;
const HABIT_FIELDS = ['name', 'category', 'icon', 'color', 'description', 'startDate', 'recurrence', 'repeatDays', 'recurrenceEndDate', 'reminderTime', 'dailyGoal', 'favorite'] as const;
const EVENT_FIELDS = ['title', 'type', 'date', 'time', 'location', 'notes', 'reminder', 'recurrence', 'repeatDays', 'recurrenceEndDate'] as const;
const GOAL_FIELDS = ['title', 'description', 'type', 'startDate', 'deadline', 'progress', 'milestones'] as const;
const GOAL_TYPES = new Set(['short', 'medium', 'long']);

const ALLOWED_FIELDS: Record<AgentActionType, readonly string[]> = {
  CreateTask: TASK_FIELDS,
  UpdateTask: ['id', ...TASK_FIELDS],
  CompleteTask: ['id'],
  DeleteTask: ['id'],
  CreateHabit: HABIT_FIELDS,
  UpdateHabit: ['id', ...HABIT_FIELDS],
  DeleteHabit: ['id'],
  CreateEvent: EVENT_FIELDS,
  UpdateEvent: ['id', ...EVENT_FIELDS],
  DeleteEvent: ['id'],
  CreateGoal: GOAL_FIELDS,
};

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function requireString(issues: string[], payload: Record<string, unknown>, field: string) {
  if (!nonEmptyString(payload[field])) issues.push(`${field} is required`);
}

function validateAllowedFields(issues: string[], payload: Record<string, unknown>, type: AgentActionType) {
  const allowed = new Set(ALLOWED_FIELDS[type]);
  for (const key of Object.keys(payload)) {
    if (!allowed.has(key)) issues.push(`unsupported field: ${key}`);
  }
}

function validateDateValue(issues: string[], value: unknown, field: string, required = false) {
  if (value == null || value === '') {
    if (required) issues.push(`${field} must use YYYY-MM-DD`);
    return;
  }
  if (!nonEmptyString(value) || !DATE_RE.test(value)) {
    issues.push(`${field} must use YYYY-MM-DD`);
    return;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) issues.push(`${field} is invalid`);
}

function validateOptionalTime(issues: string[], value: unknown, field: string) {
  if (value == null || value === '') return;
  if (!nonEmptyString(value) || !TIME_RE.test(value)) issues.push(`${field} must use HH:MM`);
}

function validateMilestones(issues: string[], value: unknown) {
  if (value == null) return;
  if (!Array.isArray(value) || value.length > 8 || value.some(item => typeof item !== 'string' || !item.trim() || item.trim().length > 160)) {
    issues.push('milestones must be up to 8 concise text items');
  }
}

function validateOptionalEnum(issues: string[], value: unknown, field: string, allowed: Set<string>) {
  if (value == null) return;
  if (typeof value !== 'string' || !allowed.has(value)) issues.push(`${field} is invalid`);
}


function validateRepeatDays(issues: string[], value: unknown) {
  if (value == null) return;
  if (!Array.isArray(value) || value.some(day => !Number.isInteger(day) || Number(day) < 0 || Number(day) > 6)) {
    issues.push('repeatDays must contain weekday numbers 0-6');
  }
}
export function validateAgentAction(action: AgentAction): AgentValidationResult {
  const issues: string[] = [];

  if (!nonEmptyString(action?.id)) issues.push('id is required');
  if (!isAgentActionType(action?.type)) {
    issues.push('type is not supported');
    return { valid: false, issues };
  }
  if (!action?.payload || typeof action.payload !== 'object' || Array.isArray(action.payload)) {
    issues.push('payload must be an object');
    return { valid: false, issues };
  }

  const payload = action.payload;
  validateAllowedFields(issues, payload, action.type);

  switch (action.type) {
    case 'CreateTask':
      requireString(issues, payload, 'title');
      validateDateValue(issues, payload.startDate, 'startDate');
      validateDateValue(issues, payload.endDate, 'endDate');
      validateOptionalTime(issues, payload.reminderTime, 'reminderTime');
      validateOptionalTime(issues, payload.plannedTime, 'plannedTime');
      validateOptionalEnum(issues, payload.priority, 'priority', PRIORITIES);
      validateOptionalEnum(issues, payload.recurrence, 'recurrence', RECURRENCES);
      validateRepeatDays(issues, payload.repeatDays);
      validateDateValue(issues, payload.recurrenceEndDate, 'recurrenceEndDate');
      break;
    case 'UpdateTask':
      requireString(issues, payload, 'id');
      validateDateValue(issues, payload.startDate, 'startDate');
      validateDateValue(issues, payload.endDate, 'endDate');
      validateOptionalTime(issues, payload.reminderTime, 'reminderTime');
      validateOptionalTime(issues, payload.plannedTime, 'plannedTime');
      validateOptionalEnum(issues, payload.priority, 'priority', PRIORITIES);
      validateOptionalEnum(issues, payload.recurrence, 'recurrence', RECURRENCES);
      validateRepeatDays(issues, payload.repeatDays);
      validateDateValue(issues, payload.recurrenceEndDate, 'recurrenceEndDate');
      break;
    case 'CompleteTask':
    case 'DeleteTask':
      requireString(issues, payload, 'id');
      break;
    case 'CreateHabit':
      requireString(issues, payload, 'name');
      validateDateValue(issues, payload.startDate, 'startDate');
      validateOptionalTime(issues, payload.reminderTime, 'reminderTime');
      validateOptionalEnum(issues, payload.recurrence, 'recurrence', RECURRENCES);
      validateRepeatDays(issues, payload.repeatDays);
      validateDateValue(issues, payload.recurrenceEndDate, 'recurrenceEndDate');
      break;
    case 'UpdateHabit':
      requireString(issues, payload, 'id');
      validateDateValue(issues, payload.startDate, 'startDate');
      validateOptionalTime(issues, payload.reminderTime, 'reminderTime');
      validateOptionalEnum(issues, payload.recurrence, 'recurrence', RECURRENCES);
      validateRepeatDays(issues, payload.repeatDays);
      validateDateValue(issues, payload.recurrenceEndDate, 'recurrenceEndDate');
      break;
    case 'DeleteHabit':
      requireString(issues, payload, 'id');
      break;
    case 'CreateEvent':
      requireString(issues, payload, 'title');
      validateDateValue(issues, payload.date, 'date', true);
      validateOptionalTime(issues, payload.time, 'time');
      validateOptionalEnum(issues, payload.recurrence, 'recurrence', RECURRENCES);
      validateRepeatDays(issues, payload.repeatDays);
      validateDateValue(issues, payload.recurrenceEndDate, 'recurrenceEndDate');
      break;
    case 'UpdateEvent':
      requireString(issues, payload, 'id');
      validateDateValue(issues, payload.date, 'date');
      validateOptionalTime(issues, payload.time, 'time');
      validateOptionalEnum(issues, payload.recurrence, 'recurrence', RECURRENCES);
      validateRepeatDays(issues, payload.repeatDays);
      validateDateValue(issues, payload.recurrenceEndDate, 'recurrenceEndDate');
      break;
    case 'DeleteEvent':
      requireString(issues, payload, 'id');
      break;
    case 'CreateGoal':
      requireString(issues, payload, 'title');
      validateDateValue(issues, payload.startDate, 'startDate');
      validateDateValue(issues, payload.deadline, 'deadline');
      validateOptionalEnum(issues, payload.type, 'type', GOAL_TYPES);
      if (payload.progress != null && (typeof payload.progress !== 'number' || payload.progress < 0 || payload.progress > 100)) issues.push('progress must be between 0 and 100');
      validateMilestones(issues, payload.milestones);
      break;
  }

  return { valid: issues.length === 0, issues };
}
