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

export async function signOut() {
  await supabase.auth.signOut();
  if (Capacitor.isNativePlatform()) {
    const { clearNativeGoogleCredentialState } = await import('./native-google-auth');
    await clearNativeGoogleCredentialState();
  }
  persistSession(null);
}

// Decode user identity from a JWT without a network call.
function decodeJwtUser(token: string): any {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload?.sub) return null;
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
  if (!user) { localStorage.removeItem('lifeos_session'); return null; }
  console.warn('[auth] Supabase unreachable — using cached session. Project may be paused.');
  return { user, session: parsed };
}

// Keep localStorage in sync with SDK-managed token refreshes.
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' && session) persistSession(session);
  if (event === 'SIGNED_OUT') persistSession(null);
});
