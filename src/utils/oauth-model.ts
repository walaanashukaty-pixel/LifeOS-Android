export const GOOGLE_AUTH_REDIRECT = 'com.lifeos.app://auth/callback';

export interface ParsedAuthCallback {
  code: string | null;
  flowId: string | null;
  error: string | null;
  errorDescription: string | null;
}

export function isLifeOSAuthCallback(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'com.lifeos.app:' && url.hostname === 'auth' && url.pathname === '/callback';
  } catch {
    return false;
  }
}

export function parseAuthCallback(rawUrl: string): ParsedAuthCallback | null {
  if (!isLifeOSAuthCallback(rawUrl)) return null;
  const url = new URL(rawUrl);
  const fragmentParams = new URLSearchParams(url.hash.replace(/^#/, ''));
  const get = (key: string) => url.searchParams.get(key) ?? fragmentParams.get(key);
  return {
    code: get('code'),
    flowId: get('sb_flow_id'),
    error: get('error'),
    errorDescription: get('error_description'),
  };
}
