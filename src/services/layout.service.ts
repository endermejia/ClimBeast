import {
  computed,
  inject,
  Injectable,
  signal,
  WritableSignal,
} from '@angular/core';

import { TUI_BREAKPOINT } from '@taiga-ui/core';

import { OnlineStatusService } from './online-status.service';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private readonly breakpoint = inject(TUI_BREAKPOINT);
  private readonly onlineStatus = inject(OnlineStatusService);

  /** Signal that is true if the viewport is mobile-sized. */
  readonly isMobile = computed(() => this.breakpoint() === 'mobile');

  /** Signal that is true if the viewport is NOT desktop-sized (mobile or small desktop). */
  readonly isNotDesktop = computed(() => this.breakpoint() !== 'desktopLarge');

  /** Signal to show/hide the main navigation loading indicator. */
  readonly isNavLoading: WritableSignal<boolean> = signal(false);

  /** Signal that is true if user is offline. */
  readonly isOffline = this.onlineStatus.isOffline;
}
