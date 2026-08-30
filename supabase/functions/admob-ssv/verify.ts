const KEY_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json';
const MAX_KEY_AGE_MS = 24 * 60 * 60 * 1000;

interface VerificationKey { keyId: number; pem?: string; base64?: string }
interface KeyResponse { keys?: VerificationKey[] }

let keyCache: { at: number; keys: Map<number, VerificationKey> } | null = null;

export interface VerifiedSsv {
  userId: string;
  transactionId: string;
  rewardAmount: number;
  adUnit: string | null;
  timestampMs: number;
  customData: string | null;
}

function base64UrlToBytes(value: string): Uint8Array {
  let normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4) normalized += '=';
  const raw = atob(normalized);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

function pemToBytes(pem: string): Uint8Array {
  const body = pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, '');
  const raw = atob(body);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

function derToP1363(der: Uint8Array): Uint8Array {
  if (der[0] !== 0x30) throw new Error('Invalid DER signature');
  let offset = 2;
  if (der[1] & 0x80) offset = 2 + (der[1] & 0x7f);
  if (der[offset] !== 0x02) throw new Error('Invalid DER r');
  const rLen = der[offset + 1];
  const r = der.slice(offset + 2, offset + 2 + rLen);
  offset += 2 + rLen;
  if (der[offset] !== 0x02) throw new Error('Invalid DER s');
  const sLen = der[offset + 1];
  const s = der.slice(offset + 2, offset + 2 + sLen);
  const out = new Uint8Array(64);
  const rr = r[0] === 0 ? r.slice(1) : r;
  const ss = s[0] === 0 ? s.slice(1) : s;
  if (rr.length > 32 || ss.length > 32) throw new Error('Invalid ECDSA scalar size');
  out.set(rr, 32 - rr.length);
  out.set(ss, 64 - ss.length);
  return out;
}

async function loadKeys(): Promise<Map<number, VerificationKey>> {
  if (keyCache && Date.now() - keyCache.at < MAX_KEY_AGE_MS) return keyCache.keys;
  const res = await fetch(KEY_URL);
  if (!res.ok) throw new Error(`AdMob key fetch failed: ${res.status}`);
  const body = await res.json() as KeyResponse;
  const map = new Map<number, VerificationKey>();
  for (const key of body.keys ?? []) map.set(Number(key.keyId), key);
  if (!map.size) throw new Error('No AdMob verification keys');
  keyCache = { at: Date.now(), keys: map };
  return map;
}

function normalizeTimestampMs(raw: number): number {
  // Google documentation examples can contain microsecond-scale values.
  return raw > 100_000_000_000_000 ? Math.floor(raw / 1000) : raw;
}

export async function verifyAdMobSsv(requestUrl: string): Promise<VerifiedSsv> {
  const queryStart = requestUrl.indexOf('?');
  if (queryStart < 0) throw new Error('Missing query');
  const fragmentStart = requestUrl.indexOf('#', queryStart + 1);
  const rawQuery = requestUrl.slice(queryStart + 1, fragmentStart >= 0 ? fragmentStart : undefined);
  const marker = '&signature=';
  const signatureIndex = rawQuery.indexOf(marker);
  if (signatureIndex < 0) throw new Error('Missing signature');
  const dataToVerify = rawQuery.slice(0, signatureIndex);
  const trailing = rawQuery.slice(signatureIndex + 1);
  const trailingParams = new URLSearchParams(trailing);
  const signature = trailingParams.get('signature');
  const keyId = Number(trailingParams.get('key_id'));
  if (!signature || !Number.isFinite(keyId)) throw new Error('Invalid signature parameters');

  const keys = await loadKeys();
  const key = keys.get(keyId);
  if (!key) throw new Error('Unknown AdMob key');
  const spki = key.pem ? pemToBytes(key.pem) : key.base64 ? Uint8Array.from(atob(key.base64), c => c.charCodeAt(0)) : null;
  if (!spki) throw new Error('Invalid AdMob key');
  const publicKey = await crypto.subtle.importKey('spki', spki, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const sigRaw = derToP1363(base64UrlToBytes(signature));
  const verified = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    sigRaw,
    new TextEncoder().encode(dataToVerify),
  );
  if (!verified) throw new Error('Invalid AdMob signature');

  const signedParams = new URLSearchParams(dataToVerify);
  const userId = signedParams.get('user_id') ?? '';
  const transactionId = signedParams.get('transaction_id') ?? '';
  const rewardAmount = Number(signedParams.get('reward_amount'));
  const timestampMs = normalizeTimestampMs(Number(signedParams.get('timestamp')));
  if (!userId || !transactionId || !Number.isFinite(rewardAmount) || rewardAmount <= 0) throw new Error('Invalid SSV payload');
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 7 * 24 * 60 * 60 * 1000) throw new Error('Invalid SSV timestamp');

  return {
    userId,
    transactionId,
    rewardAmount,
    adUnit: signedParams.get('ad_unit'),
    timestampMs,
    customData: signedParams.get('custom_data'),
  };
}
