import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiAppearance, TuiButton } from '@taiga-ui/core';
import {
  TuiBadgeNotification,
  TuiBadgedContent,
  TuiSkeleton,
} from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { HomeFeedFilter } from '../../pages/dashboard/home';
import { DropdownButtonComponent } from '../ui/dropdown-button';

@Component({
  selector: 'app-home-filter-bar',
  standalone: true,
  imports: [
    CommonModule,
    DropdownButtonComponent,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiBadgeNotification,
    TuiBadgedContent,
    TuiButton,
    TuiSkeleton,
  ],
  template: `
    <div class="flex justify-between items-center gap-2 py-2 lg:py-3">
      <!-- Left Side: Select and Filter -->
      <div class="flex items-center gap-2">
        @if (!followsLoaded()) {
          <div
            [tuiSkeleton]="true"
            class="w-32 h-10 rounded-full opacity-60"
          ></div>
          <div
            [tuiSkeleton]="true"
            class="w-10 h-10 rounded-full opacity-60"
          ></div>
        } @else {
          @if (showFilterDropdown()) {
            <app-dropdown-button
              appearance="flat-grayscale"
              size="xl"
              [content]="feedFilterDropdown()"
              [(open)]="dropdownOpenModel"
            >
              {{ filterLabels()[feedFilter()] | translate }}
            </app-dropdown-button>
          }
          <tui-badged-content [style.--tui-radius.%]="50">
            @if (hasActiveFilters()) {
              <tui-badge-notification
                tuiAppearance="accent"
                size="s"
                tuiSlot="top"
              />
            }
            <button
              tuiIconButton
              size="m"
              appearance="action-grayscale"
              iconStart="@tui.sliders-horizontal"
              (click.zoneless)="openFilters.emit()"
              [attr.aria-label]="'filters' | translate"
              title="Filters"
            >
              <span class="tui-sr-only">{{ 'filters' | translate }}</span>
            </button>
          </tui-badged-content>
        }
      </div>

      @if (!followsLoaded()) {
        <div
          [tuiSkeleton]="true"
          class="w-10 h-10 rounded-full opacity-60 mt-1"
        ></div>
      } @else {
        <div class="flex items-center gap-2">
          @if (isAdmin()) {
            <tui-badged-content [style.--tui-radius.%]="50">
              @if (cartTotalItems(); as totalItems) {
                <tui-badge-notification
                  tuiAppearance="accent"
                  size="s"
                  tuiSlot="top"
                >
                  {{ totalItems }}
                </tui-badge-notification>
              }
              <button
                tuiIconButton
                size="m"
                appearance="action-grayscale"
                iconStart="@tui.store"
                [routerLink]="['/merchandising']"
                [attr.aria-label]="'nav.merchandising' | translate"
                title="Shop"
              >
                <span class="tui-sr-only">{{
                  'nav.merchandising' | translate
                }}</span>
              </button>
            </tui-badged-content>
          }
          <tui-badged-content [style.--tui-radius.%]="50">
            @if (unreadNotificationsCount(); as unreadNotifications) {
              <tui-badge-notification
                tuiAppearance="accent"
                size="s"
                tuiSlot="top"
              >
                {{ unreadNotifications }}
              </tui-badge-notification>
            }
            <button
              tuiIconButton
              size="m"
              appearance="action-grayscale"
              iconStart="@tui.heart"
              (click.zoneless)="openNotifications.emit()"
              [attr.aria-label]="'notifications' | translate"
              title="Notifications"
            >
              <span class="tui-sr-only">{{ 'notifications' | translate }}</span>
            </button>
          </tui-badged-content>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeFilterBarComponent {
  followsLoaded = input<boolean>(true);
  showFilterDropdown = input<boolean>(false);
  feedFilterDropdown = input.required<any>();
  feedFilter = input.required<HomeFeedFilter>();
  filterLabels = input.required<Record<HomeFeedFilter, string>>();
  dropdownOpen = input<boolean>(false);
  dropdownOpenChange = output<boolean>();
  hasActiveFilters = input<boolean>(false);
  isAdmin = input<boolean>(false);
  cartTotalItems = input<number>(0);
  unreadNotificationsCount = input<number>(0);

  openFilters = output<void>();
  openNotifications = output<void>();

  get dropdownOpenModel(): boolean {
    return this.dropdownOpen();
  }
  set dropdownOpenModel(val: boolean) {
    this.dropdownOpenChange.emit(val);
  }
}
