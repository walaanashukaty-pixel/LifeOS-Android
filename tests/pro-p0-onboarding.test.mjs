import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Pro onboarding contains celebration, six approved questions, and result screen', async () => {
  const source = await readFile('src/app/pro/ProOnboardingFlow.tsx', 'utf8');
  for (const copy of [
    'أهلًا بك في LifeOS Pro',
    'لنبدأ',
    'ما أكثر شيء تريدين تحسينه حاليًا؟',
    'ما أكبر مشكلة تواجهك في تنظيم حياتك؟',
    'كيف تحبين أن تكون خطتك؟',
    'متى تكون طاقتك أفضل؟',
    'ما أهم هدف تريدين العمل عليه الآن؟',
    'كم من الوقت تستطيعين تخصيصه يوميًا؟',
    'عرفت من وين نبدأ',
    'رح أبني اقتراحاتي على هالمعلومات',
  ]) assert.match(source, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(source, /savePersonalizationProfile|onSave/);
});

test('monetization loads personalization asynchronously and opens setup only for Pro when incomplete', async () => {
  const source = await readFile('src/app/monetization/MonetizationProvider.tsx', 'utf8');
  assert.match(source, /loadPersonalizationProfile/);
  assert.match(source, /personalizationLoading/);
  assert.match(source, /onboardingCompleted/);
  assert.match(source, /openProSetup/);
  assert.match(source, /ProOnboardingFlow/);
  assert.match(source, /onProActivated/);
  assert.doesNotMatch(source, /await loadPersonalizationProfile\([^)]*\)[\s\S]*configureSubscriptions/);
});

test('Account lets active Pro users edit their LifeOS personal setup', async () => {
  const source = await readFile('src/app/components/AccountPage.tsx', 'utf8');
  assert.match(source, /إعداد LifeOS الشخصي/);
  assert.match(source, /openProSetup/);
  assert.match(source, /personalization/);
});
