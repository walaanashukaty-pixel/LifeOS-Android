import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildProDashboardInsight } from '../src/app/pro/pro-dashboard-model.ts';

test('Pro dashboard insight is local, bounded, and prioritizes unfinished important work', () => {
  const date = '2026-09-10';
  const result = buildProDashboardInsight({
    date,
    tasks: [
      { id: 'a', title: 'مهمة عالية', priority: 'high', startDate: date, completions: [] },
      { id: 'b', title: 'مهمة منجزة', priority: 'high', startDate: date, completions: [{ date, status: 'completed' }] },
      { id: 'c', title: 'مهمة متوسطة', priority: 'medium', startDate: date, completions: [] },
      { id: 'd', title: 'مهمة منخفضة', priority: 'low', startDate: date, completions: [] },
      { id: 'e', title: 'مهمة رابعة', priority: 'medium', startDate: date, completions: [] },
    ],
    events: [{ id: 'e1', title: 'موعد', date, time: '15:00' }],
  });
  assert.equal(result.tasksToday, 5);
  assert.equal(result.eventsToday, 1);
  assert.ok(result.priorities.length <= 3);
  assert.equal(result.priorities[0].title, 'مهمة عالية');
  assert.ok(!result.priorities.some(item => item.title === 'مهمة منجزة'));
});

test('Free dashboards are preserved while Pro gets a local insight card with two AI entry actions', async () => {
  const mobile = await readFile('src/app/components/MobileHome.tsx', 'utf8');
  const desktop = await readFile('src/app/components/Dashboard.tsx', 'utf8');
  const card = await readFile('src/app/pro/ProDashboardInsightCard.tsx', 'utf8');
  assert.match(card, /LifeOS يقترح لك/);
  assert.match(card, /عرض خطتي/);
  assert.match(card, /اسأل LifeOS/);
  assert.match(mobile, /proExperienceEnabled[\s\S]*ProDashboardInsightCard/);
  assert.match(desktop, /proExperienceEnabled[\s\S]*ProDashboardInsightCard/);
  assert.doesNotMatch(card, /sendLifeOSAgentTurn|lifeos-agent|fetch\(/);
});
