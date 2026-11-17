import {
  Component,
  computed,
  forwardRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiButton, TuiDialogService, TuiHint } from '@taiga-ui/core';
import {
  TUI_CONFIRM,
  TuiAvatar,
  TuiBadge,
  TuiConfirmData,
} from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { FollowsService } from '../../services/follows.service';
import { SupabaseService } from '../../services/supabase.service';

import { AscentDatePipe, AvatarUrlPipe, InitialsPipe } from '../../pipes';

import { UserInfoHintComponent } from '../ui/user-info-hint';

export interface AscentCardUser {
  name?: string | null;
  avatar?: string | null;
}

@Component({
  selector: 'app-ascent-card-header',
  imports: [
    AscentDatePipe,
    AvatarUrlPipe,
    InitialsPipe,
    RouterLink,
    TranslatePipe,
    TuiAvatar,
    TuiBadge,
    TuiButton,
    TuiHeader,
    TuiHint,
    forwardRef(() => UserInfoHintComponent),
  ],
  template: `
    <header
      tuiHeader
      class="flex flex-wrap justify-between items-center gap-x-2 gap-y-0"
    >
      @if (showUser()) {
        <div
          class="flex items-center gap-3"
          [tuiHint]="userHintTemplate"
          (contextmenu.zoneless)="$event.preventDefault()"
        >
          <span class="flex items-center cursor-pointer select-none">
            <span tuiAvatar size="s">
              @if (user()?.avatar; as avatar) {
                <img [src]="avatar | avatarUrl" [alt]="user()?.name || ''" />
              } @else {
                {{ user()?.name | initials }}
              }
            </span>
          </span>
          <a
            [routerLink]="['/profile', userId()]"
            class="flex flex-col no-underline text-inherit cursor-pointer group/user select-none"
          >
            <span class="font-bold text-sm group-hover/user:underline">
              {{ user()?.name || 'User' }}
            </span>
            @if (showDate() && date()) {
              <span class="text-xs">
                {{ date() ?? '' | ascentDate }}
              </span>
            }
          </a>
        </div>
        <ng-template #userHintTemplate>
          <app-user-info-hint
            [userId]="userId()"
            [fallbackName]="user()?.name"
            [fallbackAvatar]="user()?.avatar"
          />
        </ng-template>

        @if (userId() !== supabase.authUserId()) {
          @if (isFollowed()) {
            <button
              tuiButton
              size="s"
              appearance="secondary-grayscale"
              class="rounded-full!"
              [disabled]="loading()"
              [iconStart]="loading() ? '@tui.loader' : ''"
              (click)="unfollow(userId(), user()?.name || 'User')"
            >
              {{ 'followingStatus' | translate }}
            </button>
          } @else {
            <button
              tuiButton
              size="s"
              appearance="action"
              class="rounded-full!"
              [disabled]="loading()"
              [iconStart]="loading() ? '@tui.loader' : ''"
              (click)="follow(userId())"
            >
              {{ 'follow' | translate }}
            </button>
          }
        } @else if (showEdit()) {
          <div class="flex flex-col items-end gap-1">
            <button
              tuiButton
              size="s"
              appearance="secondary-grayscale"
              class="rounded-full!"
              (click)="editClick.emit()"
            >
              {{ 'edit' | translate }}
            </button>
            @if (isPrivate()) {
              <span tuiBadge appearance="accent" class="text-xs">
                {{ 'private' | translate }}
              </span>
            }
          </div>
        }
      } @else {
        <div class="flex justify-between items-center w-full">
          <div class="flex flex-col">
            @if (showDate() && date()) {
              <span class="text-xs text-gray-400">
                {{ date() ?? '' | ascentDate }}
              </span>
            }
          </div>
          @if (userId() === supabase.authUserId() && showEdit()) {
            <div class="flex flex-col items-end gap-1">
              <button
                tuiButton
                size="s"
                appearance="secondary-grayscale"
                class="rounded-full!"
                (click)="editClick.emit()"
              >
                {{ 'edit' | translate }}
              </button>
              @if (isPrivate()) {
                <span tuiBadge appearance="accent" class="text-xs">
                  {{ 'private' | translate }}
                </span>
              }
            </div>
          }
        </div>
      }
    </header>
  `,
})
export class AscentCardHeaderComponent {
  protected readonly supabase = inject(SupabaseService);
  private readonly followsService = inject(FollowsService);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);

  constructor() {
    if ('ensureFollowedIdsLoaded' in this.followsService) {
      void this.followsService['ensureFollowedIdsLoaded']();
    }
  }

  userId = input.required<string>();
  user = input<AscentCardUser | null | undefined>(null);
  date = input<string | null | undefined>(null);
  showUser = input(true);
  showDate = input(true);
  showEdit = input(false);
  isPrivate = input(false);

  editClick = output<void>();

  protected readonly loading = signal(false);

  protected readonly isFollowed = computed(() => {
    return this.followsService.followedIds().has(this.userId());
  });

  async follow(userId: string) {
    if (this.loading()) return;
    this.loading.set(true);
    try {
      await this.followsService.follow(userId);
    } finally {
      this.loading.set(false);
    }
  }

  async unfollow(userId: string, name: string) {
    if (this.loading()) return;
    const data: TuiConfirmData = {
      content: this.translate.instant('unfollowConfirm', {
        name,
      }),
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
        await this.followsService.unfollow(userId);
      } finally {
        this.loading.set(false);
      }
    }
  }
}
