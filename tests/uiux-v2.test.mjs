import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('UIUX V2 extends the LifeOS visual system with chips, agenda, finance, settings and agent surfaces', async () => {
  const theme = await read('src/styles/theme.css');
  assert.match(theme, /UI\/UX V2/);
  assert.match(theme, /\.lifeos-chip/);
  assert.match(theme, /\.lifeos-finance-pulse/);
  assert.match(theme, /\.lifeos-today-agenda/);
  assert.match(theme, /\.lifeos-settings-section/);
  assert.match(theme, /\.lifeos-agent-conversation/);
});

test('goals use the shared hero and metrics while preserving horizon-specific goal groups', async () => {
  const source = await read('src/app/components/GoalsPage.tsx');
  assert.match(source, /<PageHero/);
  assert.match(source, /<MetricTile label="متوسط التقدم"/);
  assert.match(source, /lifeos-horizon-card/);
  assert.match(source, /استحقاق قريب/);
  assert.match(source, /layoutId={`lifeos-goal-card-/);
});

test('finance prioritizes current-month health, keeps all finance tabs and exposes secondary totals calmly', async () => {
  const source = await read('src/app/components/FinancePage.tsx');
  assert.match(source, /title="الإدارة المالية"/);
  assert.match(source, /title="وضعك هذا الشهر"/);
  assert.match(source, /lifeos-finance-pulse/);
  assert.match(source, /lifeos-segmented/);
  assert.match(source, /finance-active-tab/);
});

test('events present a today agenda, animated list-calendar switch and empty state without changing recurrence behavior', async () => {
  const source = await read('src/app/components/EventsPage.tsx');
  assert.match(source, /lifeos-today-agenda/);
  assert.match(source, /events-view-active/);
  assert.match(source, /<AnimatedEmptyState/);
  assert.match(source, /normalizeRecurrence/);
  assert.match(source, /scheduleEventReminder/);
});

test('account settings use a single profile hero and consistent settings hierarchy', async () => {
  const source = await read('src/app/components/AccountPage.tsx');
  assert.match(source, /eyebrow="الحساب والإعدادات"/);
  assert.match(source, /lifeos-plan-card/);
  assert.match(source, /lifeos-settings-overview/);
  assert.match(source, /lifeos-settings-section/);
  assert.match(source, /lifeos-setting-row/);
});

test('AI command center distinguishes local insights from Pro intelligence and preserves the approval-first agent flow', async () => {
  const hub = await read('src/app/agent/AIHubPage.tsx');
  const free = await read('src/app/components/AIAssistantPage.tsx');
  const agent = await read('src/app/agent/LifeOSAgentPage.tsx');
  assert.match(hub, /eyebrow="مركز الذكاء"/);
  assert.match(free, /lifeos-free-ai-brief/);
  assert.match(free, /تحليل محلي/);
  assert.match(agent, /lifeos-agent-conversation/);
  assert.match(agent, /lifeos-agent-composer/);
  assert.match(agent, /ما رح يتغير شي قبل ما تعتمده/);
});
