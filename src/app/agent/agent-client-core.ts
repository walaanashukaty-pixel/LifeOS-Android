import type { AgentAction, AgentMode } from './agent-types.ts';
import { parseAgentPresentation, type AgentPresentation } from './agent-presentation.ts';
import { isStructuredAgentMode } from './phase2-modes.ts';
import { validateAgentAction } from './validate-action.ts';

export interface AgentTurnInput {
  message: string;
  timezone: string;
  now: string;
  context: Record<string, unknown>;
  conversationId?: string | null;
  mode?: AgentMode;
}

export interface AgentTurnResult {
  conversationId: string;
  reply: string;
  clarification: string | null;
  actions: AgentAction[];
  presentation: AgentPresentation | null;
}

export type AgentFunctionInvoker = (
  name: string,
  options: { body: any },
) => Promise<{ data: any; error: any }>;

export class AgentRequestError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = 'AgentRequestError';
    this.code = code;
  }
}

export async function invokeAgentTurnCore(
  invoke: AgentFunctionInvoker,
  input: AgentTurnInput,
): Promise<AgentTurnResult> {
  const message = input.message.trim();
  if (!message) throw new AgentRequestError('INVALID_REQUEST', 'Message is required');

  const { data, error } = await invoke('lifeos-agent', {
    body: { ...input, message },
  });

  if (error) {
    const code = typeof data?.code === 'string' ? data.code : 'AGENT_REQUEST_FAILED';
    const detail = typeof data?.error === 'string' ? data.error : error?.message || 'LifeOS Agent request failed';
    throw new AgentRequestError(code, detail);
  }

  if (!data || typeof data !== 'object') throw new AgentRequestError('INVALID_RESPONSE', 'LifeOS Agent returned an empty response');
  if (typeof data.conversationId !== 'string' || !data.conversationId) throw new AgentRequestError('INVALID_RESPONSE', 'Conversation id is missing');
  if (typeof data.reply !== 'string' || !data.reply.trim()) throw new AgentRequestError('INVALID_RESPONSE', 'Agent reply is missing');
  if (!Array.isArray(data.actions)) throw new AgentRequestError('INVALID_RESPONSE', 'Agent actions are invalid');

  const actions: AgentAction[] = data.actions.map((raw: any) => {
    const action = {
      id: raw?.id,
      type: raw?.type,
      risk: raw?.risk,
      status: raw?.status,
      payload: raw?.payload,
      previous: raw?.previous ?? null,
    } as AgentAction;
    const validation = validateAgentAction(action);
    if (!validation.valid || action.status !== 'proposed') {
      throw new AgentRequestError('INVALID_ACTION', `Server returned invalid action: ${validation.issues.join(', ') || 'status must be proposed'}`);
    }
    return action;
  });

  let presentation: AgentPresentation | null = null;
  try {
    const expectedKind = isStructuredAgentMode(input.mode) ? input.mode : undefined;
    presentation = parseAgentPresentation(data.presentation, expectedKind);
  } catch (error: any) {
    throw new AgentRequestError('INVALID_PRESENTATION', error?.message || 'Agent presentation is invalid');
  }

  return {
    conversationId: data.conversationId,
    reply: data.reply.trim(),
    clarification: typeof data.clarification === 'string' && data.clarification.trim() ? data.clarification.trim() : null,
    actions,
    presentation,
  };
}


export type RecordedActionStatus = 'approved' | 'rejected' | 'executed' | 'failed' | 'undone';

export async function recordAgentStatusCore(
  invoke: AgentFunctionInvoker,
  input: {
    actionId: string;
    status: RecordedActionStatus;
    result?: unknown;
    undo?: unknown;
    approvedPayload?: Record<string, unknown>;
  },
): Promise<void> {
  if (!input.actionId) throw new AgentRequestError('INVALID_ACTION_STATUS', 'Action id is required');
  const { data, error } = await invoke('lifeos-agent', {
    body: {
      operation: 'record_action_status',
      actionId: input.actionId,
      actionStatus: input.status,
      result: input.result,
      undo: input.undo,
      approvedPayload: input.approvedPayload,
    },
  });
  if (error) {
    const code = typeof data?.code === 'string' ? data.code : 'ACTION_STATUS_FAILED';
    const detail = typeof data?.error === 'string' ? data.error : error?.message || 'Could not record action status';
    throw new AgentRequestError(code, detail);
  }
}
