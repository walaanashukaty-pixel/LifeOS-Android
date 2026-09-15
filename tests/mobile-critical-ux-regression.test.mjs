import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('app shell has a constrained viewport so the main region can actually scroll', async () => {
  const layout = await read('src/app/components/Layout.tsx');
  const css = await read('src/styles/theme.css');
  assert.match(layout, /min-h-0 min-w-0 flex-1 flex-col/);
  assert.match(layout, /lifeos-main lifeos-scroll-region min-h-0 flex-1 overflow-y-auto/);
  assert.match(css, /\.lifeos-app-shell[\s\S]*height: 100dvh;[\s\S]*overflow: hidden;/);
  assert.match(css, /\.lifeos-main[\s\S]*overflow-y: auto !important;[\s\S]*touch-action: pan-y;/);
});

test('auth remains scrollable with the Android keyboard and signup confirmation is explicit', async () => {
  const page = await read('src/app/components/AuthPage.tsx');
  const css = await read('src/styles/theme.css');
  assert.match(css, /\.lifeos-auth-shell[\s\S]*overflow-y: auto;/);
  assert.match(css, /\.lifeos-auth-card \.lifeos-segmented-item[\s\S]*flex: 1 1 0;/);
  assert.match(page, /confirmationEmail/);
  assert.match(page, /بياناتك ما راحت/);
  assert.match(page, /friendlyAuthError/);
});

test('task add form has one close affordance on mobile', async () => {
  const tasks = await read('src/app/components/TasksPage.tsx');
  const modal = await read('src/app/components/ui/FormModal.tsx');
  assert.match(tasks, /hidden md:flex[^\n]*إغلاق نموذج المهمة/);
  assert.match(modal, /aria-label="إغلاق النافذة"/);
});

test('long mobile forms favor native vertical scrolling over sheet dragging', async () => {
  const modal = await read('src/app/components/ui/FormModal.tsx');
  assert.match(modal, /\[touch-action:pan-y\]/);
  assert.doesNotMatch(modal, /dragConstraints/);
  assert.doesNotMatch(modal, /onDragEnd/);
});

test('mobile performance pass removes scroll progress rerenders and expensive blur surfaces', async () => {
  const layout = await read('src/app/components/Layout.tsx');
  const css = await read('src/styles/theme.css');
  assert.doesNotMatch(layout, /setScrollProgress/);
  assert.doesNotMatch(layout, /mode="wait"/);
  assert.match(css, /\.lifeos-bottom-nav > div,[\s\S]*backdrop-filter: none !important/);
  assert.match(css, /\.lifeos-app-header[\s\S]*backdrop-filter: none !important/);
});
