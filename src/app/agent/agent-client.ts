import { supabase } from '../../utils/api';
import {
  invokeAgentTurnCore,
  recordAgentStatusCore,
  type AgentTurnInput,
  type AgentTurnResult,
  type RecordedActionStatus,
} from './agent-client-core.ts';

const invoke = (name: string, options: { body: any }) => supabase.functions.invoke(name, options);

export async function sendLifeOSAgentTurn(input: AgentTurnInput): Promise<AgentTurnResult> {
  return invokeAgentTurnCore(invoke, input);
}

export async function recordLifeOSAgentActionStatus(input: {
  actionId: string;
  status: RecordedActionStatus;
  result?: unknown;
  undo?: unknown;
  approvedPayload?: Record<string, unknown>;
}): Promise<void> {
  return recordAgentStatusCore(invoke, input);
}
