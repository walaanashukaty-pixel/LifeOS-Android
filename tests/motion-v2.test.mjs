import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('startup uses an animated LifeOS splash with reduced-motion support', async () => {
  const source = await read('src/app/App.tsx');
  assert.match(source, /useReducedMotion/);
  assert.match(source, /نرتّب يومك/);
  assert.match(source, /motion\.div/);
  assert.match(source, /shadow-primary\/20/);
});

test('pro agent chat animates messages, thinking dots, scroll, and proposed actions', async () => {
  const source = await read('src/app/agent/LifeOSAgentPage.tsx');
  assert.match(source, /AnimatePresence initial=\{false\}/);
  assert.match(source, /agent-thinking/);
  assert.match(source, /scrollIntoView/);
  assert.match(source, /pendingActions\.map\(\(action, index\)/);
  assert.match(source, /useReducedMotion/);
});

test('agent action and presentation cards animate interactive state changes', async () => {
  const action = await read('src/app/agent/ActionPreviewCard.tsx');
  const presentation = await read('src/app/agent/AgentPresentationCard.tsx');
  assert.match(action, /AnimatePresence/);
  assert.match(action, /motion\.button/);
  assert.match(presentation, /motion\.section/);
  assert.match(presentation, /sectionIndex \* 0\.06/);
});

test('goals animate progress and celebrate 100 percent completion', async () => {
  const source = await read('src/app/components/GoalsPage.tsx');
  assert.match(source, /canvas-confetti/);
  assert.match(source, /newProg >= 100/);
  assert.match(source, /animate=\{\{ width: `\$\{goal\.progress \|\| 0\}%` \}\}/);
  assert.match(source, /GoalsSkeleton/);
  assert.match(source, /AnimatePresence initial=\{false\}/);
});

test('finance animates tabs, values, charts, and loading skeleton', async () => {
  const source = await read('src/app/components/FinancePage.tsx');
  assert.match(source, /finance-active-tab/);
  assert.match(source, /CountUpNumber/);
  assert.match(source, /FinanceSkeleton/);
  assert.match(source, /AnimatePresence mode="wait"/);
  assert.match(source, /motion\.div className="flex-1 rounded-t/);
});

test('free AI assistant uses animated hero, insight staggering, and skeletons', async () => {
  const source = await read('src/app/components/AIAssistantPage.tsx');
  assert.match(source, /useReducedMotion/);
  assert.match(source, /جاري تحليل البيانات/);
  assert.match(source, /Math\.min\(i \* 0\.055, 0\.28\)/);
  assert.match(source, /motion\.div whileHover/);
});
