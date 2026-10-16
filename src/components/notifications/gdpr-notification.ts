import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { LocalStorage } from '../../services/local-storage';

import { STORAGE_KEYS } from '../../constants';

@Component({
  selector: 'app-gdpr-notification',
  standalone: true,
  imports: [RouterLink, TranslatePipe, TuiButton],
  template: `
    <div class="flex flex-col gap-3 max-w-full overflow-hidden">
      <p
        class="text-xs sm:text-sm leading-relaxed text-(--tui-text-primary) m-0 break-words"
      >
        {{ 'gdpr.message' | translate }}
      </p>
      <div
        class="flex items-center justify-between gap-2.5 pt-2 border-t border-(--tui-border-normal)/60"
      >
        <a
          routerLink="/legal"
          tuiButton
          type="button"
          size="s"
          appearance="flat"
          class="text-xs! font-medium! px-2!"
          (click)="goToLegal()"
        >
          {{ 'legal.viewAll' | translate }}
        </a>
        <button
          tuiButton
          type="button"
          size="s"
          appearance="primary"
          class="text-xs! font-semibold! px-4! shrink-0 min-w-20"
          (click)="accept()"
        >
          {{ 'accept' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 100%;
        box-sizing: border-box;
      }
    `,
  ],
})
export class GdprNotificationComponent {
  private readonly context =
    inject<TuiDialogContext<boolean>>(POLYMORPHEUS_CONTEXT);
  private readonly storage = inject(LocalStorage);
  private readonly gdprKey = STORAGE_KEYS.gdprAccepted;

  protected goToLegal(): void {
    this.context.completeWith(false);
  }

  accept(): void {
    this.storage.setItem(this.gdprKey, 'true');
    this.context.completeWith(true);
  }
}
