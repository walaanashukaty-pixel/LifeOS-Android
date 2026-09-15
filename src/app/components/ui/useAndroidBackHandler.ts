import { useEffect } from 'react';
import { registerAndroidBackHandler } from '../../../utils/android-back';

/** Keeps Android Back behavior aligned with the top-most in-app surface. */
export function useAndroidBackHandler(enabled: boolean, handler: () => void) {
  useEffect(() => {
    if (!enabled) return;
    return registerAndroidBackHandler(() => {
      handler();
      return true;
    });
  }, [enabled, handler]);
}
