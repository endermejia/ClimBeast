import { LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import {
  TuiAppearance,
  TuiButton,
  TuiIcon,
  TuiInput,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TuiSegmented } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { AuthStateService } from '../../services/auth-state.service';
import { IndoorCentersDataService } from '../../services/indoor-centers-data.service';
import { IndoorService } from '../../services/indoor.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';

import { IndoorCenterCardComponent } from '../../components/indoor/indoor-center-card';
import { EmptyStateComponent } from '../../components/ui/empty-state';

import { matchesQuery } from '../../utils';

@Component({
  selector: 'app-indoor-list',
  standalone: true,
  imports: [
    IndoorCenterCardComponent,
    EmptyStateComponent,
    LowerCasePipe,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    TuiAppearance,
    TuiButton,
    TuiIcon,
    TuiInput,
    TuiScrollbar,
    TuiSegmented,
  ],
  template: `
    <div class="relative flex grow min-h-0">
      <tui-scrollbar class="flex grow">
        <section
          class="w-full max-w-[1600px] mx-auto p-4 pb-32 flex flex-col gap-4"
        >
          <header class="flex items-center justify-between gap-2">
            <tui-segmented size="l">
              <a
                routerLink="/area"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: true }"
              >
                <tui-icon icon="@tui.map-pinned" />
                {{ areasCount() }}
                {{
                  (areasCount() === 1 ? 'area' : 'areas')
                    | translate
                    | lowercase
                }}
              </a>
              <a
                routerLink="/indoor"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: true }"
              >
                <tui-icon icon="@tui.dumbbell" />
                {{ filtered().length }}
                {{ 'indoor.title' | translate | lowercase }}
              </a>
            </tui-segmented>

            <div class="flex gap-2 flex-wrap sm:flex-nowrap justify-end">
              @if (authState.isAdmin()) {
                <button
                  tuiButton
                  appearance="textfield"
                  size="s"
                  type="button"
                  iconStart="@tui.plus"
                  (click.zoneless)="indoor.openIndoorCenterForm()"
                >
                  {{ 'new' | translate }}
                </button>
              }
            </div>
          </header>

          <div
            class="sticky top-0 z-10 flex items-end gap-2 bg-(--tui-background-base)"
          >
            <tui-textfield
              appearance="floating"
              class="grow block"
              tuiTextfieldSize="l"
            >
              <label tuiLabel for="indoor-search">
                {{ 'searchPlaceholder' | translate }}
              </label>
              <input
                tuiInput
                #indoorSearch
                id="indoor-search"
                autocomplete="off"
                [value]="query()"
                (input.zoneless)="query.set(indoorSearch.value)"
              />
            </tui-textfield>
          </div>

          <!-- Indoor list -->
          @if (!loading()) {
            <div
              class="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              @for (item of filtered(); track item.id) {
                <app-indoor-center-card [item]="item" />
              } @empty {
                <div class="col-span-full">
                  <app-empty-state icon="@tui.dumbbell" />
                </div>
              }
            </div>
          } @else {
            <div
              class="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              @for (i of [1, 2, 3, 4]; track i) {
                <div
                  tuiAppearance="flat-grayscale"
                  class="rounded-3xl h-72 animate-pulse bg-(--tui-background-neutral-1)"
                ></div>
              }
            </div>
          }
        </section>
      </tui-scrollbar>

      <div
        class="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none w-full flex justify-center z-20"
      >
        <button
          tuiButton
          size="m"
          appearance="primary-grayscale"
          iconStart="@tui.map"
          routerLink="/explore"
          class="pointer-events-auto shadow-xl"
        >
          {{ 'map' | translate }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class IndoorListComponent {
  protected readonly authState = inject(AuthStateService);
  protected readonly indoor = inject(IndoorService);
  protected readonly indoorCentersData = inject(IndoorCentersDataService);
  protected readonly outdoorData = inject(OutdoorDataService);
  protected readonly router = inject(Router);

  protected readonly areasCount = computed(
    () => this.outdoorData.areasList().length,
  );

  protected readonly loading = computed(() =>
    this.indoorCentersData.indoorCentersResource.isLoading(),
  );

  protected readonly query: WritableSignal<string> = signal('');

  protected readonly filtered = computed(() => {
    const list = this.indoorCentersData.indoorCentersList();
    const q = this.query();

    if (!q) return list;

    return list.filter((item) =>
      matchesQuery(`${item.name} ${item.city || ''}`, q),
    );
  });
}
