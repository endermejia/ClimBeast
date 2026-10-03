import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { TuiButton, TuiIcon } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-offline-not-cached',
  standalone: true,
  imports: [RouterLink, TranslatePipe, TuiButton, TuiIcon],
  template: `
    <div
      class="w-full min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center p-6"
    >
      <div
        class="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2"
      >
        <tui-icon icon="@tui.wifi-off" class="text-4xl" />
      </div>

      <h2 class="text-2xl font-bold m-0">
        {{ title() | translate }}
      </h2>

      <p class="text-base text-neutral-500 dark:text-neutral-400 max-w-md m-0">
        {{ description() | translate }}
      </p>

      <div class="flex flex-col sm:flex-row items-center gap-3 mt-4">
        <button
          tuiButton
          appearance="secondary"
          type="button"
          (click)="goBack()"
        >
          <tui-icon icon="@tui.arrow-left" class="mr-2" />
          {{ 'notFound.goBack' | translate }}
        </button>

        <a tuiButton appearance="primary" [routerLink]="homeUrl()">
          <tui-icon icon="@tui.home" class="mr-2" />
          {{ 'notFound.goHome' | translate }}
        </a>
      </div>
    </div>
  `,
})
export class OfflineNotCachedComponent {
  private readonly router = inject(Router);

  title = input<string>('offline.notCachedTitle');
  description = input<string>('offline.notCachedDescription');
  fallbackUrl = input<string>('/home');
  homeUrl = input<string>('/home');

  protected goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      void this.router.navigateByUrl(this.fallbackUrl());
    }
  }
}
