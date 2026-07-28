import { isPlatformBrowser } from '@angular/common';
import { effect, inject, Injectable, PLATFORM_ID } from '@angular/core';

import { AuthStateService } from './auth-state.service';
import { PushService } from './push.service';

@Injectable({ providedIn: 'root' })
export class PushSubscriptionService {
  private readonly authState = inject(AuthStateService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly push = inject(PushService);

  constructor() {
    effect(() => {
      const profile = this.authState.userProfile();
      if (
        profile &&
        isPlatformBrowser(this.platformId) &&
        this.push.isSupported()
      ) {
        if (!this.push.isSubscribed()) {
          void this.push.subscribe();
        } else {
          void this.push.getCurrentSubscription().then((sub) => {
            if (sub) void this.push.saveSubscription(sub);
          });
        }
      }
    });
  }
}
