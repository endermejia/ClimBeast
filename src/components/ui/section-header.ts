import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
  TemplateRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiItem } from '@taiga-ui/cdk';
import {
  TuiAppearance,
  TuiButton,
  TuiDataList,
  TuiDropdown,
  TuiLink,
} from '@taiga-ui/core';
import { TuiBreadcrumbs } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { BreadcrumbsService } from '../../services/breadcrumbs.service';
import { LayoutService } from '../../services/layout.service';
import { OnlineStatusService } from '../../services/online-status.service';

import { DropdownButtonComponent } from './dropdown-button';

export interface SectionHeaderAction {
  label: string;
  icon: string;
  action: () => void;
  appearance?: 'neutral' | 'negative' | 'secondary' | 'accent' | string;
}

@Component({
  selector: 'app-section-header',
  imports: [
    DatePipe,
    DropdownButtonComponent,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiBreadcrumbs,
    TuiButton,
    TuiDataList,
    TuiDropdown,
    TuiItem,
    TuiLink,
  ],
  template: `
    <header class="flex flex-col w-full">
      @let breadcrumbs = breadcrumbsService.slicedBreadcrumbs();
      @let isMobile = layoutService.isMobile();

      <div class="flex flex-wrap items-start justify-between gap-3">
        <!-- Breadcrumb -->
        @if (breadcrumbs.length) {
          <tui-breadcrumbs
            size="l"
            [itemsLimit]="isMobile && breadcrumbs.length > 1 ? 2 : 1"
            ngSkipHydration
          >
            @for (item of breadcrumbs; track item.routerLink) {
              <a
                *tuiItem
                tuiLink
                [routerLink]="item.routerLink"
                class="text-xs opacity-60"
              >
                {{ item.caption | translate }}
              </a>
            }
          </tui-breadcrumbs>
        }
        <!-- Actions container -->
        <div class="flex flex-wrap items-center gap-2 shrink-0 ms-auto">
          <!-- Offline last updated indicator -->
          @if (onlineStatusService.isOffline() && lastUpdated()) {
            <span
              class="text-xs opacity-50 whitespace-nowrap"
              [title]="lastUpdated()! | date: 'medium'"
            >
              {{ 'offline.lastUpdated' | translate }}
              {{ lastUpdated()! | date: 'shortTime' }}
            </span>
          }

          <!-- Like button -->
          @if (showLike()) {
            <button
              size="s"
              [appearance]="liked() ? 'accent' : 'neutral'"
              iconStart="@tui.heart"
              tuiIconButton
              type="button"
              class="rounded-full!"
              (click.zoneless)="toggleLike.emit()"
            >
              {{ (liked() ? 'favorite.remove' : 'favorite.add') | translate }}
            </button>
          }

          <!-- Ellipsis action menu -->
          @if (actions().length > 0) {
            <button
              size="s"
              appearance="neutral"
              iconStart="@tui.ellipsis-vertical"
              tuiIconButton
              type="button"
              class="rounded-full!"
              [tuiDropdown]="actionsDropdown"
              [(tuiDropdownOpen)]="actionsDropdownOpen"
              [attr.aria-label]="'options' | translate"
            >
              {{ 'options' | translate }}
            </button>
            <ng-template #actionsDropdown>
              <tui-data-list>
                @for (item of actions(); track item.label) {
                  <button
                    tuiOption
                    type="button"
                    [tuiAppearance]="item.appearance ?? 'neutral'"
                    [iconStart]="item.icon"
                    (click.zoneless)="
                      item.action(); actionsDropdownOpen.set(false)
                    "
                  >
                    {{ item.label | translate }}
                  </button>
                }
              </tui-data-list>
            </ng-template>
          }
          <!-- Custom action buttons slot -->
          <ng-content select="[actionButtons]" />
        </div>
      </div>
      <!-- Title / Dropdown -->
      <h1
        class="text-2xl font-bold flex gap-2 items-center w-full"
        [class.line-clamp-1]="!titleDropdown()"
      >
        @if (titleDropdown(); as template) {
          <app-dropdown-button
            size="2xl"
            [label]="title()"
            [content]="template"
            [count]="itemCount()"
            [(open)]="dropdownOpen"
          />
        } @else {
          {{ title() }}
        }
        <!-- Additional title info (e.g., shade icon in topos) -->
        <ng-content select="[titleInfo]" />
      </h1>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionHeaderComponent {
  protected readonly layoutService = inject(LayoutService);
  protected readonly onlineStatusService = inject(OnlineStatusService);
  protected readonly breadcrumbsService = inject(BreadcrumbsService);

  title = input.required<string>();
  titleDropdown = input<TemplateRef<Record<string, unknown>> | null>(null);
  itemCount = input(1);
  liked = input(false);
  showLike = input(true);
  lastUpdated = input<Date | null>(null);
  actions = input<SectionHeaderAction[]>([]);

  dropdownOpen = signal(false);
  actionsDropdownOpen = signal(false);

  toggleLike = output<void>();
}
