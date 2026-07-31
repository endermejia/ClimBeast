import { DestroyRef, inject, Injectable, signal } from '@angular/core';

import { IS_BROWSER } from '../app/is-browser';

@Injectable({ providedIn: 'root' })
export class OnlineStatusService {
  private readonly isBrowser = inject(IS_BROWSER);
  readonly isOffline = signal(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  constructor() {
    if (this.isBrowser) {
      const destroyRef = inject(DestroyRef);
      const onlineHandler = () => this.isOffline.set(false);
      const offlineHandler = () => this.isOffline.set(true);

      window.addEventListener('online', onlineHandler);
      window.addEventListener('offline', offlineHandler);

      destroyRef.onDestroy(() => {
        window.removeEventListener('online', onlineHandler);
        window.removeEventListener('offline', offlineHandler);
      });
    }
  }
}
