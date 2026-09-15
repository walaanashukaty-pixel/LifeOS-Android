import test from 'node:test';
import assert from 'node:assert/strict';
import { PRO_FEATURES, proFeatureGroups } from '../src/app/agent/pro-features.ts';

test('Pro catalog sells intelligence, not only ad removal', () => {
  const ids = PRO_FEATURES.map(feature => feature.id);
  assert.ok(ids.includes('lifeos-ai'));
  assert.ok(ids.includes('plan-my-day'));
  assert.ok(ids.includes('lifeos-personal'));
  assert.ok(ids.includes('smart-review'));
});

test('Pro feature catalog remains grouped for a compact paywall', () => {
  const groups = proFeatureGroups();
  assert.ok(groups.intelligence.length >= 3);
  assert.ok(groups.personalization.length >= 2);
  assert.ok(groups.freedom.length >= 1);
});
