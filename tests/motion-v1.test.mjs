import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('page shell animates route changes and mobile nav selection', async () => {
  const source = await read('src/app/components/Layout.tsx');
  assert.match(source, /AnimatePresence/);
  assert.match(source, /key=\{page\}/);
  assert.match(source, /lifeos-mobile-nav-active/);
  assert.match(source, /layoutId=/);
  assert.match(source, /useReducedMotion/);
});

test('mobile home animates hero, progress, and section cards', async () => {
  const source = await read('src/app/components/MobileHome.tsx');
  assert.match(source, /motion\.section/);
  assert.match(source, /animate=\{\{ width: `\$\{summary\.progress\}%` \}\}/);
  assert.match(source, /whileTap/);
  assert.match(source, /useReducedMotion/);
});

test('tasks use animated list lifecycle and completion celebration', async () => {
  const source = await read('src/app/components/TasksPage.tsx');
  assert.match(source, /AnimatePresence mode="popLayout"/);
  assert.match(source, /confetti/);
  assert.match(source, /<motion\.div[\s\S]*id=\{`task-/);
  assert.match(source, /whileTap/);
});

test('habits use animated cards, progress, and completion celebration', async () => {
  const source = await read('src/app/components/HabitsPage.tsx');
  assert.match(source, /AnimatePresence mode="popLayout"/);
  assert.match(source, /confetti/);
  assert.match(source, /<motion\.div[\s\S]*id=\{`habit-/);
  assert.match(source, /overallRate/);
});

test('mobile form modal has animated backdrop and panel with reduced-motion support', async () => {
  const source = await read('src/app/components/ui/FormModal.tsx');
  assert.match(source, /AnimatePresence/);
  assert.match(source, /motion\.section/);
  assert.match(source, /motion\.div/);
  assert.match(source, /useReducedMotion/);
});
