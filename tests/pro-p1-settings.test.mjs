import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  defaultAIUserSettings,
  normalizeAIUserSettings,
} from '../src/app/pro/ai-settings-types.ts';

test('AI settings use bounded privacy-aware defaults and normalize invalid input', () => {
  const defaults = defaultAIUserSettings();
  assert.equal(defaults.aiDataAccessEnabled, true);
  assert.equal(defaults.memoryEnabled, true);
  assert.equal(defaults.smartNotificationsEnabled, true);
  assert.equal(defaults.quietHoursEnabled, true);
  assert.equal(defaults.quietHoursStart, '22:00');
  assert.equal(defaults.quietHoursEnd, '08:00');
  assert.equal(defaults.maxSmartNotificationsPerDay, 2);

  const value = normalizeAIUserSettings({
    aiDataAccessEnabled: false,
    memoryEnabled: false,
    quietHoursStart: '99:99',
    quietHoursEnd: '07:30',
    maxSmartNotificationsPerDay: 99,
  });
  assert.equal(value.aiDataAccessEnabled, false);
  assert.equal(value.memoryEnabled, false);
  assert.equal(value.quietHoursStart, '22:00');
  assert.equal(value.quietHoursEnd, '07:30');
  assert.equal(value.maxSmartNotificationsPerDay, 3);
});

test('AI settings service and migration are account-linked and RLS protected', async () => {
  const service = await readFile('src/app/pro/ai-settings-service.ts', 'utf8');
  const migration = await readFile('supabase/migrations/20260910161500_create_ai_user_settings.sql', 'utf8');
  assert.match(service, /from\(['"]ai_user_settings['"]\)/);
  assert.match(service, /upsert/);
  assert.match(migration, /create table[^;]*ai_user_settings/is);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /auth\.uid\(\)[\s\S]*user_id/);
  assert.doesNotMatch(service + migration, /malaak/i);
});

test('Account exposes transparent LifeOS memory and AI privacy controls', async () => {
  const account = await readFile('src/app/components/AccountPage.tsx', 'utf8');
  const personalization = await readFile('src/app/pro/personalization-service.ts', 'utf8');
  assert.match(account, /ذاكرة LifeOS/);
  assert.match(account, /استخدام بيانات LifeOS مع AI/);
  assert.match(account, /الذاكرة الشخصية/);
  assert.match(account, /الإشعارات الذكية/);
  assert.match(account, /ساعات الهدوء/);
  assert.match(account, /حذف المعلومات المحفوظة/);
  assert.match(account, /تأكيد حذف ذاكرة LifeOS/);
  assert.match(personalization, /deletePersonalizationProfile/);
});
