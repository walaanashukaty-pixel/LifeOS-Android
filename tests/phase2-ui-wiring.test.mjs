import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) { return readFile(path, 'utf8'); }

test('Pro AI home section exposes all six approved Phase 2 launchers', async () => {
  const source = await read('src/app/agent/ProAIHomeSection.tsx');
  for (const label of ['أضف بالذكاء', 'رتبلي يومي', 'شو أعمل هلا؟', 'خطط لهدفي', 'عدّل جدولي', 'ملخص يومي']) {
    assert.match(source, new RegExp(label.replace(/[؟]/g, '\\؟')));
  }
  assert.match(source, /buildPhase2Launch/);
  assert.match(source, /onLaunch/);
});

test('mobile Free home preserves existing UI and renders Pro AI section only for real Pro or explicit preview', async () => {
  const source = await read('src/app/components/MobileHome.tsx');
  assert.match(source, /useMonetization/);
  assert.match(source, /ProAIHomeSection/);
  assert.match(source, /proExperienceEnabled\s*&&\s*<ProAIHomeSection/);
  assert.match(source, /queueAgentLaunch/);
  assert.match(source, /setPage\('ai'\)/);
});

test('AI Hub consumes one-shot home launch and opens the existing Agent with it', async () => {
  const source = await read('src/app/agent/AIHubPage.tsx');
  assert.match(source, /consumeAgentLaunch/);
  assert.match(source, /initialLaunch=/);
  assert.match(source, /ProAIHomeSection/);
  assert.match(source, /setAgentOpen\(true\)/);
  assert.match(source, /AIAssistantPage/);
});

test('Agent page auto-runs an initial Phase 2 mode and renders structured presentation cards', async () => {
  const source = await read('src/app/agent/LifeOSAgentPage.tsx');
  assert.match(source, /initialLaunch/);
  assert.match(source, /useEffect/);
  assert.match(source, /initialLaunch\.autoSend/);
  assert.match(source, /AgentPresentationCard/);
  assert.match(source, /loadScopedSnapshot\(text, api, mode\)/);
  assert.match(source, /buildAgentContext\(\{[\s\S]*mode/);
  assert.match(source, /sendLifeOSAgentTurn\(\{[\s\S]*mode/);
});

test('structured presentation card uses current LifeOS card tokens and never executes actions', async () => {
  const source = await read('src/app/agent/AgentPresentationCard.tsx');
  assert.match(source, /bg-card/);
  assert.match(source, /border-border/);
  assert.match(source, /presentation\.sections/);
  assert.doesNotMatch(source, /executeApprovedAction|api\(/);
});

test('Pro paywall feature catalog includes Smart Rescheduling with other Phase 2 value', async () => {
  const source = await read('src/app/agent/pro-features.ts');
  assert.match(source, /إعادة جدولة ذكية/);
  assert.match(source, /smart-rescheduling/);
});
