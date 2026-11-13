import { CommonModule } from '@angular/common';
import {
  Component,
  SecurityContext,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { TuiAppearance, TuiButton, TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM, TuiAvatar, type TuiConfirmData } from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { FollowsService } from '../../services/follows.service';

import { NewsItem } from '../../models';

import { AscentDatePipe } from '../../pipes';
import { toProxiedDesnivelUrl } from '../../utils';

@Component({
  selector: 'app-news-card',
  standalone: true,
  imports: [
    AscentDatePipe,
    CommonModule,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiButton,
    TuiHeader,
  ],
  template: `
    @let data = item();
    <div
      tuiAppearance="flat-grayscale"
      class="flex flex-col gap-1.5 p-4 sm:rounded-3xl rounded-none relative -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full text-left overflow-hidden"
    >
      <header tuiHeader class="mt-0! flex justify-between items-center">
        <a
          [href]="data.link"
          target="_blank"
          class="flex items-center gap-3 no-underline text-inherit cursor-pointer group/user"
        >
          <span tuiAvatar size="s">
            <img [src]="avatarUrl" alt="Desnivel" />
          </span>
          <div class="flex flex-col">
            <span class="font-bold text-sm group-hover/user:underline">
              Desnivel
            </span>
            <span class="text-xs">
              {{ data.date | ascentDate }}
            </span>
          </div>
        </a>
        @if (isFollowed()) {
          <button
            tuiButton
            type="button"
            size="s"
            appearance="secondary-grayscale"
            class="rounded-full!"
            [disabled]="loading()"
            [iconStart]="loading() ? '@tui.loader' : ''"
            (click)="unfollow('Desnivel')"
          >
            {{ 'followingStatus' | translate }}
          </button>
        } @else {
          <button
            tuiButton
            type="button"
            size="s"
            appearance="action"
            class="rounded-full!"
            [disabled]="loading()"
            [iconStart]="loading() ? '@tui.loader' : ''"
            (click)="follow()"
          >
            {{ 'follow' | translate }}
          </button>
        }
      </header>

      @if (imageUrl(); as img) {
        @if (!imageFailed()) {
          <a
            [href]="data.link"
            target="_blank"
            class="-mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full bg-(--tui-background-neutral-1) sm:rounded-2xl overflow-hidden relative block"
          >
            <img
              [src]="img"
              class="w-full h-auto max-h-[500px] block transition-transform duration-500 hover:scale-[1.02]"
              [alt]="data.title"
              loading="lazy"
              (error)="imageFailed.set(true)"
            />
          </a>
        }
      }

      <div class="flex flex-col gap-1">
        <a
          [href]="data.link"
          target="_blank"
          class="font-bold text-lg leading-tight hover:underline cursor-pointer text-(--tui-text-primary) no-underline"
          [innerHTML]="sanitizedTitle()"
        ></a>
      </div>

      <a
        [href]="data.link"
        target="_blank"
        class="text-sm italic border-l-2 border-(--tui-border-normal) pl-3 py-1 self-start text-(--tui-text-secondary) line-clamp-3 no-underline cursor-pointer"
        [innerHTML]="sanitizedExcerpt()"
      ></a>
    </div>
  `,
})
export class NewsCardComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly followsService = inject(FollowsService);

  item = input.required<NewsItem>();
  protected readonly imageFailed = signal(false);
  protected readonly loading = signal(false);

  readonly isFollowed = computed(() => this.followsService.followNews());

  async follow(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    try {
      await this.followsService.toggleFollowNews();
    } finally {
      this.loading.set(false);
    }
  }

  async unfollow(name = 'Desnivel'): Promise<void> {
    if (this.loading()) return;
    const data: TuiConfirmData = {
      content: this.translate.instant('unfollowConfirm', { name }),
      yes: this.translate.instant('unfollow'),
      no: this.translate.instant('cancel'),
      appearance: 'negative',
    };

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('unfollow'),
        size: 's',
        data,
      }),
      { defaultValue: false },
    );

    if (confirmed) {
      this.loading.set(true);
      try {
        await this.followsService.toggleFollowNews();
      } finally {
        this.loading.set(false);
      }
    }
  }

  readonly imageUrl = computed(() => {
    return toProxiedDesnivelUrl(this.item().image) ?? null;
  });

  sanitizedTitle = computed(
    () =>
      this.sanitizer.sanitize(SecurityContext.HTML, this.item().title) || '',
  );
  sanitizedExcerpt = computed(
    () =>
      this.sanitizer.sanitize(SecurityContext.HTML, this.item().excerpt) || '',
  );

  protected readonly avatarUrl = '/image/desnivel-avatar.png';
}
