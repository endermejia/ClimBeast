import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OnlineStatusService {
  private readonly platformId = inject(PLATFORM_ID);
  readonly isOffline = signal(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
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
