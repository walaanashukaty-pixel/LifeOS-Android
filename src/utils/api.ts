import { Capacitor } from '@capacitor/core';
import { createClient, type Session } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { localDateKey } from './date';

export const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-3df25961`;

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      flowType: 'pkce',
      detectSessionInUrl: !Capacitor.isNativePlatform(),
      experimental: { appendPkceFlowIdToRedirects: true },
    },
  },
);

const LEGACY_STORE_KEY = 'lifeos_data';
let legacyMigrationPromise: Promise<void> | null = null;
let legacyMigrationUserId = '';

function networkErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || '');
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(raw)) {
    return 'تعذر الاتصال بخادم LifeOS. تحقق من الإنترنت وحاول مجددًا.';
  }
  return raw || 'حدث خطأ غير متوقع أثناء الاتصال بالخادم.';
}

async function getAuthenticatedSession(): Promise<Session> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  if (data.session?.access_token && data.session.user?.id) return data.session;

  // Compatibility with builds that persisted a copy before the SDK restored it.
  const raw = localStorage.getItem('lifeos_session');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.access_token && parsed?.refresh_token) {
        const restored = await supabase.auth.setSession({
          access_token: parsed.access_token,
          refresh_token: parsed.refresh_token,
        });
        if (!restored.error && restored.data.session) return restored.data.session;
      }
    } catch {
      // Ignore malformed legacy session; auth.ts will clean it up.
    }
  }

  throw new Error('Not authenticated');
}

function buildHeaders(session: Session, input?: HeadersInit, isFormData = false): Headers {
  const headers = new Headers(input || {});
  headers.set('Authorization', `Bearer ${session.access_token}`);
  headers.set('apikey', publicAnonKey);
  headers.set('x-lifeos-date', localDateKey());
  if (!isFormData && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return headers;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  let payload: any = null;
  if (contentType.includes('application/json')) {
    payload = await response.json().catch(() => null);
  } else {
    const text = await response.text().catch(() => '');
    payload = text || null;
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || `HTTP ${response.status}`;
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return payload as T;
}

async function rawAuthorizedRequest<T>(
  path: string,
  options: RequestInit,
  session: Session,
  retryAuth = true,
): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: buildHeaders(session, options.headers, isFormData),
    });

    if (response.status === 401 && retryAuth) {
      const refreshed = await supabase.auth.refreshSession();
      if (refreshed.data.session) {
        return rawAuthorizedRequest<T>(path, options, refreshed.data.session, false);
      }
    }

    return await parseResponse<T>(response);
  } catch (error) {
    throw new Error(networkErrorMessage(error));
  }
}

function readLegacyStore(): Record<string, any> {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_STORE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function isLegacyKeyForUser(key: string, userId: string): boolean {
  const parts = key.split(':');
  return parts.length >= 2 && parts[1] === userId;
}

function dataUrlToFile(dataUrl: string, name: string, fallbackType = 'application/octet-stream'): File {
  const match = /^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error('Invalid legacy document data');
  const mime = match[1] || fallbackType;
  const encoded = match[3] || '';
  const binary = match[2] ? atob(encoded) : decodeURIComponent(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name || 'document', { type: mime });
}

/**
 * One-time migration for users who installed a previous LifeOS build where all
 * entities and uploaded documents lived in localStorage. Server-side writes are
 * idempotent; successful keys are removed locally only after the cloud accepts them.
 */
async function migrateLegacyLocalData(session: Session): Promise<void> {
  const userId = session.user.id;
  const store = readLegacyStore();
  const userEntries = Object.entries(store).filter(([key]) => isLegacyKeyForUser(key, userId));
  if (!userEntries.length) return;

  const ordinaryEntries = userEntries.filter(([key]) => !key.startsWith(`docs:${userId}:`));
  const docEntries = userEntries.filter(([key]) => key.startsWith(`docs:${userId}:`));
  const migratedKeys = new Set<string>();

  if (ordinaryEntries.length) {
    await rawAuthorizedRequest('/migration/local-store', {
      method: 'POST',
      body: JSON.stringify({ entries: Object.fromEntries(ordinaryEntries) }),
    }, session);
    ordinaryEntries.forEach(([key]) => migratedKeys.add(key));
  }

  for (const [key, value] of docEntries) {
    const doc = value && typeof value === 'object' ? value : null;
    if (!doc?.url || typeof doc.url !== 'string' || !doc.url.startsWith('data:')) continue;
    try {
      const file = dataUrlToFile(doc.url, doc.name || 'document', doc.fileType);
      const form = new FormData();
      form.append('file', file, file.name);
      form.append('name', doc.name || file.name);
      form.append('category', doc.category || 'عام');
      if (doc.id) form.append('legacyId', String(doc.id));
      await rawAuthorizedRequest('/documents', { method: 'POST', body: form }, session);
      migratedKeys.add(key);
    } catch (error) {
      console.warn('[api] legacy document migration skipped:', key, error);
    }
  }

  if (!migratedKeys.size) return;
  const latest = readLegacyStore();
  migratedKeys.forEach(key => { delete latest[key]; });
  if (Object.keys(latest).length) localStorage.setItem(LEGACY_STORE_KEY, JSON.stringify(latest));
  else localStorage.removeItem(LEGACY_STORE_KEY);
}

async function ensureLegacyMigration(session: Session): Promise<void> {
  if (legacyMigrationUserId !== session.user.id) {
    legacyMigrationUserId = session.user.id;
    legacyMigrationPromise = null;
  }
  if (!legacyMigrationPromise) {
    legacyMigrationPromise = migrateLegacyLocalData(session).catch(error => {
      // Cloud API remains usable even if legacy migration temporarily fails.
      // Keep the local copy so migration can retry on the next app launch.
      console.warn('[api] legacy localStorage migration deferred:', error);
    });
  }
  await legacyMigrationPromise;
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  try {
    const session = await getAuthenticatedSession();
    await ensureLegacyMigration(session);
    return await rawAuthorizedRequest<T>(path, { ...options, method }, session);
  } catch (error) {
    console.error(`[api] ${method} ${path} →`, error);
    throw error;
  }
}

export async function apiUpload<T = any>(path: string, formData: FormData): Promise<T> {
  try {
    const session = await getAuthenticatedSession();
    await ensureLegacyMigration(session);
    return await rawAuthorizedRequest<T>(path, { method: 'POST', body: formData }, session);
  } catch (error) {
    console.error(`[apiUpload] POST ${path} →`, error);
    throw error;
  }
}
