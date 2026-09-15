# Native Google Sign-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace browser-based Google OAuth on Android with the native Google account chooser, exchange the Google ID token with Supabase Auth, and keep the existing web OAuth and email/password flows unchanged.

**Architecture:** Use `@capawesome/capacitor-google-sign-in@0.1.3` as the Android Credential Manager adapter. Keep native plugin details in a small adapter and put the ID-token-to-Supabase exchange in a dependency-injected flow that can be tested in Node without Android. `auth.ts` chooses the native flow only when Capacitor reports a native platform; web continues using `supabase.auth.signInWithOAuth`.

**Tech Stack:** React 18, TypeScript 5.9, Capacitor 8.5, `@capawesome/capacitor-google-sign-in` 0.1.3, Supabase JS 2.108+, Android Credential Manager, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-27-native-google-signin-design.md`

## Global Constraints

- Android package ID remains exactly `com.lifeos.app`.
- Supabase remains the single application authentication/session system.
- Email/password sign-in and sign-up behavior remain unchanged.
- Web Google sign-in remains Supabase browser OAuth.
- Android Google sign-in uses the native account chooser and `supabase.auth.signInWithIdToken({ provider: 'google', token })`.
- Existing Supabase users, app data behavior, Free/Pro model, RevenueCat identity, notifications, and desktop UI remain unchanged.
- Production OAuth uses the SHA-1 from Google Play App Signing; APK testing outside Play must use one stable test signing key.
- No private signing keys, keystore bytes, passwords, Google client secrets, or RevenueCat secrets are committed to the repository.
- The native Google SDK receives the **Web OAuth client ID** via `VITE_GOOGLE_WEB_CLIENT_ID`; the Android OAuth client separately registers `com.lifeos.app` plus the matching signing SHA-1.

---

## File Structure

- Create `src/utils/google-auth-flow.ts` — platform-independent native Google ID-token exchange and typed cancellation/error contract.
- Create `src/utils/native-google-auth.ts` — Capacitor/Capawesome adapter; initializes the native plugin and returns a Google ID token.
- Modify `src/utils/auth.ts` — route Android/native Google login through the adapter, preserve web OAuth, and clear native Google credential state on logout.
- Modify `src/app/components/AuthPage.tsx` — treat user cancellation silently while preserving existing Arabic errors for real failures.
- Modify `src/app/App.tsx` — stop registering the old Android OAuth callback listener because native Google sign-in no longer redirects through the custom scheme.
- Modify `tests/auth-subscription.test.mjs` — add deterministic tests for token exchange, cancellation, and platform strategy.
- Modify `package.json` — add `@capawesome/capacitor-google-sign-in@0.1.3`.
- Modify `.env.example` — document `VITE_GOOGLE_WEB_CLIENT_ID`.
- Create `scripts/verify-google-auth-config.mjs` — fail Android CI early when the Web OAuth client ID is absent or malformed.
- Create `scripts/create-google-test-key.ps1` and `CREATE_GOOGLE_TEST_KEY.bat` — generate one local test-only Android signing key and print its SHA-1 without committing it.
- Modify `.gitignore` — ignore `*.jks`, `*.keystore`, and generated key helper outputs.
- Modify `.github/workflows/main.yml` — pass `VITE_GOOGLE_WEB_CLIENT_ID`, verify configuration, and optionally restore a stable test debug keystore from a GitHub secret before Gradle builds.
- Modify `GOOGLE_AUTH_AND_PRO_SETUP_AR.md` and `README_MOBILE_AR.md` — replace the old browser/deep-link Android instructions with native Android OAuth setup.

---

### Task 1: Testable Native Google Authentication Core

**Files:**
- Create: `src/utils/google-auth-flow.ts`
- Test: `tests/auth-subscription.test.mjs`

**Interfaces:**
- Produces: `GoogleAuthCancelledError extends Error`
- Produces: `exchangeNativeGoogleToken(getIdToken, signInWithIdToken): Promise<unknown>`
- Produces: `googleAuthStrategy(isNative: boolean): 'native-id-token' | 'web-oauth'`

- [ ] **Step 1: Add failing strategy and token-exchange tests**

Append tests equivalent to:

```js
import {
  GoogleAuthCancelledError,
  exchangeNativeGoogleToken,
  googleAuthStrategy,
} from '../src/utils/google-auth-flow.ts';

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
```

- [ ] **Step 2: Run the auth test and verify it fails**

Run:

```bash
npm run test:auth
```

Expected: FAIL because `src/utils/google-auth-flow.ts` does not exist yet.

- [ ] **Step 3: Implement the minimal pure authentication core**

Create a module with no Capacitor/plugin imports:

```ts
export class GoogleAuthCancelledError extends Error {
  constructor() {
    super('Google sign-in cancelled');
    this.name = 'GoogleAuthCancelledError';
  }
}

export type SupabaseIdTokenCredentials = {
  provider: 'google';
  token: string;
};

export function googleAuthStrategy(isNative: boolean) {
  return isNative ? 'native-id-token' as const : 'web-oauth' as const;
}

export async function exchangeNativeGoogleToken(
  getIdToken: () => Promise<string>,
  signInWithIdToken: (credentials: SupabaseIdTokenCredentials) => Promise<any>,
) {
  const token = await getIdToken();
  if (!token) throw new Error('لم يصل رمز تسجيل الدخول من Google');
  const result = await signInWithIdToken({ provider: 'google', token });
  if (result?.error) throw new Error(result.error.message || 'تعذر تسجيل الدخول باستخدام Google');
  if (!result?.data?.session) throw new Error('لم يتم إنشاء جلسة');
  return result.data;
}
```

- [ ] **Step 4: Run the auth tests and verify they pass**

Run: `npm run test:auth`

Expected: all existing subscription/auth model tests plus the three new tests PASS.

- [ ] **Step 5: Commit the core**

```bash
git add src/utils/google-auth-flow.ts tests/auth-subscription.test.mjs
git commit -m "test: define native google auth flow"
```

---

### Task 2: Native Credential Manager Adapter and Supabase Integration

**Files:**
- Create: `src/utils/native-google-auth.ts`
- Modify: `src/utils/auth.ts`
- Modify: `src/app/components/AuthPage.tsx`
- Modify: `src/app/App.tsx`
- Modify: `package.json`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `GoogleAuthCancelledError`, `exchangeNativeGoogleToken`, `googleAuthStrategy` from Task 1.
- Produces: `getNativeGoogleIdToken(): Promise<string>`
- Produces: updated `signInWithGoogle(): Promise<unknown>` returning the Supabase user for native success and preserving redirect behavior on web.
- Produces: `signOut()` that clears both Supabase and native Google credential state when available.

- [ ] **Step 1: Add the Capacitor 8 compatible Google plugin dependency and public client-ID setting**

Add to dependencies:

```json
"@capawesome/capacitor-google-sign-in": "0.1.3"
```

Add to `.env.example`:

```dotenv
# Public Google Web OAuth client ID used by Android Credential Manager to request an ID token.
VITE_GOOGLE_WEB_CLIENT_ID=123456789-example.apps.googleusercontent.com
```

- [ ] **Step 2: Implement the native plugin adapter**

Create `src/utils/native-google-auth.ts` that lazily initializes exactly once:

```ts
import { ErrorCode, GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { GoogleAuthCancelledError } from './google-auth-flow';

let initializedForClientId: string | null = null;

function googleWebClientId(): string {
  const clientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!clientId) throw new Error('إعداد تسجيل Google غير مكتمل');
  return clientId;
}

export async function getNativeGoogleIdToken(): Promise<string> {
  const clientId = googleWebClientId();
  if (initializedForClientId !== clientId) {
    await GoogleSignIn.initialize({ clientId });
    initializedForClientId = clientId;
  }

  try {
    const result = await GoogleSignIn.signIn();
    if (!result.idToken) throw new Error('لم يصل رمز تسجيل الدخول من Google');
    return result.idToken;
  } catch (error: any) {
    if (error?.code === ErrorCode.SignInCanceled) throw new GoogleAuthCancelledError();
    if (error?.code === ErrorCode.NoCredentialAvailable) {
      throw new Error('لم يتم العثور على حساب Google متاح على الجهاز');
    }
    if (error?.code === ErrorCode.ProviderConfigurationError) {
      throw new Error('إعداد Google على هذا الإصدار من التطبيق غير صحيح');
    }
    throw error instanceof Error ? error : new Error('تعذر تسجيل الدخول باستخدام Google');
  }
}

export async function clearNativeGoogleCredentialState(): Promise<void> {
  try { await GoogleSignIn.signOut(); } catch { /* Supabase logout must still complete */ }
}
```

- [ ] **Step 3: Route native sign-in through ID-token exchange and keep web OAuth unchanged**

Change `signInWithGoogle()` in `src/utils/auth.ts` so native does:

```ts
if (googleAuthStrategy(Capacitor.isNativePlatform()) === 'native-id-token') {
  const { getNativeGoogleIdToken } = await import('./native-google-auth');
  const data = await exchangeNativeGoogleToken(
    getNativeGoogleIdToken,
    credentials => supabase.auth.signInWithIdToken(credentials),
  );
  persistSession(data.session);
  return data.user;
}
```

The web branch must keep:

```ts
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/`,
    queryParams: { prompt: 'select_account' },
  },
});
```

Remove native Browser OAuth from this function. Remove `setupGoogleAuthDeepLinkListener` and its imports only after `App.tsx` no longer calls it.

- [ ] **Step 4: Make native success update the login screen immediately and cancellation silent**

Update `AuthPage.tsx`:

```ts
const user = await signInWithGoogle();
if (user) {
  toast.success('مرحباً بك في LifeOS!');
  onSuccess(user);
}
```

In its catch block:

```ts
if (err instanceof GoogleAuthCancelledError) return;
toast.error(err.message || 'تعذر تسجيل الدخول باستخدام Google');
```

Import `GoogleAuthCancelledError` from the pure flow module.

- [ ] **Step 5: Remove the obsolete native OAuth callback listener from the application root**

Delete `setupGoogleAuthDeepLinkListener` from the `App.tsx` import, remove `cleanupDeepLink`, and remove its registration. Keep `subscribeToAuthChanges` intact.

- [ ] **Step 6: Clear Google Credential Manager state during logout**

After `supabase.auth.signOut()` succeeds, native platforms dynamically import `clearNativeGoogleCredentialState()` and call it, then clear `lifeos_session`. A native plugin cleanup failure must not block Supabase logout.

- [ ] **Step 7: Install dependencies and run tests/build**

Run:

```bash
npm install --no-audit --no-fund
npm run test:auth
npm run test:mobile
npm run build
```

Expected: tests PASS and Vite build exits 0.

- [ ] **Step 8: Commit native Google integration**

```bash
git add package.json package-lock.json .env.example src/utils/native-google-auth.ts src/utils/auth.ts src/app/components/AuthPage.tsx src/app/App.tsx
git commit -m "feat: add native google sign in on android"
```

---

### Task 3: Stable Test Signing and CI Guardrails

**Files:**
- Create: `scripts/verify-google-auth-config.mjs`
- Create: `scripts/create-google-test-key.ps1`
- Create: `CREATE_GOOGLE_TEST_KEY.bat`
- Modify: `.gitignore`
- Modify: `.github/workflows/main.yml`

**Interfaces:**
- Consumes: `VITE_GOOGLE_WEB_CLIENT_ID`.
- Consumes optional GitHub secret: `LIFEOS_TEST_KEYSTORE_BASE64`.
- Produces local helper output: `lifeos-google-test.keystore` and the SHA-1 shown in the terminal; the file stays ignored and local.
- Produces CI behavior: if the stable keystore secret exists, restore it to `$HOME/.android/debug.keystore` before `assembleDebug`; otherwise build remains possible but native Google login is explicitly not considered signing-stable.

- [ ] **Step 1: Add a CI configuration verifier**

Create `scripts/verify-google-auth-config.mjs`:

```js
const id = process.env.VITE_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';
if (!/^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(id)) {
  console.error('VITE_GOOGLE_WEB_CLIENT_ID is missing or malformed.');
  process.exit(1);
}
console.log('Google Web OAuth client ID is configured.');
```

- [ ] **Step 2: Add an ignored local stable test-key generator**

The PowerShell script must call `keytool` with a stable test alias and Android debug-compatible credentials:

```powershell
$key = Join-Path $PSScriptRoot '..\lifeos-google-test.keystore'
keytool -genkeypair -v -keystore $key -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=LifeOS Test,O=LifeOS,C=TR"
keytool -list -v -keystore $key -storepass android -alias androiddebugkey | Select-String 'SHA1:'
```

The BAT wrapper launches that script with PowerShell. If `keytool` is absent, print an Arabic message that Java/JDK is required and exit non-zero.

- [ ] **Step 3: Ignore signing artifacts**

Add:

```gitignore
*.jks
*.keystore
lifeos-google-test-keystore-base64.txt
```

- [ ] **Step 4: Update GitHub Actions environment and stable test-key restore**

Add to job environment:

```yaml
VITE_GOOGLE_WEB_CLIENT_ID: ${{ secrets.VITE_GOOGLE_WEB_CLIENT_ID }}
LIFEOS_TEST_KEYSTORE_BASE64: ${{ secrets.LIFEOS_TEST_KEYSTORE_BASE64 }}
```

After dependency install, run:

```yaml
- name: Verify Google authentication configuration
  run: node scripts/verify-google-auth-config.mjs
```

Before Gradle build, add:

```yaml
- name: Restore stable LifeOS test signing key
  if: ${{ env.LIFEOS_TEST_KEYSTORE_BASE64 != '' }}
  shell: bash
  run: |
    mkdir -p "$HOME/.android"
    printf '%s' "$LIFEOS_TEST_KEYSTORE_BASE64" | base64 --decode > "$HOME/.android/debug.keystore"
    keytool -list -v -keystore "$HOME/.android/debug.keystore" -storepass android -alias androiddebugkey | grep 'SHA1:'
```

- [ ] **Step 5: Verify workflow syntax and helper scripts**

Run:

```bash
node scripts/verify-google-auth-config.mjs
python - <<'PY'
import yaml
with open('.github/workflows/main.yml', encoding='utf-8') as f:
    yaml.safe_load(f)
print('workflow yaml ok')
PY
```

For the first command set a known-shape temporary public client ID in the environment. Expected: both commands exit 0.

- [ ] **Step 6: Commit signing/CI support**

```bash
git add scripts/verify-google-auth-config.mjs scripts/create-google-test-key.ps1 CREATE_GOOGLE_TEST_KEY.bat .gitignore .github/workflows/main.yml
git commit -m "build: support stable google test signing"
```

---

### Task 4: Android Sync Verification and Arabic Setup Guide

**Files:**
- Modify: `GOOGLE_AUTH_AND_PRO_SETUP_AR.md`
- Modify: `README_MOBILE_AR.md`
- Verify generated: `android/` (must remain ignored and not committed)

**Interfaces:**
- Consumes: native Google auth implementation and CI signing support.
- Produces: exact user setup sequence for Google Cloud, GitHub Secrets, Supabase, APK test, and later Play App Signing.

- [ ] **Step 1: Rewrite Android Google setup instructions in Arabic**

The guide must state this exact sequence:

```text
1) شغّل CREATE_GOOGLE_TEST_KEY.bat مرة واحدة فقط.
2) انسخ SHA-1 الظاهر.
3) في Google Cloud أنشئ Android OAuth Client:
   Package name = com.lifeos.app
   SHA-1 = البصمة التي ظهرت.
4) في نفس Google Cloud project أنشئ/استخدم Web OAuth Client.
5) انسخ Web Client ID فقط، وليس Client Secret، إلى GitHub Secret:
   VITE_GOOGLE_WEB_CLIENT_ID
6) حوّل lifeos-google-test.keystore إلى Base64 محلياً وأضف الناتج كـ:
   LIFEOS_TEST_KEYSTORE_BASE64
7) ابنِ APK من GitHub Actions وثبته على الهاتف.
8) جرّب زر "المتابعة باستخدام Google".
9) عند النشر على Google Play، انسخ SHA-1 من Play App Signing وأنشئ Android OAuth Client إضافياً له.
```

Clearly label the local test key as **testing only**, never production.

- [ ] **Step 2: Perform a fresh Capacitor Android verification**

Run:

```bash
rm -rf android dist
npm run build
npx cap add android
npx cap sync android
node scripts/patch-android-auth-deeplink.mjs
node scripts/patch-android-notifications.mjs
```

Expected: the Google plugin appears in Capacitor sync output and no dependency/configuration error occurs.

- [ ] **Step 3: Run Android Gradle compile**

Run:

```bash
cd android
./gradlew assembleDebug --no-daemon --stacktrace
```

Expected: `BUILD SUCCESSFUL` and `android/app/build/outputs/apk/debug/app-debug.apk` exists.

- [ ] **Step 4: Run complete regression verification**

Run from project root:

```bash
npm run test:auth
npm run test:mobile
npm run build
```

Expected: all tests PASS and build exits 0.

- [ ] **Step 5: Verify no signing material is tracked**

Run:

```bash
git status --short
git ls-files | grep -E '\.(jks|keystore)$' && exit 1 || true
```

Expected: no keystore/private signing file appears in tracked files.

- [ ] **Step 6: Commit documentation**

```bash
git add GOOGLE_AUTH_AND_PRO_SETUP_AR.md README_MOBILE_AR.md
git commit -m "docs: explain native google android setup"
```

---

## Final Verification Checklist

- [ ] Android Google button opens the native Google account chooser, not a browser OAuth tab.
- [ ] Selected Google account yields an ID token and Supabase receives `{ provider: 'google', token: <idToken> }`.
- [ ] Native success creates/persists the normal Supabase session and enters LifeOS.
- [ ] Cancelling the chooser keeps the login screen without a false session.
- [ ] Web Google login still uses Supabase OAuth redirect.
- [ ] Email/password sign-in and sign-up still work.
- [ ] Logout clears Supabase session and native Google credential state.
- [ ] Free/Pro RevenueCat identity still uses the Supabase `user.id`.
- [ ] GitHub Actions has a public Web OAuth client ID and can restore the same test signing key on each build.
- [ ] No private signing material or client secret is committed.
- [ ] Production setup documentation tells the user to add the Google Play App Signing SHA-1 separately.
