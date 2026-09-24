import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiAppearance, TuiIcon } from '@taiga-ui/core';
import { TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

export interface UnifiedActiveItem {
  name: string;
  link: string[];
  visitedAt: number;
  liked?: boolean;
}

@Component({
  selector: 'app-home-recent-places',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiIcon,
    TuiSkeleton,
  ],
  template: `
    @if (!followsLoaded() || isLoading()) {
      <div class="flex flex-col gap-2 pb-3">
        <div
          [tuiSkeleton]="true"
          class="w-24 h-4 rounded-full opacity-40 ml-1"
        ></div>
        <div class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
          @for (_ of [1, 2, 3, 4, 5, 6]; track $index) {
            <div
              [tuiSkeleton]="true"
              class="flex-none w-28 h-11 rounded-2xl opacity-30"
            ></div>
          }
        </div>
      </div>
    } @else if (items(); as list) {
      @if (list.length > 0) {
        <div class="flex flex-col gap-2 pb-3">
          <span class="text-xs font-bold opacity-60 uppercase px-1">
            {{ 'home.sectorsAndGyms' | translate }}
          </span>
          <div class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
            @for (item of list; track item.link.join('/')) {
              <a
                [routerLink]="item.link"
                tuiAppearance="textfield"
                class="flex-none p-3 rounded-2xl flex items-center gap-1.5"
              >
                @if (item.liked) {
                  <tui-icon
                    icon="@tui.heart"
                    class="shrink-0"
                    style="font-size: 1rem; color: var(--tui-background-accent-2)"
                    [attr.aria-label]="'favorite' | translate"
                  />
                }
                <span class="whitespace-nowrap font-bold text-sm">{{
                  item.name
                }}</span>
              </a>
            }
          </div>
        </div>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeRecentPlacesComponent {
  followsLoaded = input<boolean>(true);
  isLoading = input<boolean>(false);
  items = input<UnifiedActiveItem[] | null>(null);
}
