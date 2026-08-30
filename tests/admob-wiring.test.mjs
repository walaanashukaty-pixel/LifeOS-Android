import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('package includes Capacitor AdMob v8 and ads test command', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  assert.match(String(pkg.dependencies?.['@capacitor-community/admob'] || ''), /^8\./);
  assert.match(String(pkg.scripts?.['test:ads'] || ''), /reward-policy/);
});

test('Android AdMob patch injects exactly the Google application id metadata key', async () => {
  const source = await readFile('scripts/patch-android-admob.mjs', 'utf8');
  assert.match(source, /com\.google\.android\.gms\.ads\.APPLICATION_ID/);
  assert.match(source, /ADMOB_ANDROID_APP_ID/);
  assert.match(source, /LIFEOS_ADMOB_TEST_MODE/);
});

test('workflow supplies AdMob ids, runs ads tests, and patches manifest after Capacitor sync', async () => {
  const yaml = await readFile('.github/workflows/main.yml', 'utf8');
  assert.match(yaml, /VITE_ADMOB_REWARDED_AD_UNIT_ID/);
  assert.match(yaml, /ADMOB_ANDROID_APP_ID/);
  assert.match(yaml, /npm run test:ads/);
  const sync = yaml.indexOf('npx cap sync android');
  const patch = yaml.indexOf('run: node scripts/patch-android-admob.mjs');
  assert.ok(sync >= 0 && patch > sync);
});


test('authenticated app uses one monetization provider and account shares its subscription state', async () => {
  const app = await readFile('src/app/App.tsx', 'utf8');
  const account = await readFile('src/app/components/AccountPage.tsx', 'utf8');
  const provider = await readFile('src/app/monetization/MonetizationProvider.tsx', 'utf8');
  assert.match(app, /MonetizationProvider/);
  assert.match(provider, /guardCreation/);
  assert.match(provider, /configureSubscriptions/);
  assert.match(account, /useMonetization/);
  assert.match(account, /RewardStatus/);
  assert.doesNotMatch(account, /configureSubscriptions/);
});

test('AdMob v8 wiring does not import the non-exported PrivacyOptionsRequirementStatus enum', async () => {
  const source = await readFile('src/utils/ads/ad-service.ts', 'utf8');
  assert.doesNotMatch(source, /import[\s\S]*PrivacyOptionsRequirementStatus[\s\S]*from ['\"]@capacitor-community\/admob['\"]/);
  assert.match(source, /privacyOptionsRequirementStatus === ['\"]REQUIRED['\"]/);
});

test('reward ads are requested only after UMP consent says ads can be requested', async () => {
  const source = await readFile('src/utils/ads/ad-service.ts', 'utf8');
  assert.match(source, /AdMob\.requestConsentInfo\(\)/);
  assert.match(source, /AdmobConsentStatus\.REQUIRED/);
  assert.match(source, /AdMob\.showConsentForm\(\)/);
  assert.match(source, /privacyOptionsRequirementStatus/);
  assert.match(source, /AdMob\.showPrivacyOptionsForm\(\)/);
  const consentCheck = source.indexOf('consent.canRequestAds !== true');
  const prepare = source.indexOf('AdMob.prepareRewardVideoAd');
  assert.ok(consentCheck >= 0 && prepare > consentCheck);
});

test('Pro subscription is resolved before consent UI is prepared, and daily rewards refresh after midnight', async () => {
  const provider = await readFile('src/app/monetization/MonetizationProvider.tsx', 'utf8');
  assert.match(
    provider,
    /configureSubscriptions\(userId\)[\s\S]*if \(!state\.isPro\)[\s\S]*prepareAdPrivacy\(\)/,
  );
  assert.match(provider, /rewards\.dateKey !== localDateKey\(\)/);
});

test('test APK workflow falls back to Google demo rewarded IDs until production AdMob secrets exist', async () => {
  const yaml = await readFile('.github/workflows/main.yml', 'utf8');
  assert.match(yaml, /ca-app-pub-3940256099942544\/5224354917/);
  assert.match(yaml, /LIFEOS_ADMOB_TEST_MODE/);
  assert.match(yaml, /secrets\.ADMOB_ANDROID_APP_ID/);
});

test('creation gates wait for initial subscription and reward snapshots before deciding at a limit', async () => {
  const provider = await readFile('src/app/monetization/MonetizationProvider.tsx', 'utf8');
  assert.match(provider, /subscriptionReadyRef/);
  assert.match(provider, /rewardReadyRef/);
  assert.match(provider, /await subscriptionReadyRef\.current/);
  assert.match(provider, /await rewardReadyRef\.current/);
});

test('ads test command includes page-level gate contracts', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  assert.match(String(pkg.scripts?.['test:ads'] || ''), /page-gates\.test\.mjs/);
});

test('Pro paywall promises the implemented ad-free and unlimited-capacity benefits', async () => {
  const source = await readFile('src/app/components/ProPaywall.tsx', 'utf8');
  assert.match(source, /بدون إعلانات/);
  assert.match(source, /بلا حدود/);
});

test('CI switches the whole AdMob pair to demo mode if either production identifier is missing', async () => {
  const script = await readFile('scripts/patch-android-admob.mjs', 'utf8');
  const yaml = await readFile('.github/workflows/main.yml', 'utf8');
  assert.match(script, /const testMode/);
  assert.match(script, /testMode \? demoAppId/);
  assert.match(yaml, /secrets\.ADMOB_ANDROID_APP_ID[\s\S]*secrets\.VITE_ADMOB_REWARDED_AD_UNIT_ID[\s\S]*LIFEOS_ADMOB_TEST_MODE/);
});
