import {
  DestroyRef,
  inject,
  Injectable,
  signal,
  WritableSignal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

import { TUI_BREAKPOINT } from '@taiga-ui/core';

import { map } from 'rxjs';

import { IS_BROWSER } from '../app/is-browser';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly destroyRef = inject(DestroyRef);
  private breakpoint$ = toObservable(inject(TUI_BREAKPOINT));

  /** Signal that is true if the viewport is mobile-sized. */
  readonly isMobile = toSignal(
    this.breakpoint$.pipe(map((b) => b === 'mobile')),
    {
      initialValue: false,
    },
  );

  /** Signal to show/hide the main navigation loading indicator. */
  readonly isNavLoading: WritableSignal<boolean> = signal(false);

  /** Signal that is true if user is offline. */
  readonly isOffline: WritableSignal<boolean> = signal(false);

  constructor() {
    if (!this.isBrowser) return;

    this.isOffline.set(!navigator.onLine);

    const onOnline = () => this.isOffline.set(false);
    const onOffline = () => this.isOffline.set(true);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    });
  }
}
