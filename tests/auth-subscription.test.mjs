import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GOOGLE_AUTH_REDIRECT,
  isLifeOSAuthCallback,
  parseAuthCallback,
} from '../src/utils/oauth-model.ts';
import {
  extractCustomerInfo,
  hasProEntitlement,
  toSubscriptionState,
} from '../src/utils/subscription-model.ts';
import {
  GoogleAuthCancelledError,
  exchangeNativeGoogleToken,
  googleAuthStrategy,
} from '../src/utils/google-auth-flow.ts';

test('google auth redirect uses the LifeOS Android custom scheme', () => {
  assert.equal(GOOGLE_AUTH_REDIRECT, 'com.lifeos.app://auth/callback');
});

test('recognizes and parses LifeOS OAuth callback with code and flow id', () => {
  const url = 'com.lifeos.app://auth/callback?code=abc123&sb_flow_id=flow-9';
  assert.equal(isLifeOSAuthCallback(url), true);
  assert.deepEqual(parseAuthCallback(url), {
    code: 'abc123',
    flowId: 'flow-9',
    error: null,
    errorDescription: null,
  });
});

test('rejects unrelated deep links', () => {
  const url = 'com.lifeos.app://notifications/task/123';
  assert.equal(isLifeOSAuthCallback(url), false);
  assert.equal(parseAuthCallback(url), null);
});

test('parses OAuth callback errors without inventing a session', () => {
  const result = parseAuthCallback('com.lifeos.app://auth/callback?error=access_denied&error_description=User%20cancelled');
  assert.deepEqual(result, {
    code: null,
    flowId: null,
    error: 'access_denied',
    errorDescription: 'User cancelled',
  });
});

test('parses OAuth errors returned in the URL fragment', () => {
  const result = parseAuthCallback('com.lifeos.app://auth/callback#error=server_error&error_description=OAuth%20failed');
  assert.equal(result?.error, 'server_error');
  assert.equal(result?.errorDescription, 'OAuth failed');
});

test('pro entitlement is active only when RevenueCat marks it active', () => {
  assert.equal(hasProEntitlement({ entitlements: { active: { pro: { isActive: true } } } }), true);
  assert.equal(hasProEntitlement({ entitlements: { active: {} } }), false);
  assert.equal(hasProEntitlement(null), false);
});

test('subscription state fails closed to free when entitlement is absent', () => {
  assert.deepEqual(toSubscriptionState({ entitlements: { active: {} } }), {
    plan: 'free',
    isPro: false,
    available: true,
    expirationDate: null,
    willRenew: false,
  });
});

test('subscription state maps active pro metadata', () => {
  assert.deepEqual(toSubscriptionState({
    entitlements: {
      active: {
        pro: {
          isActive: true,
          expirationDate: '2026-09-27T12:00:00Z',
          willRenew: true,
        },
      },
    },
  }), {
    plan: 'pro',
    isPro: true,
    available: true,
    expirationDate: '2026-09-27T12:00:00Z',
    willRenew: true,
  });
});


test('extracts RevenueCat customer info from direct and wrapped Capacitor results', () => {
  const info = { entitlements: { active: { pro: { isActive: true } } } };
  assert.equal(extractCustomerInfo(info), info);
  assert.equal(extractCustomerInfo({ customerInfo: info }), info);
});


test('native Google auth uses ID-token strategy while web keeps OAuth', () => {
  assert.equal(googleAuthStrategy(true), 'native-id-token');
  assert.equal(googleAuthStrategy(false), 'web-oauth');
});

test('native Google ID token is handed to Supabase with provider google', async () => {
  const calls = [];
  const session = { access_token: 'a', refresh_token: 'r' };
  const result = await exchangeNativeGoogleToken(
    async () => 'google.jwt.token',
    async credentials => {
      calls.push(credentials);
      return { data: { session, user: { id: 'u1' } }, error: null };
    },
  );
  assert.deepEqual(calls, [{ provider: 'google', token: 'google.jwt.token' }]);
  assert.equal(result.session, session);
});

test('native Google cancellation remains a cancellation and creates no Supabase call', async () => {
  let calls = 0;
  await assert.rejects(
    exchangeNativeGoogleToken(
      async () => { throw new GoogleAuthCancelledError(); },
      async () => { calls += 1; return { data: {}, error: null }; },
    ),
    GoogleAuthCancelledError,
  );
  assert.equal(calls, 0);
});

test('GitHub workflow injects Google web client id at build time', async () => {
  const { readFile } = await import('node:fs/promises');
  const workflow = await readFile('.github/workflows/main.yml', 'utf8');
  assert.match(workflow, /VITE_GOOGLE_WEB_CLIENT_ID:\s*\$\{\{ secrets\.VITE_GOOGLE_WEB_CLIENT_ID \}\}/);
});

test('GitHub workflow forces Gradle to use the stable signing key and verifies the built APK certificate', async () => {
  const { readFile } = await import('node:fs/promises');
  const workflow = await readFile('.github/workflows/main.yml', 'utf8');
  assert.match(workflow, /LIFEOS_DEBUG_KEYSTORE_BASE64:\s*\$\{\{ secrets\.LIFEOS_DEBUG_KEYSTORE_BASE64 \}\}/);
  assert.match(workflow, /LIFEOS_DEBUG_KEYSTORE_PATH/);
  assert.match(workflow, /signingConfigs\.lifeosDebug/);
  assert.match(workflow, /APKSIGNER=.*apksigner/);
  assert.match(workflow, /verify --print-certs/);
  assert.match(workflow, /Actual APK SHA-1/);
  assert.match(workflow, /LifeOS-SHA1\.txt/);
});
