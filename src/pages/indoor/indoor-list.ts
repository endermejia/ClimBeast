import { LowerCasePipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';

import { TuiButton, TuiIcon, TuiInput, TuiScrollbar } from '@taiga-ui/core';
import { TuiSegmented } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { AuthStateService } from '../../services/auth-state.service';
import { FilterStateService } from '../../services/filter-state.service';
import { FiltersService } from '../../services/filters.service';
import { IndoorCentersDataService } from '../../services/indoor-centers-data.service';
import { IndoorService } from '../../services/indoor.service';
import { LayoutService } from '../../services/layout.service';
import { OnlineStatusService } from '../../services/online-status.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';

import { AreaCardSkeletonComponent } from '../../components/area/area-card-skeleton';
import { createCardWindowController } from '../../components/ui/card-window.controller';
import { EmptyStateComponent } from '../../components/ui/empty-state';
import { ExploreMapFabComponent } from '../../components/ui/explore-map-fab';
import { FilterButtonComponent } from '../../components/ui/filter-button';
import { InfiniteScrollTriggerComponent } from '../../components/ui/infinite-scroll-trigger';
import { OfflineNotCachedComponent } from '../../components/ui/offline-not-cached';
import { PlaceCardComponent } from '../../components/ui/place-card';

import {
  isGradeRangeOverlap,
  normalizeRoutesByGrade,
  ORDERED_GRADE_VALUES,
} from '../../models';

import { matchesQuery } from '../../utils';

@Component({
  selector: 'app-indoor-list',
  imports: [
    AreaCardSkeletonComponent,
    EmptyStateComponent,
    ExploreMapFabComponent,
    FilterButtonComponent,
    InfiniteScrollTriggerComponent,
    LowerCasePipe,
    OfflineNotCachedComponent,
    PlaceCardComponent,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
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
            <tui-segmented [size]="layoutService.isMobile() ? 's' : 'l'">
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
                (click)="onTabClick($event, '/indoor')"
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
            <app-filter-button
              [hasActiveFilters]="hasActiveFilters()"
              (clicked)="openFilters()"
            />
          </div>

          <!-- Indoor list -->
          @if (!loading()) {
            <div
              class="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              @for (item of visibleIndoor(); track item.id) {
                <app-place-card kind="indoor" [item]="item" />
              } @empty {
                <div class="col-span-full">
                  @if (onlineStatus.isOffline()) {
                    <!-- Sin red no hay nada que filtrar: ofrecemos volver. -->
                    <app-offline-not-cached fallbackUrl="/home" />
                  } @else {
                    <app-empty-state icon="@tui.dumbbell" />
                  }
                </div>
              }
              @if (hasMoreIndoor()) {
                <div class="col-span-full flex justify-center">
                  <app-infinite-scroll-trigger (intersect)="showMoreIndoor()" />
                </div>
              }
            </div>
          } @else {
            <div
              class="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              @for (i of skeletons; track i) {
                <app-area-card-skeleton />
              }
            </div>
          }
        </section>
      </tui-scrollbar>

      <app-explore-map-fab />
    </div>
  `,
  host: { class: 'flex grow min-h-0' },
})
export class IndoorListComponent {
  protected readonly scrollbar = viewChild(TuiScrollbar, { read: ElementRef });
  protected readonly skeletons = Array.from({ length: 16 }, (_, i) => i);
  protected readonly layoutService = inject(LayoutService);
  protected readonly onlineStatus = inject(OnlineStatusService);

  protected readonly authState = inject(AuthStateService);
  protected readonly filtersService = inject(FiltersService);
  protected readonly indoor = inject(IndoorService);
  protected readonly indoorCentersData = inject(IndoorCentersDataService);
  protected readonly outdoorData = inject(OutdoorDataService);
  private readonly filterState = inject(FilterStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly queryParams = toSignal(this.route.queryParams);

  protected readonly areasCount = computed(
    () => this.outdoorData.areasList().length,
  );

  protected readonly loading = computed(() =>
    this.indoorCentersData.indoorCentersLoading(),
  );

  protected readonly query: WritableSignal<string> = signal('');

  protected readonly hasActiveFilters = computed(() => {
    const [lo, hi] = this.filterState.indoorListGradeRange();
    const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
    return gradeActive || this.filterState.indoorListToposOnly();
  });

  protected readonly filtered = computed(() => {
    const list = this.indoorCentersData.indoorCentersList();
    const q = this.query();
    const [minIdx, maxIdx] = this.filterState.indoorListGradeRange();
    const toposOnly = this.filterState.indoorListToposOnly();

    return list.filter((item) => {
      if (q && !matchesQuery(`${item.name} ${item.city || ''}`, q)) {
        return false;
      }
      if (toposOnly && (item.topos?.length ?? 0) === 0) {
        return false;
      }
      return isGradeRangeOverlap(
        normalizeRoutesByGrade(item.grades),
        minIdx,
        maxIdx,
      );
    });
  });

  private readonly filterKey = computed(() =>
    JSON.stringify([
      this.query(),
      this.filterState.indoorListGradeRange(),
      this.filterState.indoorListToposOnly(),
    ]),
  );

  private readonly cardWindow = createCardWindowController({
    items: this.filtered,
    visibleCount: this.indoorCentersData.indoorListVisibleCount,
    filterKey: this.filterKey,
    scrollbar: this.scrollbar,
  });

  protected readonly visibleIndoor = this.cardWindow.visibleItems;
  protected readonly hasMoreIndoor = this.cardWindow.hasMore;
  protected readonly showMoreIndoor = this.cardWindow.showMore;
  protected readonly onTabClick = this.cardWindow.onTabClick;

  constructor() {
    effect(() => {
      const params = this.queryParams();
      const qVal = params?.['q'] ?? params?.['city'] ?? params?.['search'];
      if (qVal) {
        this.query.set(qVal);
      }
    });
  }

  protected openFilters(): void {
    this.filtersService.openIndoorListFilters();
  }
}
