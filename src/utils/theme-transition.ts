/**
 * Utility to trigger a smooth theme transition using the View Transitions API.
 * It creates a circular reveal effect starting from the user's click position.
 */

interface ThemeTransition {
  ready?: Promise<void>;
  finished: Promise<void>;
}

interface ThemeTransitionDocument {
  startViewTransition(callback: () => Promise<void> | void): ThemeTransition;
}

export type ThemeTransitionEvent = MouseEvent | PointerEvent | Event;

let activeTransitionId = 0;

function resolveOrigin(event?: ThemeTransitionEvent): { x: number; y: number } {
  if (
    event &&
    'clientX' in event &&
    'clientY' in event &&
    typeof event.clientX === 'number' &&
    typeof event.clientY === 'number' &&
    (event.clientX !== 0 || event.clientY !== 0)
  ) {
    return { x: event.clientX, y: event.clientY };
  }

  const target = event?.currentTarget ?? event?.target;
  if (
    typeof Element !== 'undefined' &&
    target instanceof Element &&
    typeof target.getBoundingClientRect === 'function'
  ) {
    const rect = target.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  }

  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  };
}

export async function triggerThemeTransition(
  event: ThemeTransitionEvent | undefined,
  update: () => void | Promise<void>,
): Promise<void> {
  // SSR guard — document is not available on server
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    await update();
    return;
  }

  // Fallback for browsers that don't support View Transitions API
  if (!('startViewTransition' in document)) {
    await update();
    return;
  }

  const { x, y } = resolveOrigin(event);
  const endRadius = Math.ceil(
    Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    ),
  );

  const root = document.documentElement;
  const currentId = ++activeTransitionId;

  // Set CSS variables for the animation before starting the view transition
  root.style.setProperty('--x', `${x}px`);
  root.style.setProperty('--y', `${y}px`);
  root.style.setProperty('--r', `${endRadius}px`);
  root.classList.add('theme-transitioning');

  const transition = (
    document as unknown as ThemeTransitionDocument
  ).startViewTransition(async () => {
    await update();
  });

  try {
    await transition.finished;
  } catch {
    // Ignore AbortError if superseded by another transition
  } finally {
    if (currentId === activeTransitionId) {
      root.classList.remove('theme-transitioning');
    }
  }
}
