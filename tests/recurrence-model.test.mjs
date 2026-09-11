import test from 'node:test';
import assert from 'node:assert/strict';
import { occursOnDate, nextOccurrenceDates, recurrenceLabel } from '../src/utils/recurrence.ts';
import { isTaskOnDate } from '../src/utils/task-date.ts';


test('one-time task occurs only on its date', () => {
  const task = { startDate: '2026-09-11', recurrence: 'once' };
  assert.equal(isTaskOnDate(task, '2026-09-11'), true);
  assert.equal(isTaskOnDate(task, '2026-09-12'), false);
});

test('daily recurring task stays one record but is due on later dates', () => {
  const task = { startDate: '2026-09-11', recurrence: 'daily', completions: [{ date: '2026-09-11', status: 'completed' }] };
  assert.equal(isTaskOnDate(task, '2026-09-11'), true);
  assert.equal(isTaskOnDate(task, '2026-09-12'), true);
});


test('weekly task is due only on the matching weekday, not every day', () => {
  const task = { startDate: '2026-09-11', recurrence: 'weekly' }; // Friday
  assert.equal(isTaskOnDate(task, '2026-09-11'), true);
  assert.equal(isTaskOnDate(task, '2026-09-12'), false);
  assert.equal(isTaskOnDate(task, '2026-09-17'), false);
  assert.equal(isTaskOnDate(task, '2026-09-18'), true);
});

test('monthly task is due only on its monthly occurrence date', () => {
  const task = { startDate: '2026-09-11', recurrence: 'monthly' };
  assert.equal(isTaskOnDate(task, '2026-09-11'), true);
  assert.equal(isTaskOnDate(task, '2026-09-12'), false);
  assert.equal(isTaskOnDate(task, '2026-10-10'), false);
  assert.equal(isTaskOnDate(task, '2026-10-11'), true);
});

test('specific weekdays honor selected days and start date', () => {
  const input = { anchorDate: '2026-09-11', recurrence: 'weekdays', repeatDays: [1, 3, 5] };
  assert.equal(occursOnDate({ ...input, targetDate: '2026-09-11' }), true); // Friday
  assert.equal(occursOnDate({ ...input, targetDate: '2026-09-12' }), false);
  assert.equal(occursOnDate({ ...input, targetDate: '2026-09-14' }), true); // Monday
});

test('recurrence end date stops future occurrences', () => {
  const input = { anchorDate: '2026-09-11', recurrence: 'daily', recurrenceEndDate: '2026-09-13' };
  assert.equal(occursOnDate({ ...input, targetDate: '2026-09-13' }), true);
  assert.equal(occursOnDate({ ...input, targetDate: '2026-09-14' }), false);
});

test('yearly event repeats without duplicating persisted event', () => {
  const dates = nextOccurrenceDates({ anchorDate: '2026-09-11', recurrence: 'yearly', fromDate: '2026-09-01', horizonDays: 800, limit: 3 });
  assert.deepEqual(dates, ['2026-09-11', '2027-09-11', '2028-09-11']);
});

test('Arabic recurrence label includes selected weekdays', () => {
  assert.match(recurrenceLabel('weekdays', [1, 3]), /إث/);
  assert.match(recurrenceLabel('weekdays', [1, 3]), /أر/);
});

test('monthly recurrence on the 31st falls on the last day of shorter months', () => {
  const input = { anchorDate: '2026-01-31', recurrence: 'monthly' };
  assert.equal(occursOnDate({ ...input, targetDate: '2026-02-28' }), true);
  assert.equal(occursOnDate({ ...input, targetDate: '2026-03-31' }), true);
  assert.equal(occursOnDate({ ...input, targetDate: '2026-03-30' }), false);
});
