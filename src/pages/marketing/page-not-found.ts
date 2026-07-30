import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiBlockStatus } from '@taiga-ui/layout';

import { TranslateModule } from '@ngx-translate/core';

import { IconSrcPipe } from '../../pipes/icon-src.pipe';

@Component({
  selector: 'app-page-not-found',
  imports: [
    IconSrcPipe,
    RouterLink,
    TranslateModule,
    TuiBlockStatus,
    TuiButton,
    TuiIcon,
  ],
  template: `
    <div class="flex h-full items-center justify-center">
      <tui-block-status class="w-full max-w-5xl mx-auto p-4">
        <img
          alt="{{ 'notFound.imageAlt' | translate }}"
          [src]="'404' | iconSrc"
          tuiSlot="top"
        />

        <h4>{{ 'notFound.title' | translate }}</h4>

        <p class="description">{{ 'notFound.description' | translate }}</p>

        <div class="flex flex-col sm:flex-row justify-center gap-2 mt-4">
          <button tuiButton type="button" appearance="flat" (click)="refresh()">
            <tui-icon icon="@tui.refresh-cw" class="mr-2" />
            {{ 'notFound.refresh' | translate }}
          </button>
          <button
            tuiButton
            type="button"
            appearance="flat"
            (click)="location.back()"
          >
            <tui-icon icon="@tui.arrow-left" class="mr-2" />
            {{ 'notFound.goBack' | translate }}
          </button>
          <a
            tuiButton
            type="button"
            appearance="primary"
            [routerLink]="['/home']"
          >
            <tui-icon icon="@tui.home" class="mr-2" />
            {{ 'notFound.goHome' | translate }}
          </a>
        </div>
      </tui-block-status>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'h-full',
  },
})
export class PageNotFoundComponent {
  protected readonly location = inject(Location);

  protected refresh(): void {
    window.location.reload();
  }
}
