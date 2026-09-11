import { Capacitor } from '@capacitor/core';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from './api';
import { exchangeNativeGoogleToken, googleAuthStrategy } from './google-auth-flow';

export interface User {
  id: string;
  email: string;
  name?: string;
}

function persistSession(session: Session | null) {
  if (session) localStorage.setItem('lifeos_session', JSON.stringify(session));
  else localStorage.removeItem('lifeos_session');
}

// Sign up: create user via Supabase Auth directly (no edge function needed).
export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw new Error(error.message);
  if (data.session) {
    persistSession(data.session);
    return data.user;
  }
  return signIn(email, password);
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.session) throw new Error('لم يتم إنشاء جلسة');
  persistSession(data.session);
  return data.user;
}

export async function signInWithGoogle(): Promise<any | void> {
  if (googleAuthStrategy(Capacitor.isNativePlatform()) === 'native-id-token') {
    const { getNativeGoogleIdToken } = await import('./native-google-auth');
    const data = await exchangeNativeGoogleToken(
      getNativeGoogleIdToken,
      credentials => supabase.auth.signInWithIdToken(credentials),
    );
    persistSession(data.session);
    return data.user;
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw new Error(error.message);
}

export function subscribeToAuthChanges(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (session) persistSession(session);
    if (event === 'SIGNED_OUT') persistSession(null);
    callback(event, session);
  });
  return () => data.subscription.unsubscribe();
}

function clearLocalUserData(): void {
  // lifeos_data is legacy data from old local-only builds. Removing it on logout
  // prevents a second account on the same device from seeing the previous user's data.
  localStorage.removeItem('lifeos_data');
  localStorage.removeItem('lifeos_notification_target');
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key?.startsWith('lifeos_notification_')) localStorage.removeItem(key);
  }
}

export async function signOut() {
  // Clear sensitive device state first; privacy must not depend on network reachability.
  persistSession(null);
  clearLocalUserData();
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      // Remote revocation may fail while offline; still evict the SDK-managed local session.
      await supabase.auth.signOut({ scope: 'local' });
    }
  } catch {
    // If the request itself cannot be reached, force the SDK's local session out.
    try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* already cleared locally */ }
  } finally {
    if (Capacitor.isNativePlatform()) {
      try {
        const { clearNativeGoogleCredentialState } = await import('./native-google-auth');
        await clearNativeGoogleCredentialState();
      } catch { /* local sign-out still completed */ }
    }
  }
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return atob(padded);
}

// Decode user identity from a JWT without a network call. Offline fallback is
// accepted only while the JWT itself is still valid.
function decodeJwtUser(token: string): any {
  try {
    const payload = JSON.parse(decodeBase64Url(token.split('.')[1] || ''));
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!payload?.sub || !Number.isFinite(Number(payload.exp)) || Number(payload.exp) <= nowSeconds) return null;
    if (payload.nbf && Number(payload.nbf) > nowSeconds) return null;
    return { id: payload.sub, email: payload.email ?? '', user_metadata: payload.user_metadata ?? {} };
  } catch { return null; }
}

export async function getSession() {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) return { user: data.session.user, session: data.session };
  } catch { /* ignore */ }

  const stored = localStorage.getItem('lifeos_session');
  if (!stored) return null;

  let parsed: any;
  try { parsed = JSON.parse(stored); } catch {
    localStorage.removeItem('lifeos_session');
    return null;
  }

  if (!parsed?.access_token || !parsed?.refresh_token) {
    localStorage.removeItem('lifeos_session');
    return null;
  }

  try {
    const { data, error } = await supabase.auth.setSession({
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
    });

    if (!error && data?.user) {
      if (data.session) persistSession(data.session);
      return { user: data.user, session: data.session ?? parsed };
    }

    if (error && !error.message.includes('Failed to fetch') && !error.message.includes('NetworkError')) {
      console.error('[auth] session rejected:', error.message);
      localStorage.removeItem('lifeos_session');
      return null;
    }
  } catch { /* network down — fall through */ }

  const user = decodeJwtUser(parsed.access_token);
  if (!user) {
    console.warn('[auth] cached session is expired or invalid; offline fallback rejected.');
    localStorage.removeItem('lifeos_session');
    return null;
  }
  console.warn('[auth] Supabase unreachable — using cached session. Project may be paused.');
  return { user, session: parsed };
}

// Keep localStorage in sync with SDK-managed token refreshes.
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' && session) persistSession(session);
  if (event === 'SIGNED_OUT') { persistSession(null); clearLocalUserData(); }
});
