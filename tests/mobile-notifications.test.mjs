import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_PRIMARY_NAV, MOBILE_SECTION_ITEMS } from '../src/app/mobile/navigation.ts';
import { buildReminderOccurrences, notificationNumericId } from '../src/utils/notification-model.ts';

test('mobile primary navigation uses the approved five destinations and no more tab', () => {
  assert.deepEqual(MOBILE_PRIMARY_NAV.map(item => item.id), ['dashboard', 'tasks', 'habits', 'goals', 'account']);
  assert.equal(MOBILE_PRIMARY_NAV.some(item => item.id === 'more'), false);
  const sectionIds = new Set(MOBILE_SECTION_ITEMS.map(item => item.id));
  for (const id of ['religious', 'fitness', 'languages', 'skills', 'study', 'events', 'agreements', 'journal', 'analytics', 'ai', 'future', 'documents', 'finance']) {
    assert.equal(sectionIds.has(id), true, `missing section ${id}`);
  }
});

test('event reminder lead time subtracts minutes from the event timestamp', () => {
  const items = buildReminderOccurrences({
    entityType: 'event',
    entityId: 'event-1',
    title: 'موعد الطبيب',
    date: '2026-09-10',
    time: '15:00',
    leadMinutes: 30,
    recurrence: 'once',
    horizonDays: 30,
    now: new Date('2026-09-01T00:00:00'),
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].at.getFullYear(), 2026);
  assert.equal(items[0].at.getMonth(), 8);
  assert.equal(items[0].at.getDate(), 10);
  assert.equal(items[0].at.getHours(), 14);
  assert.equal(items[0].at.getMinutes(), 30);
});

test('daily reminders generate future occurrences within the horizon', () => {
  const items = buildReminderOccurrences({
    entityType: 'habit', entityId: 'habit-1', title: 'شرب الماء',
    date: '2026-09-01', time: '08:00', recurrence: 'daily', horizonDays: 4,
    now: new Date('2026-09-01T07:00:00'),
  });
  assert.deepEqual(items.map(x => x.at.getDate()), [1, 2, 3, 4, 5]);
});

test('weekly reminders preserve start weekday within the horizon', () => {
  const items = buildReminderOccurrences({
    entityType: 'habit', entityId: 'habit-2', title: 'مراجعة أسبوعية',
    date: '2026-09-01', time: '09:00', recurrence: 'weekly', horizonDays: 15,
    now: new Date('2026-09-01T00:00:00'),
  });
  assert.deepEqual(items.map(x => x.at.getDate()), [1, 8, 15]);
});

test('monthly reminders preserve start day of month', () => {
  const items = buildReminderOccurrences({
    entityType: 'task', entityId: 'task-1', title: 'مراجعة الميزانية',
    date: '2026-09-05', time: '10:15', recurrence: 'monthly', horizonDays: 65,
    now: new Date('2026-09-01T00:00:00'),
  });
  assert.deepEqual(items.map(x => [x.at.getMonth() + 1, x.at.getDate()]), [[9, 5], [10, 5], [11, 5]]);
});

test('notification numeric ids are deterministic positive 32-bit integers', () => {
  const a = notificationNumericId('habit', 'abc', '2026-09-01T08:00');
  const b = notificationNumericId('habit', 'abc', '2026-09-01T08:00');
  const c = notificationNumericId('habit', 'abc', '2026-09-02T08:00');
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.ok(a > 0 && a <= 2147483647);
});
