import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('mobile header reacts to scroll and exposes page progress', async () => {
  const source = await read('src/app/components/Layout.tsx');
  assert.match(source, /headerCompact/);
  assert.match(source, /scrollProgress/);
  assert.match(source, /handleMainScroll/);
  assert.match(source, /onScroll=\{handleMainScroll\}/);
  assert.match(source, /scaleX: scrollProgress/);
});

test('long press opens reusable quick actions with haptics', async () => {
  const hook = await read('src/app/components/ui/useLongPress.ts');
  const sheet = await read('src/app/components/ui/QuickActionSheet.tsx');
  assert.match(hook, /delay = 520/);
  assert.match(hook, /moveTolerance = 12/);
  assert.match(hook, /hapticMedium/);
  assert.match(sheet, /QuickActionSheet/);
  assert.match(sheet, /drag=\{reduceMotion \? false : 'y'\}/);
  assert.match(sheet, /hapticSelection/);
});

test('tasks have progressive swipe reveal and quick actions', async () => {
  const source = await read('src/app/components/TasksPage.tsx');
  assert.match(source, /useMotionValue/);
  assert.match(source, /useTransform/);
  assert.match(source, /completeReveal/);
  assert.match(source, /deleteReveal/);
  assert.match(source, /dragDirectionLock/);
  assert.match(source, /QuickActionSheet/);
});

test('habits and goals use shared element layout identities', async () => {
  const habits = await read('src/app/components/HabitsPage.tsx');
  const goals = await read('src/app/components/GoalsPage.tsx');
  const form = await read('src/app/components/ui/FormModal.tsx');
  assert.match(habits, /lifeos-habit-card-/);
  assert.match(goals, /lifeos-goal-card-/);
  assert.match(form, /layoutId=\{layoutId\}/);
});

test('notification center animates, drags, and stages notification rows', async () => {
  const source = await read('src/app/components/NotificationCenter.tsx');
  assert.match(source, /AnimatePresence/);
  assert.match(source, /drag=\{reduceMotion \|\| !isMobile \? false : 'y'\}/);
  assert.match(source, /NotificationRow/);
  assert.match(source, /Math\.min\(index \* 0\.035, 0\.18\)/);
  assert.match(source, /hapticSelection/);
});

test('global toasts receive premium V4 styling', async () => {
  const app = await read('src/app/App.tsx');
  const theme = await read('src/styles/theme.css');
  assert.match(app, /className: 'lifeos-toast'/);
  assert.match(app, /closeButton/);
  assert.match(theme, /\.lifeos-toast\[data-sonner-toast\]/);
  assert.match(theme, /backdrop-filter: blur\(16px\)/);
});
