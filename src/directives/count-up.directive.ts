import {
  Directive,
  DestroyRef,
  NgZone,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';

import { IS_BROWSER } from '../app/is-browser';

@Directive({
  selector: '[appCountUp]',
  exportAs: 'appCountUp',
})
export class CountUpDirective {
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly ngZone = inject(NgZone);

  // The target number to count up to
  readonly target = input.required<number>({ alias: 'appCountUp' });

  // Duration in ms
  readonly duration = input(300);

  // The current value for template binding
  readonly currentValue = signal(0);

  private animationFrameId: number | null = null;

  constructor() {
    effect(() => {
      const target = this.target();
      const duration = this.duration();

      untracked(() => {
        this.startAnimation(target, duration);
      });
    });

    this.destroyRef.onDestroy(() => {
      if (
        this.isBrowser &&
        typeof window !== 'undefined' &&
        typeof cancelAnimationFrame !== 'undefined' &&
        this.animationFrameId
      ) {
        cancelAnimationFrame(this.animationFrameId);
      }
    });
  }

  private startAnimation(end: number, durationMS: number) {
    if (
      !this.isBrowser ||
      typeof window === 'undefined' ||
      typeof requestAnimationFrame === 'undefined'
    ) {
      this.currentValue.set(end);
      return;
    }

    if (this.animationFrameId && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Safety check for duration
    const duration = Math.max(0, durationMS);

    const start = this.currentValue();
    const range = end - start;
    const startTimeNumber = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTimeNumber;
      const progress = duration > 0 ? Math.min(elapsed / duration, 1) : 1;

      // Ease out quart: 1 - (1-x)^4
      const ease = 1 - Math.pow(1 - progress, 4);

      const nextValue = start + range * ease;

      if (progress < 1) {
        this.currentValue.set(nextValue);
        this.animationFrameId = requestAnimationFrame(step);
      } else {
        this.animationFrameId = null;
        // Re-enter Angular Zone upon animation completion to set the exact final state
        this.ngZone.run(() => {
          this.currentValue.set(end);
        });
      }
    };

    if (duration <= 0) {
      this.currentValue.set(end);
    } else {
      // Run the high-frequency animation loop outside Angular Zone to prevent 60fps change detection cycles
      this.ngZone.runOutsideAngular(() => {
        this.animationFrameId = requestAnimationFrame(step);
      });
    }
  }
}
