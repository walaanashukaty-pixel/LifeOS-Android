import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Pro paywall presents AI value while preserving the existing purchase flow', async () => {
  const source = await readFile('src/app/components/ProPaywall.tsx', 'utf8');
  assert.match(source, /PRO_FEATURES/);
  assert.match(source, /مو بس تنظّمي حياتك\.\.\. خلي LifeOS يساعدك تعيشيها/);
  assert.match(source, /purchaseSubscriptionPackage/);
  assert.match(source, /restoreSubscriptionPurchases/);
  assert.match(source, /اشتركي في LifeOS Pro/);
});
