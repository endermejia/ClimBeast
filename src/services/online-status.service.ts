import { DestroyRef, inject, Injectable, signal } from '@angular/core';

import { IS_BROWSER } from '../app/is-browser';

@Injectable({ providedIn: 'root' })
export class OnlineStatusService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly destroyRef = inject(DestroyRef);
  private readonly _isOffline = signal(
    this.isBrowser && typeof navigator !== 'undefined'
      ? !navigator.onLine
      : false,
  );

  readonly isOffline = this._isOffline.asReadonly();

  constructor() {
    if (!this.isBrowser || typeof window === 'undefined') return;

    const onlineHandler = () => this._isOffline.set(false);
    const offlineHandler = () => this._isOffline.set(true);

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    });
  }
}
