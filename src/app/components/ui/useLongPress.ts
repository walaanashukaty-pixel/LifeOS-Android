import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { hapticMedium } from '../../../utils/haptics';

type LongPressOptions = {
  delay?: number;
  moveTolerance?: number;
  disabled?: boolean;
};

/**
 * Mobile-friendly long press with movement cancellation.
 * It deliberately ignores interactive descendants so normal buttons/inputs keep their native behavior.
 */
export function useLongPress(onLongPress: () => void, options: LongPressOptions = {}) {
  const { delay = 520, moveTolerance = 12, disabled = false } = options;
  const timerRef = useRef<number | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);

  const clear = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    originRef.current = null;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (disabled || event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, input, textarea, select, a, [role="button"], [data-long-press-block="true"]')) return;

    originRef.current = { x: event.clientX, y: event.clientY };
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      hapticMedium();
      onLongPress();
    }, delay);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const origin = originRef.current;
    if (!origin) return;
    if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > moveTolerance) clear();
  };

  const onPointerUp = clear;
  const onPointerCancel = clear;
  const onPointerLeave = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse') clear();
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onPointerLeave };
}
