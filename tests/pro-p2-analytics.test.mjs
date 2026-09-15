import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildAIAnalyticsSummary } from '../src/app/pro/ai-analytics-model.ts';

test('AI analytics computes a seven-day summary from real completion history', () => {
  const summary = buildAIAnalyticsSummary({
    endDate: '2026-09-10',
    tasks: [
      { id: 't1', title: 'A', endDate: '2026-09-08', recurrence: '', completions: [
        { date: '2026-09-08', status: 'completed', time: '2026-09-08T19:10:00Z' },
      ] },
      { id: 't2', title: 'B', endDate: '2026-09-09', recurrence: '', completions: [
        { date: '2026-09-09', status: 'completed', time: '2026-09-09T19:15:00Z' },
      ] },
      { id: 't3', title: 'C', endDate: '2026-09-10', recurrence: '', completions: [
        { date: '2026-09-10', status: 'completed', time: '2026-09-10T19:20:00Z' },
      ] },
    ],
    habits: [
      { id: 'h1', name: 'Walk', startDate: '2026-09-04', recurrence: 'daily', logs: [
        { date: '2026-09-09', completed: true },
        { date: '2026-09-10', completed: true },
      ] },
    ],
    reflections: [{ reviewDate: '2026-09-09', reason: 'كانت الخطة كبيرة', note: '', summary: null }],
  });
  assert.equal(summary.windowDays, 7);
  assert.ok(summary.taskCompletionRate > 0 && summary.taskCompletionRate <= 100);
  assert.ok(summary.habitCompletionRate > 0 && summary.habitCompletionRate <= 100);
  assert.match(summary.strongestHour || '', /19/);
  assert.ok(summary.observations.length > 0);
  assert.ok(summary.recommendation.length > 0);
});

test('analytics refuses to invent strong patterns when history is empty', () => {
  const summary = buildAIAnalyticsSummary({ endDate: '2026-09-10', tasks: [], habits: [], reflections: [] });
  assert.equal(summary.sufficientData, false);
  assert.equal(summary.strongestHour, null);
  assert.equal(summary.bestWeekday, null);
  assert.match(summary.recommendation, /بيانات|أيام|استخدام/);
});

test('Pro AI hub exposes AI analytics without replacing the Free assistant', async () => {
  const hub = await readFile('src/app/agent/AIHubPage.tsx', 'utf8');
  const panel = await readFile('src/app/pro/AIAnalyticsPanel.tsx', 'utf8');
  assert.match(hub, /AIAnalyticsPanel/);
  assert.match(hub, /AIAssistantPage/);
  assert.match(panel, /تحليلات LifeOS/);
  assert.match(panel, /آخر 7 أيام/);
});
