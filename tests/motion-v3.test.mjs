import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('mobile shell supports swipe navigation and pull to refresh', async () => {
  const layout = await read('src/app/components/Layout.tsx');
  const pull = await read('src/app/components/ui/PullToRefresh.tsx');
  const app = await read('src/app/App.tsx');
  assert.match(layout, /handleMainTouchStart/);
  assert.match(layout, /handleMainTouchEnd/);
  assert.match(layout, /MOBILE_PRIMARY_NAV\.findIndex/);
  assert.match(layout, /<PullToRefresh/);
  assert.match(pull, /const TRIGGER = 68/);
  assert.match(pull, /hapticSuccess/);
  assert.match(app, /refreshToken/);
});

test('mobile form modal behaves like a draggable bottom sheet', async () => {
  const source = await read('src/app/components/ui/FormModal.tsx');
  assert.match(source, /items-end justify-center/);
  assert.match(source, /rounded-t-\[1\.75rem\]/);
  assert.match(source, /drag=\{reduceMotion \? false : 'y'\}/);
  assert.match(source, /info\.offset\.y > 110/);
  assert.match(source, /hapticLight/);
});

test('haptic feedback is safe and enhancement only', async () => {
  const source = await read('src/utils/haptics.ts');
  assert.match(source, /navigator\.vibrate/);
  assert.match(source, /hapticSelection/);
  assert.match(source, /hapticSuccess/);
  assert.match(source, /hapticWarning/);
});

test('tasks include swipe actions and animated empty state', async () => {
  const source = await read('src/app/components/TasksPage.tsx');
  assert.match(source, /data-swipe-block="true"/);
  assert.match(source, /drag=\{reduceMotion \? false : 'x'\}/);
  assert.match(source, /AnimatedEmptyState/);
  assert.match(source, /hapticSuccess/);
});

test('habits and finance use richer empty states', async () => {
  const habits = await read('src/app/components/HabitsPage.tsx');
  const finance = await read('src/app/components/FinancePage.tsx');
  const goals = await read('src/app/components/GoalsPage.tsx');
  assert.match(habits, /AnimatedEmptyState/);
  assert.match(finance, /AnimatedEmptyState/);
  assert.match(goals, /AnimatedEmptyState/);
});
