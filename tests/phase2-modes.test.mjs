import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PHASE2_AGENT_MODES,
  buildPhase2Launch,
  getAgentModePolicy,
} from '../src/app/agent/phase2-modes.ts';

test('Phase 2 exposes exactly the six approved LifeOS Pro modes', () => {
  assert.deepEqual(PHASE2_AGENT_MODES, [
    'smart_add',
    'day_plan',
    'what_now',
    'goal_plan',
    'reschedule',
    'morning_brief',
  ]);
});

test('read-only intelligence modes cannot emit LifeOS write actions', () => {
  for (const mode of ['what_now', 'morning_brief']) {
    const policy = getAgentModePolicy(mode);
    assert.equal(policy.readOnly, true);
    assert.deepEqual(policy.allowedActionTypes, []);
  }
});

test('write-capable Phase 2 modes are restricted to the minimum action families', () => {
  assert.deepEqual(getAgentModePolicy('smart_add').allowedActionTypes, ['CreateTask', 'CreateHabit', 'CreateEvent', 'CreateGoal']);
  assert.deepEqual(getAgentModePolicy('day_plan').allowedActionTypes, ['UpdateTask']);
  assert.deepEqual(getAgentModePolicy('goal_plan').allowedActionTypes, ['CreateGoal', 'CreateTask', 'CreateHabit', 'CreateEvent']);
  assert.deepEqual(getAgentModePolicy('reschedule').allowedActionTypes, ['UpdateTask', 'UpdateEvent']);
});

test('every Phase 2 launcher has a concrete Arabic title and prompt', () => {
  for (const mode of PHASE2_AGENT_MODES) {
    const launch = buildPhase2Launch(mode);
    assert.equal(launch.mode, mode);
    assert.ok(launch.title.trim().length >= 3);
    assert.ok(launch.prompt.trim().length >= 8);
  }
  assert.match(buildPhase2Launch('day_plan').title, /رتبلي يومي/);
  assert.match(buildPhase2Launch('what_now').title, /شو أعمل هلا/);
  assert.match(buildPhase2Launch('morning_brief').title, /ملخص الصباح/);
  assert.equal(buildPhase2Launch('smart_add').autoSend, false);
  assert.equal(buildPhase2Launch('goal_plan').autoSend, false);
  for (const mode of PHASE2_AGENT_MODES.filter(mode => !['smart_add', 'goal_plan'].includes(mode))) {
    assert.equal(buildPhase2Launch(mode).autoSend, true);
  }
});
