/**
 * Lightweight haptic feedback that works without an extra native dependency.
 * On supported Android WebViews this uses the Vibration API; elsewhere it is a safe no-op.
 */
function vibrate(pattern: number | number[]) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try { navigator.vibrate(pattern); } catch { /* best-effort feedback only */ }
}

export function hapticSelection() { vibrate(8); }
export function hapticLight() { vibrate(12); }
export function hapticMedium() { vibrate(20); }
export function hapticSuccess() { vibrate([12, 28, 18]); }
export function hapticWarning() { vibrate([18, 34, 24]); }
