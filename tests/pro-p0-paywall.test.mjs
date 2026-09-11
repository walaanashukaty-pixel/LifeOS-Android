import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Pro paywall leads with the approved value proposition before package selection', async () => {
  const source = await readFile('src/app/components/ProPaywall.tsx', 'utf8');
  const hero = source.indexOf('مو بس تنظّمي حياتك... خلي LifeOS يساعدك تعيشيها.');
  const difference = source.indexOf('شوفي الفرق');
  const packages = source.indexOf('packages.map');
  assert.ok(hero >= 0, 'missing approved hero copy');
  assert.ok(difference > hero, 'difference example should follow hero');
  assert.ok(packages > difference, 'package pricing should appear after value and example');
});

test('paywall includes the real Free vs Pro Turkish B1 example', async () => {
  const source = await readFile('src/app/components/ProPaywall.tsx', 'utf8');
  for (const copy of ['تعلم اللغة التركية', 'B1', '20 دقيقة مفردات يوميًا', 'استماع 3 مرات أسبوعيًا', 'هكذا يعمل LifeOS Pro']) {
    assert.match(source, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('paywall uses dynamic RevenueCat pricing, recommends annual only when it exists, and keeps restore', async () => {
  const source = await readFile('src/app/components/ProPaywall.tsx', 'utf8');
  assert.match(source, /selected\.priceString/);
  assert.match(source, /pricePerMonthString/);
  assert.match(source, /isAnnualPackage|packageType\.toLowerCase\(\)\.includes\('annual'\)/);
  assert.match(source, /الأفضل قيمة/);
  assert.match(source, /restoreSubscriptionPurchases/);
  assert.match(source, /استعادة المشتريات/);
  assert.doesNotMatch(source, /\b\d+%\b/);
});

test('preview disclaimer is visual-only and never promises fake AI execution', async () => {
  const source = await readFile('src/app/components/ProPaywall.tsx', 'utf8');
  assert.match(source, /نسخة اختبار للواجهة فقط/);
  assert.match(source, /ما بتنشئ ردود أو إجراءات AI وهمية/);
  assert.doesNotMatch(source, /بيانات جهاز الاختبار|بياناتك المحلية على جهاز الاختبار/);
});
