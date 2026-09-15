import { Capacitor } from '@capacitor/core';

type KeyboardVisibilityDetail = { open: boolean; height: number };

const TEXT_INPUT_TYPES = new Set([
  'text', 'email', 'password', 'search', 'tel', 'url', 'number', '',
]);

function isTextEntryElement(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement {
  if (target instanceof HTMLTextAreaElement) return true;
  if (!(target instanceof HTMLInputElement)) return false;
  return TEXT_INPUT_TYPES.has((target.type || 'text').toLowerCase());
}

function emitKeyboardVisibility(open: boolean, height = 0) {
  if (typeof window === 'undefined') return;
  const detail: KeyboardVisibilityDetail = { open, height };
  window.dispatchEvent(new CustomEvent<KeyboardVisibilityDetail>('lifeos:keyboard-visibility', { detail }));
  document.documentElement.classList.toggle('lifeos-keyboard-open', open);
  document.documentElement.style.setProperty('--lifeos-keyboard-height', open ? `${Math.max(0, height)}px` : '0px');
}

export async function setupNativeKeyboardBridge(): Promise<() => void> {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return () => {};

  const { Keyboard } = await import('@capacitor/keyboard');
  let focusedEntry: HTMLInputElement | HTMLTextAreaElement | null = null;

  const revealFocusedField = () => {
    const element = focusedEntry;
    if (!element || !document.contains(element)) return;
    window.setTimeout(() => {
      if (document.activeElement !== element) return;
      element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    }, 90);
  };

  const onFocusIn = (event: FocusEvent) => {
    if (!isTextEntryElement(event.target)) return;
    focusedEntry = event.target;
    // Android WebView occasionally focuses an HTML input without presenting the IME.
    // Explicitly requesting it makes email/password and modal form fields reliable.
    window.requestAnimationFrame(() => {
      if (document.activeElement !== focusedEntry) return;
      void Keyboard.show().catch(() => {});
    });
  };

  const onFocusOut = (event: FocusEvent) => {
    if (event.target === focusedEntry) focusedEntry = null;
  };

  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('focusout', onFocusOut, true);

  const handles = await Promise.all([
    Keyboard.addListener('keyboardWillShow', info => {
      emitKeyboardVisibility(true, info.keyboardHeight);
      revealFocusedField();
    }),
    Keyboard.addListener('keyboardDidShow', info => {
      emitKeyboardVisibility(true, info.keyboardHeight);
      revealFocusedField();
    }),
    Keyboard.addListener('keyboardWillHide', () => emitKeyboardVisibility(false, 0)),
    Keyboard.addListener('keyboardDidHide', () => emitKeyboardVisibility(false, 0)),
  ]);

  return () => {
    document.removeEventListener('focusin', onFocusIn, true);
    document.removeEventListener('focusout', onFocusOut, true);
    emitKeyboardVisibility(false, 0);
    for (const handle of handles) void handle.remove();
  };
}
