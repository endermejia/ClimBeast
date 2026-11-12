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

import { TuiAppearance, TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe } from '@ngx-translate/core';

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
    TuiIcon,
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
          <span [tuiAvatar]="avatarUrl" size="s"></span>
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
            (click)="toggleFollow()"
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
            (click)="toggleFollow()"
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
          class="inline-flex items-center gap-1.5 font-bold text-lg leading-tight hover:underline cursor-pointer text-(--tui-text-primary) no-underline group/title"
        >
          <span [innerHTML]="sanitizedTitle()"></span>
          <tui-icon
            icon="@tui.external-link"
            class="text-sm opacity-60 group-hover/title:opacity-100 shrink-0"
          />
        </a>
      </div>

      <div
        class="text-sm italic border-l-2 border-(--tui-border-normal) pl-3 py-1 self-start text-(--tui-text-secondary) line-clamp-3"
        [innerHTML]="sanitizedExcerpt()"
      ></div>
    </div>
  `,
})
export class NewsCardComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly followsService = inject(FollowsService);

  item = input.required<NewsItem>();
  protected readonly imageFailed = signal(false);
  protected readonly loading = signal(false);

  readonly isFollowed = computed(() => this.followsService.followNews());

  async toggleFollow(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    try {
      await this.followsService.toggleFollowNews();
    } finally {
      this.loading.set(false);
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

  protected readonly avatarUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAMAAABF0y+mAAAAM1BMVEVHcEwAUowAUowAUowAUowAUowAUowAUowAUowAUowAUowAUowAUowAUowAUowAUow6nXSmAAAAEXRSTlMADd707LdpGUHI/0+VJ32sMXQpKsUAAADTSURBVHgBtdFXgsMgDEXRhxAIPer+Vzsmnp7wmevu4268q7A7mMSdpmwvsDiZaovU+kIr2YDuZD0hTCh2Qgxy3A/4AgvpQHaVFtBbGmX8YI9Ua2xZOLuma+H7jBtNqYPtvgTtWqy/6CxApjin2cAPLlKEpXpMq5La7BdmcjpF29o7ExnLDyayTLLgrirlcbn0dYF8Y+6PHRFhkBxlRM6A4NQ2PG40Oqaq7t/iOew9TRnTwtXkQgi2u+TOuu1FFe943XKpOFlUw6lBDUfs4mdEwDv7AJHCCVtPv7flAAAAAElFTkSuQmCC';
}
