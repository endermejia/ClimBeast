import { LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  WritableSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';

import {
  TuiAppearance,
  TuiButton,
  TuiDropdown,
  TuiIcon,
  TuiInput,
  TuiScrollbar,
} from '@taiga-ui/core';
import {
  TuiBadgedContent,
  TuiBadgeNotification,
  TuiPulse,
  TuiSegmented,
} from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { AuthStateService } from '../../services/auth-state.service';
import { FilterStateService } from '../../services/filter-state.service';
import { FiltersService } from '../../services/filters.service';
import { IndoorCentersDataService } from '../../services/indoor-centers-data.service';
import { IndoorService } from '../../services/indoor.service';
import { LayoutService } from '../../services/layout.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { TourService, TourStep } from '../../services/tour.service';

import { AreaCardSkeletonComponent } from '../../components/area/area-card-skeleton';
import { EmptyStateComponent } from '../../components/ui/empty-state';
import { InfiniteScrollTriggerComponent } from '../../components/ui/infinite-scroll-trigger';
import { PlaceCardComponent } from '../../components/ui/place-card';
import { TourHintComponent } from '../../components/ui/tour-hint';

import {
  isGradeRangeOverlap,
  normalizeRoutesByGrade,
  ORDERED_GRADE_VALUES,
} from '../../models';

import { matchesQuery } from '../../utils';

/**
 * Tarjetas pintadas por lote. La primera render solo construye esta ventana
 * (unas pocas pantallas) y el resto entra al acercarse al final, así la
 * navegación no se bloquea creando decenas de tarjetas de golpe.
 */
const CARD_WINDOW = 24;

@Component({
  selector: 'app-indoor-list',
  standalone: true,
  imports: [
    AreaCardSkeletonComponent,
    EmptyStateComponent,
    InfiniteScrollTriggerComponent,
    LowerCasePipe,
    PlaceCardComponent,
    RouterLink,
    RouterLinkActive,
    TourHintComponent,
    TranslatePipe,
    TuiAppearance,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiButton,
    TuiDropdown,
    TuiIcon,
    TuiInput,
    TuiPulse,
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
            <tui-badged-content class="rounded-2xl">
              @if (hasActiveFilters()) {
                <tui-badge-notification
                  tuiAppearance="accent"
                  size="s"
                  tuiSlot="top"
                />
              }
              <button
                tuiButton
                appearance="textfield"
                size="l"
                type="button"
                iconStart="@tui.sliders-horizontal"
                [attr.aria-label]="'filters' | translate"
                (click.zoneless)="openFilters()"
              ></button>
            </tui-badged-content>
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
                  <app-empty-state icon="@tui.dumbbell" />
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

      @let isExploreMapTourStep =
        tourService.isActive() && tourService.step() === TourStep.EXPLORE_MAP;

      <div
        class="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none w-full flex justify-center z-20"
      >
        <button
          tuiButton
          size="m"
          appearance="primary-grayscale"
          iconStart="@tui.map"
          routerLink="/explore"
          class="pointer-events-auto shadow-xl relative"
          [tuiDropdown]="tourHint"
          [tuiDropdownManual]="isExploreMapTourStep"
          tuiDropdownDirection="top"
          (click)="onMapClick()"
        >
          @if (isExploreMapTourStep) {
            <span
              class="absolute bottom-2 left-2 pointer-events-none z-10 size-0"
            >
              <tui-pulse />
            </span>
          }
          {{ 'map' | translate }}
        </button>
      </div>

      <ng-template #tourHint>
        <app-tour-hint
          class="w-72 max-w-[calc(100vw-2rem)] block"
          [description]="'tour.explore.mapButtonDescription' | translate"
          (next)="tourService.next()"
          (skip)="tourService.finish()"
        />
      </ng-template>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class IndoorListComponent {
  protected readonly skeletons = Array.from({ length: 16 }, (_, i) => i);
  protected readonly layoutService = inject(LayoutService);
  protected readonly tourService = inject(TourService);
  protected readonly TourStep = TourStep;

  protected onMapClick(): void {
    if (
      this.tourService.isActive() &&
      this.tourService.step() === TourStep.EXPLORE_MAP
    ) {
      void this.tourService.next();
    }
  }

  protected readonly authState = inject(AuthStateService);
  protected readonly filtersService = inject(FiltersService);
  protected readonly indoor = inject(IndoorService);
  protected readonly indoorCentersData = inject(IndoorCentersDataService);
  protected readonly outdoorData = inject(OutdoorDataService);
  protected readonly router = inject(Router);
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

  constructor() {
    effect(() => {
      const params = this.queryParams();
      const qVal = params?.['q'] ?? params?.['city'] ?? params?.['search'];
      if (qVal) {
        this.query.set(qVal);
      }
    });

    // Cambiar búsqueda o filtros vuelve la ventana de tarjetas a su tamaño inicial.
    effect(() => {
      this.filterKey();
      untracked(() => this.visibleCount.set(CARD_WINDOW));
    });
  }

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

  /**
   * Ventana de tarjetas efectivamente pintadas: `filtered()` completo solo se
   * recorre para el contador y los filtros, el DOM se queda en `CARD_WINDOW`
   * unidades hasta que el usuario baja el scroll.
   */
  private readonly visibleCount = signal(CARD_WINDOW);
  protected readonly visibleIndoor = computed(() =>
    this.filtered().slice(0, this.visibleCount()),
  );
  protected readonly hasMoreIndoor = computed(
    () => this.filtered().length > this.visibleCount(),
  );

  protected showMoreIndoor(): void {
    this.visibleCount.update((count) => count + CARD_WINDOW);
  }

  private readonly filterKey = computed(() =>
    JSON.stringify([
      this.query(),
      this.filterState.indoorListGradeRange(),
      this.filterState.indoorListToposOnly(),
    ]),
  );

  protected openFilters(): void {
    this.filtersService.openIndoorListFilters();
  }
}
