import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('production Agent flow does not use hardcoded Pro preview turns', async () => {
  const source = await readFile('src/app/agent/LifeOSAgentPage.tsx', 'utf8');
  assert.doesNotMatch(source, /buildProPreviewTurn|executeProPreviewAction/);
  assert.match(source, /الذكاء الحقيقي مفعّل لحساب الاختبار/);
  assert.match(source, /sendLifeOSAgentTurn/);
});

test('mobile agent composer stays in normal flow so it cannot cover action cards or bottom navigation', async () => {
  const source = await readFile('src/app/agent/LifeOSAgentPage.tsx', 'utf8');
  assert.doesNotMatch(source, /className="sticky bottom-20[^"]*"/);
  assert.match(source, /className="[^"]*md:sticky md:bottom-3[^"]*"/);
});
