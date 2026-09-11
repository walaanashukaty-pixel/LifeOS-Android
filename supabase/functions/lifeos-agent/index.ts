import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { fetchRevenueCatPro } from './revenuecat.ts';
import { callLifeOSProvider, validateProviderActionPayload } from './provider.ts';
import { canTransitionActionStatus } from './action-lifecycle.ts';
import { sanitizeAgentServerContext } from './context-policy.ts';
import { filterContextForMode, normalizeAgentMode } from './phase2-policy.ts';
import { loadLifeOSPersonalization } from './personalization.ts';
import { loadLifeOSAISettings } from './settings.ts';
import { loadRecentLifeOSReflections } from './reflections.ts';
import { deriveAdaptiveHints } from './learning.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_MESSAGE_CHARS = 4_000;
const MAX_CONTEXT_CHARS = 80_000;
const ALLOWED_RECORDED_STATUSES = new Set(['approved', 'rejected', 'executed', 'failed', 'undone']);

type AgentRequestBody = {
  message?: unknown;
  timezone?: unknown;
  now?: unknown;
  context?: unknown;
  conversationId?: unknown;
  operation?: unknown;
  actionId?: unknown;
  actionStatus?: unknown;
  result?: unknown;
  undo?: unknown;
  approvedPayload?: unknown;
  mode?: unknown;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function riskFor(type: string): 'low' | 'medium' | 'high' {
  if (type.startsWith('Delete')) return 'high';
  if (type.startsWith('Create') || type.startsWith('Update')) return 'medium';
  return 'low';
}

async function resolveConversation(supabase: any, userId: string, requestedId: unknown): Promise<string> {
  if (typeof requestedId === 'string' && requestedId) {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('id', requestedId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id;
  }

  const id = crypto.randomUUID();
  const { error } = await supabase.from('ai_conversations').insert({
    id,
    user_id: userId,
    title: 'LifeOS Agent',
  });
  if (error) throw error;
  return id;
}


async function loadConversationHistory(supabase: any, userId: string, conversationId: string) {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('role, content, metadata, created_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data || [])
    .reverse()
    .filter((item: any) => item?.role === 'user' || item?.role === 'assistant')
    .map((item: any) => ({
      role: item.role,
      content: typeof item.content === 'string' ? item.content : '',
      presentation: item?.metadata?.presentation || null,
    }));
}

function actionDomain(type: string): 'tasks' | 'habits' | 'events' | 'goals' | null {
  if (type.endsWith('Task')) return 'tasks';
  if (type.endsWith('Habit')) return 'habits';
  if (type.endsWith('Event')) return 'events';
  if (type.endsWith('Goal')) return 'goals';
  return null;
}

function validateReferencedActionIds(actions: Array<{ type: string; payload: Record<string, unknown> }>, contextData: Record<string, unknown>) {
  for (const action of actions) {
    if (!action.type.startsWith('Update') && action.type !== 'CompleteTask') continue;
    const id = typeof action.payload?.id === 'string' ? action.payload.id : '';
    const domain = actionDomain(action.type);
    const items = domain && Array.isArray(contextData[domain]) ? contextData[domain] as any[] : [];
    if (!id || !items.some(item => item && typeof item === 'object' && item.id === id)) {
      throw new Error(`Provider referenced an unknown ${domain || 'LifeOS'} record id`);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !serviceRoleKey) return json({ code: 'SERVER_CONFIG_ERROR', error: 'Supabase server configuration is missing.' }, 503);

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return json({ code: 'UNAUTHORIZED', error: 'Authentication required.' }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    const userId = authData?.user?.id;
    if (authError || !userId) return json({ code: 'UNAUTHORIZED', error: 'Invalid session.' }, 401);

    // QA/Test Pro access is server-controlled and allowlisted per user.
    // This never grants preview access just because the client asks for it.
    let previewAccess = false;
    try {
      const { data: previewRow, error: previewError } = await supabase
        .from('ai_preview_access')
        .select('enabled')
        .eq('user_id', userId)
        .eq('enabled', true)
        .maybeSingle();
      if (previewError) console.error('Preview access lookup failed', previewError);
      previewAccess = previewRow?.enabled === true;
    } catch (error) {
      console.error('Preview access lookup failed', error);
    }

    if (!previewAccess) {
      const revenueCatSecret = Deno.env.get('REVENUECAT_SECRET_API_KEY') || '';
      if (!revenueCatSecret) {
        return json({
          code: 'PRO_VERIFICATION_UNCONFIGURED',
          error: 'Server-side RevenueCat verification is not configured.',
        }, 503);
      }

      let pro;
      try {
        pro = await fetchRevenueCatPro({ userId, apiKey: revenueCatSecret, entitlementId: 'pro' });
      } catch (error) {
        console.error('RevenueCat verification failed', error);
        return json({ code: 'PRO_VERIFICATION_FAILED', error: 'Could not verify subscription.' }, 503);
      }
      if (!pro.active) return json({ code: 'PRO_REQUIRED', error: 'LifeOS Agent requires LifeOS Pro.' }, 403);
    }

    const body = await req.json() as AgentRequestBody;

    if (body.operation === 'record_action_status') {
      const actionId = typeof body.actionId === 'string' ? body.actionId : '';
      const actionStatus = typeof body.actionStatus === 'string' ? body.actionStatus : '';
      if (!actionId || !ALLOWED_RECORDED_STATUSES.has(actionStatus)) {
        return json({ code: 'INVALID_ACTION_STATUS', error: 'Action id or status is invalid.' }, 400);
      }

      const { data: currentAction, error: currentError } = await supabase
        .from('ai_actions')
        .select('id, status, action_type')
        .eq('id', actionId)
        .eq('user_id', userId)
        .maybeSingle();
      if (currentError) throw currentError;
      if (!currentAction) return json({ code: 'ACTION_NOT_FOUND', error: 'Action was not found.' }, 404);
      if (!canTransitionActionStatus(currentAction.status, actionStatus as any)) {
        return json({ code: 'INVALID_ACTION_TRANSITION', error: 'Action status transition is not allowed.' }, 409);
      }

      const update: Record<string, unknown> = { status: actionStatus, updated_at: new Date().toISOString() };
      if (actionStatus === 'approved' && body.approvedPayload && typeof body.approvedPayload === 'object' && !Array.isArray(body.approvedPayload)) {
        validateProviderActionPayload(currentAction.action_type, body.approvedPayload as Record<string, unknown>);
        update.payload = body.approvedPayload;
      }
      if (body.result && typeof body.result === 'object') update.result = body.result;
      if (body.undo && typeof body.undo === 'object') update.undo_payload = body.undo;

      const { data: updatedAction, error: updateError } = await supabase
        .from('ai_actions')
        .update(update)
        .eq('id', actionId)
        .eq('user_id', userId)
        .select('id, status')
        .maybeSingle();
      if (updateError) throw updateError;
      return json({ action: updatedAction });
    }

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) return json({ code: 'INVALID_REQUEST', error: 'Message is required.' }, 400);
    if (message.length > MAX_MESSAGE_CHARS) return json({ code: 'MESSAGE_TOO_LONG', error: 'Message is too long.' }, 400);

    let mode;
    try {
      mode = normalizeAgentMode(body.mode);
    } catch {
      return json({ code: 'INVALID_MODE', error: 'LifeOS Agent mode is invalid.' }, 400);
    }

    let aiSettings;
    try {
      aiSettings = await loadLifeOSAISettings(supabase, userId);
    } catch (error) {
      console.error('LifeOS AI settings lookup failed', error);
      return json({ code: 'AI_SETTINGS_FAILED', error: 'Could not load AI privacy settings.' }, 503);
    }

    const contextData = aiSettings.aiDataAccessEnabled
      ? filterContextForMode(sanitizeAgentServerContext(body.context), mode)
      : {};
    let personalization = null;
    let recentReflections: any[] = [];
    let adaptiveHints: string[] = [];
    if (aiSettings.memoryEnabled) {
      try {
        personalization = await loadLifeOSPersonalization(supabase, userId);
      } catch (error) {
        console.error('LifeOS personalization lookup failed', error);
      }
      try {
        recentReflections = await loadRecentLifeOSReflections(supabase, userId, 7);
        adaptiveHints = deriveAdaptiveHints(recentReflections);
      } catch (error) {
        console.error('LifeOS reflection lookup failed', error);
      }
    }
    const context = {
      timezone: typeof body.timezone === 'string' ? body.timezone.slice(0, 80) : 'UTC',
      now: typeof body.now === 'string' ? body.now.slice(0, 80) : new Date().toISOString(),
      data: contextData,
      personalization,
      recentReflections,
      adaptiveHints,
      privacy: {
        aiDataAccessEnabled: aiSettings.aiDataAccessEnabled,
        memoryEnabled: aiSettings.memoryEnabled,
      },
    };
    if (JSON.stringify(context).length > MAX_CONTEXT_CHARS) {
      return json({ code: 'CONTEXT_TOO_LARGE', error: 'Scoped context is too large.' }, 400);
    }

    const conversationId = await resolveConversation(supabase, userId, body.conversationId);
    const conversationHistory = await loadConversationHistory(supabase, userId, conversationId);
    const userMessageId = crypto.randomUUID();
    const { error: userMessageError } = await supabase.from('ai_messages').insert({
      id: userMessageId,
      conversation_id: conversationId,
      user_id: userId,
      role: 'user',
      content: message,
      metadata: { domains: Object.keys(contextData), mode },
    });
    if (userMessageError) throw userMessageError;

    const providerEndpoint = Deno.env.get('LIFEOS_AI_ENDPOINT') || '';
    const providerKey = Deno.env.get('LIFEOS_AI_API_KEY') || '';
    const providerModel = Deno.env.get('LIFEOS_AI_MODEL') || '';
    if (!providerEndpoint || !providerKey || !providerModel) {
      return json({
        code: 'AI_PROVIDER_UNCONFIGURED',
        error: 'LifeOS AI provider is not configured on the server.',
        conversationId,
      }, 503);
    }

    let providerResult;
    try {
      providerResult = await callLifeOSProvider({
        endpoint: providerEndpoint,
        apiKey: providerKey,
        model: providerModel,
        message,
        context,
        history: conversationHistory,
        mode,
      });
      validateReferencedActionIds(providerResult.actions, contextData as Record<string, unknown>);
    } catch (error) {
      console.error('AI provider failed', error);
      return json({ code: 'AI_PROVIDER_FAILED', error: 'LifeOS Agent could not generate a response.', conversationId }, 502);
    }

    const assistantMessageId = crypto.randomUUID();
    const { error: assistantMessageError } = await supabase.from('ai_messages').insert({
      id: assistantMessageId,
      conversation_id: conversationId,
      user_id: userId,
      role: 'assistant',
      content: providerResult.reply,
      metadata: {
        mode,
        intent: providerResult.intent,
        presentation: providerResult.presentation,
        ...(providerResult.clarification ? { clarification: providerResult.clarification } : {}),
      },
    });
    if (assistantMessageError) throw assistantMessageError;

    const actions = providerResult.clarification
      ? []
      : providerResult.actions.map(action => ({
          id: crypto.randomUUID(),
          conversation_id: conversationId,
          user_id: userId,
          source_message_id: assistantMessageId,
          action_type: action.type,
          payload: action.payload,
          risk: riskFor(action.type),
          status: 'proposed' as const,
          result: {},
          undo_payload: null,
        }));

    if (actions.length) {
      const { error: actionsError } = await supabase.from('ai_actions').insert(actions);
      if (actionsError) throw actionsError;
    }

    return json({
      conversationId,
      intent: providerResult.intent,
      reply: providerResult.reply,
      clarification: providerResult.clarification || null,
      presentation: providerResult.presentation,
      actions: actions.map(action => ({
        id: action.id,
        type: action.action_type,
        payload: action.payload,
        risk: action.risk,
        status: 'proposed',
      })),
    });
  } catch (error) {
    console.error('LifeOS Agent error', error);
    return json({ code: 'INTERNAL_ERROR', error: 'LifeOS Agent request failed.' }, 500);
  }
});
