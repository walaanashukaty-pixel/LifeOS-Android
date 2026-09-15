import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('UIUX V1 defines reusable LifeOS page, metric, toolbar and segmented surfaces', async () => {
  const primitives = await read('src/app/components/ui/LifeOSPrimitives.tsx');
  const theme = await read('src/styles/theme.css');
  assert.match(primitives, /export function PageHero/);
  assert.match(primitives, /export function MetricTile/);
  assert.match(primitives, /export function SectionHeading/);
  assert.match(theme, /\.lifeos-page-hero/);
  assert.match(theme, /\.lifeos-metric-tile/);
  assert.match(theme, /\.lifeos-toolbar/);
  assert.match(theme, /\.lifeos-segmented-indicator/);
});

test('mobile home prioritizes daily progress and the next task', async () => {
  const source = await read('src/app/components/MobileHome.tsx');
  assert.match(source, /nextTask/);
  assert.match(source, /التالي اليوم/);
  assert.match(source, /DailyProgressRing/);
  assert.match(source, /SectionHeading/);
});

test('tasks use a consistent page hero, metric grid, toolbar and animated segmented filters', async () => {
  const source = await read('src/app/components/TasksPage.tsx');
  assert.match(source, /<PageHero/);
  assert.match(source, /<MetricTile/);
  assert.match(source, /lifeos-toolbar/);
  assert.match(source, /lifeos-task-filter-active/);
  assert.match(source, /lifeos-list-card/);
});

test('habits use the same hierarchy and preserve habit-specific information', async () => {
  const source = await read('src/app/components/HabitsPage.tsx');
  assert.match(source, /نظام الاستمرارية/);
  assert.match(source, /<MetricTile/);
  assert.match(source, /lifeos-habit-filter-active/);
  assert.match(source, /أطول سلسلة/);
  assert.match(source, /lifeos-list-card/);
});

test('mobile navigation is a floating premium surface instead of a full-width rigid bar', async () => {
  const source = await read('src/app/components/Layout.tsx');
  assert.match(source, /pointer-events-none fixed inset-x-0 bottom-0/);
  assert.match(source, /rounded-\[26px\]/);
  assert.match(source, /backdrop-blur-2xl/);
  assert.match(source, /pb-32/);
});
