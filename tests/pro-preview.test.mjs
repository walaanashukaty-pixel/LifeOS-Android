import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('preview flag remains opt-in only for explicit test builds', async () => {
  const source = await read('src/app/agent/pro-preview.ts');
  assert.match(source, /VITE_LIFEOS_PRO_PREVIEW/);
  assert.match(source, /=== ['"]true['"]/);
});

test('monetization keeps real isPro separate from visual Pro preview', async () => {
  const source = await read('src/app/monetization/MonetizationProvider.tsx');
  assert.match(source, /proPreviewActive/);
  assert.match(source, /proExperienceEnabled/);
  assert.match(source, /subscription\.isPro\s*\|\|\s*proPreviewActive/);
  assert.match(source, /isPro:\s*subscription\.isPro/);
});

test('paywall preview does not replace RevenueCat purchase flow', async () => {
  const source = await read('src/app/components/ProPaywall.tsx');
  assert.match(source, /previewAllowed/);
  assert.match(source, /purchaseSubscriptionPackage/);
  assert.match(source, /restoreSubscriptionPurchases/);
});

test('QA preview uses the real Agent and never fabricates local AI plans/actions', async () => {
  const source = await read('src/app/agent/LifeOSAgentPage.tsx');
  assert.match(source, /proPreviewActive/);
  assert.match(source, /sendLifeOSAgentTurn/);
  assert.match(source, /الذكاء الحقيقي مفعّل لحساب الاختبار/);
  assert.doesNotMatch(source, /معاينة Pro ما بتولد ردود AI وهمية/);
  assert.doesNotMatch(source, /buildProPreviewTurn|executeProPreviewAction/);
});

test('server grants Test Pro only through a server-side user allowlist', async () => {
  const source = await read('supabase/functions/lifeos-agent/index.ts');
  assert.match(source, /from\(['"]ai_preview_access['"]\)/);
  assert.match(source, /previewAccess/);
  assert.match(source, /if \(!previewAccess\)/);
  assert.match(source, /fetchRevenueCatPro/);
});

test('test APK workflow may still enable the visual preview shell', async () => {
  const workflow = await read('.github/workflows/main.yml');
  assert.match(workflow, /VITE_LIFEOS_PRO_PREVIEW:\s*['"]?true['"]?/);
});
