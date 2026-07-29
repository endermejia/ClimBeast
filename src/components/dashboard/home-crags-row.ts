import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiAppearance } from '@taiga-ui/core';
import { TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { ActiveCrag } from '../../models/supabase-query.types';

@Component({
  selector: 'app-home-crags-row',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
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
    } @else if (crags(); as activeCrags) {
      @if (activeCrags.length > 0) {
        <div class="flex flex-col gap-2 pb-3">
          <span class="text-xs font-bold opacity-60 uppercase px-1">
            {{ 'crags' | translate }}
          </span>
          <div class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
            @for (c of activeCrags; track c.id) {
              <a
                [routerLink]="['/area', c.area_slug, c.slug]"
                tuiAppearance="textfield"
                class="flex-none p-3 rounded-2xl"
              >
                <span class="whitespace-nowrap font-bold text-sm">{{
                  c.name
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
export class HomeCragsRowComponent {
  followsLoaded = input<boolean>(true);
  isLoading = input<boolean>(false);
  crags = input<ActiveCrag[] | null>(null);
}
