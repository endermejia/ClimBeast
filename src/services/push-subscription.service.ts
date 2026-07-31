import { effect, inject, Injectable } from '@angular/core';

import { IS_BROWSER } from '../app/is-browser';

import { AuthStateService } from './auth-state.service';
import { PushService } from './push.service';

@Injectable({ providedIn: 'root' })
export class PushSubscriptionService {
  private readonly authState = inject(AuthStateService);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly push = inject(PushService);

  constructor() {
    effect(() => {
      const profile = this.authState.userProfile();
      if (profile && this.isBrowser && this.push.isSupported()) {
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
