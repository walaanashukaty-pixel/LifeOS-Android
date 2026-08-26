import { supabase } from './api';

export interface User {
  id: string;
  email: string;
  name?: string;
}

// Sign up: create user via Supabase Auth directly (no edge function needed).
export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw new Error(error.message);
  // signUp may require email confirmation — if a session was returned sign in now,
  // otherwise the user must verify their email first.
  if (data.session) {
    localStorage.setItem('lifeos_session', JSON.stringify(data.session));
    return data.user;
  }
  // No session yet: fall back to signIn (works if email confirmation is disabled).
  return signIn(email, password);
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.session) throw new Error('لم يتم إنشاء جلسة');
  localStorage.setItem('lifeos_session', JSON.stringify(data.session));
  return data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
  localStorage.removeItem('lifeos_session');
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
  // 1. SDK in-memory session (fastest — no network).
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) return { user: data.session.user, session: data.session };
  } catch { /* ignore */ }

  // 2. Restore from localStorage.
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

  // 3. Try to load/refresh via SDK — this makes a network call.
  try {
    const { data, error } = await supabase.auth.setSession({
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
    });

    if (!error && data?.user) {
      if (data.session) localStorage.setItem('lifeos_session', JSON.stringify(data.session));
      return { user: data.user, session: data.session ?? parsed };
    }

    // Definitive auth rejection (invalid/revoked token) — clear and force re-login.
    if (error && !error.message.includes('Failed to fetch') && !error.message.includes('NetworkError')) {
      console.error('[auth] session rejected:', error.message);
      localStorage.removeItem('lifeos_session');
      return null;
    }
  } catch { /* network down — fall through */ }

  // 4. Network error: decode the JWT locally and keep the session alive.
  //    The access_token may still be valid — Supabase will reject it with 401
  //    on the first API call if it truly expired, at which point the user re-logs in.
  const user = decodeJwtUser(parsed.access_token);
  if (!user) { localStorage.removeItem('lifeos_session'); return null; }
  console.warn('[auth] Supabase unreachable — using cached session. Project may be paused.');
  return { user, session: parsed };
}

// Keep localStorage in sync with SDK-managed token refreshes.
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' && session) {
    localStorage.setItem('lifeos_session', JSON.stringify(session));
  }
  if (event === 'SIGNED_OUT') {
    localStorage.removeItem('lifeos_session');
  }
});
