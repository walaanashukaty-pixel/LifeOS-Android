import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildSmartNotificationCandidates,
  isInQuietHours,
  selectSmartNotifications,
} from '../src/app/pro/smart-notification-model.ts';

test('smart notification quiet hours handle ranges crossing midnight', () => {
  assert.equal(isInQuietHours('23:15', '22:00', '08:00'), true);
  assert.equal(isInQuietHours('07:59', '22:00', '08:00'), true);
  assert.equal(isInQuietHours('12:00', '22:00', '08:00'), false);
});

test('smart notification model creates useful bounded candidates', () => {
  const date = '2026-09-10';
  const candidates = buildSmartNotificationCandidates({
    date,
    now: new Date('2026-09-10T10:00:00'),
    tasks: Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, title: `Task ${i}`, startDate: date, priority: i === 0 ? 'high' : 'medium', completions: [] })),
    habits: [],
    events: [],
  });
  assert.ok(candidates.some(item => item.kind === 'overloaded_day'));
  assert.ok(candidates.some(item => item.kind === 'daily_review'));

  const selected = selectSmartNotifications(candidates, {
    maxPerDay: 2,
    alreadyScheduledKeys: new Set([candidates[0].key]),
  });
  assert.ok(selected.length <= 2);
  assert.ok(selected.every(item => item.key !== candidates[0].key));
});

test('smart notifications extend existing local notification system and run only for real Pro', async () => {
  const notifications = await readFile('src/utils/notifications.ts', 'utf8');
  const coordinator = await readFile('src/app/pro/smart-notifications.ts', 'utf8');
  const provider = await readFile('src/app/monetization/MonetizationProvider.tsx', 'utf8');
  assert.match(notifications, /scheduleSmartNotification/);
  assert.match(notifications, /cancelSmartNotifications/);
  assert.match(coordinator, /buildSmartNotificationCandidates/);
  assert.match(coordinator, /maxSmartNotificationsPerDay/);
  assert.match(provider, /subscription\.isPro[\s\S]*refreshSmartNotifications/);
  assert.doesNotMatch(coordinator, /sendLifeOSAgentTurn|lifeos-agent/);
});
