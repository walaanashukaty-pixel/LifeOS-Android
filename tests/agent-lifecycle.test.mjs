import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionActionStatus } from '../supabase/functions/lifeos-agent/action-lifecycle.ts';

test('agent action lifecycle only allows auditable forward transitions', () => {
  assert.equal(canTransitionActionStatus('proposed', 'approved'), true);
  assert.equal(canTransitionActionStatus('proposed', 'rejected'), true);
  assert.equal(canTransitionActionStatus('approved', 'executed'), true);
  assert.equal(canTransitionActionStatus('approved', 'failed'), true);
  assert.equal(canTransitionActionStatus('executed', 'undone'), true);
  assert.equal(canTransitionActionStatus('proposed', 'executed'), false);
  assert.equal(canTransitionActionStatus('rejected', 'approved'), false);
  assert.equal(canTransitionActionStatus('undone', 'executed'), false);
});
