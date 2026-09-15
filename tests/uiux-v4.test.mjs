import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('UIUX V4 closes the visual system with auth, analytics, vision, commitments and paywall polish', async () => {
  const theme = await read('src/styles/theme.css');
  const primitives = await read('src/app/components/ui/LifeOSPrimitives.tsx');
  assert.match(theme, /UI\/UX V4/);
  for (const cls of ['lifeos-auth-shell', 'lifeos-v4-life-score', 'lifeos-v4-vision-timeline', 'lifeos-v4-agreement-card', 'lifeos-v4-paywall']) assert.match(theme, new RegExp(`\\.${cls}`));
  assert.match(primitives, /export function ErrorState/);
});

test('auth becomes an accessible branded entry point without changing sign-in providers', async () => {
  const source = await read('src/app/components/AuthPage.tsx');
  assert.match(source, /YOUR PERSONAL OPERATING SYSTEM/);
  assert.match(source, /autoComplete="email"/);
  assert.match(source, /current-password/);
  assert.match(source, /new-password/);
  assert.match(source, /role="tablist"/);
  assert.match(source, /signInWithGoogle/);
  assert.match(source, /signIn\(email, password\)/);
  assert.match(source, /signUp\(email, password, name\)/);
});

test('analytics reads like a life pulse while preserving all source APIs', async () => {
  const source = await read('src/app/components/AnalyticsPage.tsx');
  assert.match(source, /eyebrow="LIFE PULSE"/);
  assert.match(source, /lifeos-v4-life-score/);
  assert.match(source, /نبض التقدم الحالي/);
  assert.match(source, /role="progressbar"/);
  for (const endpoint of ['/analytics', '/tasks', '/habits', '/workouts', '/dhikr', '/goals']) assert.match(source, new RegExp(endpoint.replace('/', '\\/')));
});

test('future vision is a timeline compass with save state and resilient loading', async () => {
  const source = await read('src/app/components/FutureVisionPage.tsx');
  assert.match(source, /eyebrow="VISION COMPASS"/);
  assert.match(source, /lifeos-v4-vision-timeline/);
  assert.match(source, /dirty/);
  assert.match(source, /<ErrorState/);
  assert.match(source, /api\('\/future'/);
  assert.match(source, /method: 'PUT'/);
});

test('agreements use a commitment ledger without losing quotas or CRUD flows', async () => {
  const source = await read('src/app/components/AgreementsPage.tsx');
  assert.match(source, /eyebrow="COMMITMENT LEDGER"/);
  assert.match(source, /تستحق قريبًا/);
  assert.match(source, /lifeos-v4-agreement-card/);
  assert.match(source, /rewardKey="agreements"/);
  assert.match(source, /guardCreation/);
  assert.match(source, /method: 'DELETE'/);
});

test('Pro paywall is an accessible dialog with dynamic RevenueCat checkout preserved', async () => {
  const source = await read('src/app/components/ProPaywall.tsx');
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /role="radiogroup"/);
  assert.match(source, /lifeos-v4-paywall-checkout/);
  assert.match(source, /purchaseSubscriptionPackage/);
  assert.match(source, /restoreSubscriptionPurchases/);
  assert.match(source, /selected\.priceString/);
});
