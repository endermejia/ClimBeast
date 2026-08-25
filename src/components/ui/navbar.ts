import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { TuiAppearance, TuiDropdown, TuiIcon } from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiBadgedContent,
  TuiBadgeNotification,
  TuiPulse,
  TuiSkeleton,
} from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { AppNotificationsService } from '../../services/app-notifications.service';
import { AuthStateService } from '../../services/auth-state.service';
import { CartService } from '../../services/cart.service';
import { LayoutService } from '../../services/layout.service';
import { MessagingService } from '../../services/messaging.service';
import { ScrollService } from '../../services/scroll.service';
import { TourService, TourStep } from '../../services/tour.service';

import { MenuOptionsButtonComponent } from './menu-options-button';
import { NotificationBadgeComponent } from './notification-badge';
import { SearchDropdownComponent } from './search-dropdown';
import { TourHintComponent } from './tour-hint';

@Component({
  selector: 'app-navbar',
  host: {
    class: 'z-100 relative md:w-20 md:h-full md:flex md:items-center',
  },
  imports: [
    MenuOptionsButtonComponent,
    NgOptimizedImage,
    NotificationBadgeComponent,
    RouterLink,
    RouterLinkActive,
    SearchDropdownComponent,
    TourHintComponent,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgeNotification,
    TuiBadgedContent,
    TuiDropdown,
    TuiIcon,
    TuiPulse,
    TuiSkeleton,
  ],
  styles: `
    ::ng-deep nav tui-icon svg {
      stroke-width: 2.5 !important;
    }
  `,
  template: `
    <aside
      class="w-full md:w-20 md:hover:w-64 md:h-full bg-(--tui-background-base) transition-[width] duration-300 z-100 group flex flex-col border-t md:border xl:border-none border-(--tui-border-normal) md:absolute md:left-0 md:top-0 md:bottom-0 overflow-hidden sm:rounded-2xl select-none"
    >
      <div
        class="flex md:flex-col justify-between w-full h-full p-2 md:p-4 gap-2 md:gap-4"
      >
        <!-- Desktop Logo -->
        <button
          class="hidden md:block shrink-0 rounded-xl transition-colors cursor-pointer w-fit"
          type="button"
          tuiAppearance="flat-grayscale"
          routerLink="/home"
        >
          <img
            ngSrc="/logo/climbeast-small.svg"
            alt="ClimBeast"
            [style.width.px]="40"
            [style.height.px]="40"
            [class.rounded-full]="loading()"
            width="40"
            height="40"
            [tuiSkeleton]="loading()"
          />
        </button>

        <!-- Navigation Links (Middle) -->
        <nav
          class="w-full flex md:flex-col gap-2 md:gap-4 justify-around md:justify-start overflow-y-auto overflow-x-hidden my-auto"
        >
          <!-- Home -->
          <a
            #home="routerLinkActive"
            routerLink="/home"
            routerLinkActive
            tuiAppearance="flat-grayscale"
            [tuiSkeleton]="loading()"
            class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full relative group"
            (click)="scrollToTop($event)"
            [attr.aria-label]="'nav.home' | translate"
          >
            <div
              class="absolute inset-0 pointer-events-none"
              [tuiDropdown]="tourHint"
              [tuiDropdownManual]="
                tourService.isActive() && tourService.step() === TourStep.HOME
              "
              tuiDropdownDirection="bottom"
            ></div>
            @if (
              tourService.isActive() && tourService.step() === TourStep.HOME
            ) {
              <tui-pulse />
            }
            <app-notification-badge>
              <tui-icon
                icon="@tui.home"
                [style.color]="
                  home.isActive
                    ? 'var(--tui-text-negative)'
                    : 'var(--tui-text-primary)'
                "
              />
            </app-notification-badge>

            <span
              class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
            >
              {{ 'nav.home' | translate }}
            </span>
          </a>

          <!-- Explore -->
          <a
            #explore="routerLinkActive"
            [routerLink]="layout.isOffline() ? null : '/explore'"
            routerLinkActive
            tuiAppearance="flat-grayscale"
            [tuiSkeleton]="loading()"
            class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full relative group"
            [class.pointer-events-none]="layout.isOffline()"
            [class.opacity-50]="layout.isOffline()"
            [attr.aria-label]="'nav.explore' | translate"
          >
            <div
              class="absolute inset-0 pointer-events-none"
              [tuiDropdown]="tourHint"
              [tuiDropdownManual]="
                tourService.isActive() &&
                tourService.step() === TourStep.EXPLORE
              "
              tuiDropdownDirection="bottom"
            ></div>
            @if (
              tourService.isActive() && tourService.step() === TourStep.EXPLORE
            ) {
              <tui-pulse />
            }
            <tui-icon
              icon="@tui.map"
              [style.color]="
                explore.isActive
                  ? 'var(--tui-text-negative)'
                  : 'var(--tui-text-primary)'
              "
            />
            <span
              class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
            >
              {{ 'nav.explore' | translate }}
            </span>
          </a>

          <!-- Messages -->
          <button
            type="button"
            tuiAppearance="flat-grayscale"
            [tuiSkeleton]="loading()"
            class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full cursor-pointer relative group"
            (click)="openChat()"
            [attr.aria-label]="'messages' | translate"
          >
            <tui-badged-content>
              @if (messagingService.unreadMessagesCount(); as unreadMessages) {
                <tui-badge-notification
                  tuiAppearance="accent"
                  size="s"
                  tuiSlot="top"
                >
                  {{ unreadMessages }}
                </tui-badge-notification>
              }
              <tui-icon
                icon="@tui.send"
                [style.color]="
                  messagingService.chatOpen()
                    ? 'var(--tui-text-negative)'
                    : 'var(--tui-text-primary)'
                "
              />
            </tui-badged-content>
            <span
              class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
            >
              {{ 'messages' | translate }}
            </span>
          </button>

          @let showConfig =
            authState.canEditAsAdmin() || authState.isAreaAdmin();
          @if (showConfig) {
            <!-- Configuration -->
            <a
              #config="routerLinkActive"
              [routerLink]="authState.canEditAsAdmin() ? '/admin' : '/my-areas'"
              routerLinkActive
              tuiAppearance="flat-grayscale"
              class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full group"
              [attr.aria-label]="
                (authState.canEditAsAdmin() ? 'config' : 'nav.my-areas')
                  | translate
              "
            >
              <tui-icon
                icon="@tui.cog"
                [style.color]="
                  config.isActive
                    ? 'var(--tui-text-negative)'
                    : 'var(--tui-text-primary)'
                "
              />
              <span
                class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
              >
                @if (authState.canEditAsAdmin()) {
                  {{ 'config' | translate }}
                } @else {
                  {{ 'nav.my-areas' | translate }}
                }
              </span>
            </a>
          }

          <!-- Search -->
          <app-search-dropdown [loading]="loading()" />

          <!-- Profile -->
          <a
            #profile="routerLinkActive"
            routerLink="/profile"
            routerLinkActive
            tuiAppearance="flat-grayscale"
            [tuiSkeleton]="loading()"
            class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full lg:mt-auto group"
            [attr.aria-label]="'nav.profile' | translate"
          >
            <span
              tuiAvatar
              [tuiSkeleton]="!authState.userProfile()"
              [class.ring-2]="profile.isActive"
              [class.ring-offset-2]="profile.isActive"
              [style.--tw-ring-color]="
                profile.isActive ? 'var(--tui-text-negative)' : ''
              "
              size="xs"
            >
              @if (authState.userAvatar(); as avatar) {
                <img
                  [src]="avatar"
                  [alt]="authState.userProfile()?.name || ''"
                />
              } @else {
                <tui-icon
                  icon="@tui.user"
                  [style.color]="
                    profile.isActive
                      ? 'var(--tui-text-negative)'
                      : 'var(--tui-text-primary)'
                  "
                />
              }
            </span>
            <span
              class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
            >
              {{ 'nav.profile' | translate }}
            </span>
          </a>
        </nav>

        <!-- Desktop Bottom Options -->
        <div class="hidden md:flex flex-col gap-4 w-full shrink-0">
          @if (authState.merchandisingFeature()) {
            <!-- Shop -->
            <a
              #shop="routerLinkActive"
              routerLink="/merchandising"
              routerLinkActive
              tuiAppearance="flat-grayscale"
              class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full group"
              [attr.aria-label]="'nav.merchandising' | translate"
            >
              <tui-badged-content>
                @if (cart.totalItems(); as totalItems) {
                  <tui-badge-notification
                    tuiAppearance="accent"
                    size="s"
                    tuiSlot="top"
                  >
                    {{ totalItems }}
                  </tui-badge-notification>
                }
                <tui-icon
                  icon="@tui.store"
                  [style.color]="
                    shop.isActive
                      ? 'var(--tui-text-negative)'
                      : 'var(--tui-text-primary)'
                  "
                />
              </tui-badged-content>
              <span
                class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden text-sm"
              >
                {{ 'nav.merchandising' | translate }}
              </span>
            </a>
          }
          <app-menu-options-button
            appearance="flat-grayscale"
            [loading]="loading()"
            direction="top"
          />
        </div>
      </div>
    </aside>

    <ng-template #tourHint>
      <app-tour-hint
        [description]="tourDescription() | translate"
        (next)="onTourNext()"
        (skip)="tourService.finish()"
      />
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  readonly isLoading = input<boolean>(false);
  protected readonly loading = computed(
    () => this.isLoading() || this.layoutService.isNavLoading(),
  );
  protected readonly layoutService = inject(LayoutService);
  protected readonly authState = inject(AuthStateService);
  protected readonly messagingService = inject(MessagingService);
  protected readonly cart = inject(CartService);
  protected readonly notificationsService = inject(AppNotificationsService);
  protected readonly tourService = inject(TourService);
  protected readonly TourStep = TourStep;
  protected readonly tourDescription = computed(() => {
    const step = this.tourService.step();
    switch (step) {
      case TourStep.EXPLORE:
        return 'tour.explore.description';
      case TourStep.EXPLORE_AREAS:
        return 'tour.explore.areasDescription';
      case TourStep.AREAS:
        return 'tour.areas.description';
      case TourStep.SEARCH:
        return 'tour.search.description';
      case TourStep.HOME:
      default:
        return 'tour.home.description';
    }
  });
  protected readonly layout = inject(LayoutService);

  private readonly router = inject(Router);
  private readonly scrollService = inject(ScrollService);

  protected scrollToTop(event: MouseEvent): void {
    if (this.router.url === '/home') {
      event.preventDefault();
      this.scrollService.scrollToTop();
    }
  }

  protected onTourNext(): void {
    this.tourService.next();
  }

  protected openChat(): void {
    this.messagingService.openChatDialog();
  }

  protected openNotifications(): void {
    this.notificationsService.openNotifications();
  }
}
