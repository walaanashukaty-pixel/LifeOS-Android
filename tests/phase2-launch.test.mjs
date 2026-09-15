import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPhase2Launch } from '../src/app/agent/phase2-modes.ts';
import { queueAgentLaunch, consumeAgentLaunch } from '../src/app/agent/agent-launch.ts';

function fakeStorage() {
  const values = new Map();
  return {
    setItem(key, value) { values.set(key, String(value)); },
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    removeItem(key) { values.delete(key); },
  };
}

test('queued Phase 2 launch is consumed exactly once', () => {
  const storage = fakeStorage();
  const launch = buildPhase2Launch('what_now');
  queueAgentLaunch(launch, storage);
  assert.deepEqual(consumeAgentLaunch(storage), launch);
  assert.equal(consumeAgentLaunch(storage), null);
});

test('launch consumer rejects malformed or unsupported stored payloads', () => {
  const storage = fakeStorage();
  storage.setItem('lifeos_agent_launch_v2', JSON.stringify({ mode: 'unknown', title: 'x', prompt: 'y' }));
  assert.equal(consumeAgentLaunch(storage), null);
});
