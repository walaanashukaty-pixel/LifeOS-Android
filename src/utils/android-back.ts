export type AndroidBackHandler = () => boolean | void;

const handlers: AndroidBackHandler[] = [];

/**
 * Registers a LIFO back handler. The most recently opened surface gets first
 * chance to consume Android's hardware/software back button.
 */
export function registerAndroidBackHandler(handler: AndroidBackHandler): () => void {
  handlers.push(handler);
  return () => {
    const index = handlers.lastIndexOf(handler);
    if (index >= 0) handlers.splice(index, 1);
  };
}

export function dispatchAndroidBack(): boolean {
  for (let index = handlers.length - 1; index >= 0; index -= 1) {
    try {
      if (handlers[index]() !== false) return true;
    } catch (error) {
      console.warn('[android-back] handler failed:', error);
      return true;
    }
  }
  return false;
}
