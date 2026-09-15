export type RecordedActionStatus = 'approved' | 'rejected' | 'executed' | 'failed' | 'undone';

const TRANSITIONS: Record<string, readonly RecordedActionStatus[]> = {
  proposed: ['approved', 'rejected', 'failed'],
  approved: ['executed', 'failed'],
  executed: ['undone'],
  rejected: [],
  failed: [],
  undone: [],
};

export function canTransitionActionStatus(current: string, next: RecordedActionStatus): boolean {
  return (TRANSITIONS[current] || []).includes(next);
}
