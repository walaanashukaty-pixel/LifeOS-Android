import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const tasksPage = await fs.readFile(new URL('../src/app/components/TasksPage.tsx', import.meta.url), 'utf8');
const habitsPage = await fs.readFile(new URL('../src/app/components/HabitsPage.tsx', import.meta.url), 'utf8');

test('tasks and habits open on Today so non-due recurring items do not look active by default', () => {
  assert.match(tasksPage, /useState<FilterTab>\('today'\)/);
  assert.match(habitsPage, /useState<FilterTab>\('today'\)/);
});

test('non-due recurring tasks remain visible in All but cannot be completed for today', () => {
  assert.match(tasksPage, /disabled=\{!dueToday\}/);
  assert.match(tasksPage, /غير مطلوبة اليوم/);
  assert.match(tasksPage, /الموعد القادم/);
});

test('recurrence labels explain weekly and monthly cadence clearly', () => {
  assert.match(tasksPage, /مرة كل أسبوع \(نفس يوم البداية\)/);
  assert.match(tasksPage, /مرة كل شهر \(نفس يوم البداية\)/);
  assert.match(tasksPage, /أيام محددة من كل أسبوع/);
});
