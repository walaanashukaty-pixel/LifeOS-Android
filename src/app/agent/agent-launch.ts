import { isPhase2AgentMode, type AgentLaunchRequest } from './phase2-modes.ts';

export const AGENT_LAUNCH_STORAGE_KEY = 'lifeos_agent_launch_v2';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): StorageLike | null {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  return window.sessionStorage;
}

export function queueAgentLaunch(launch: AgentLaunchRequest, storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  storage.setItem(AGENT_LAUNCH_STORAGE_KEY, JSON.stringify(launch));
}

export function consumeAgentLaunch(storage: StorageLike | null = defaultStorage()): AgentLaunchRequest | null {
  if (!storage) return null;
  const raw = storage.getItem(AGENT_LAUNCH_STORAGE_KEY);
  storage.removeItem(AGENT_LAUNCH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!isPhase2AgentMode(parsed.mode)) return null;
    if (typeof parsed.title !== 'string' || !parsed.title.trim()) return null;
    if (typeof parsed.prompt !== 'string' || !parsed.prompt.trim()) return null;
    if (typeof parsed.autoSend !== 'boolean') return null;
    return { mode: parsed.mode, title: parsed.title.trim(), prompt: parsed.prompt.trim(), autoSend: parsed.autoSend };
  } catch {
    return null;
  }
}
