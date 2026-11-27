import { LowerCasePipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { TuiButton, TuiIcon, TuiInput, TuiScrollbar } from '@taiga-ui/core';
import { TuiSegmented } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { AreasService } from '../../services/areas.service';
import { FilterStateService } from '../../services/filter-state.service';
import { FiltersService } from '../../services/filters.service';
import { IndoorCentersDataService } from '../../services/indoor-centers-data.service';
import { LayoutService } from '../../services/layout.service';
import { OnlineStatusService } from '../../services/online-status.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { ScrollService } from '../../services/scroll.service';

import { AreaCardSkeletonComponent } from '../../components/area/area-card-skeleton';
import { EmptyStateComponent } from '../../components/ui/empty-state';
import { ExploreMapFabComponent } from '../../components/ui/explore-map-fab';
import { FilterButtonComponent } from '../../components/ui/filter-button';
import { InfiniteScrollTriggerComponent } from '../../components/ui/infinite-scroll-trigger';
import { OfflineNotCachedComponent } from '../../components/ui/offline-not-cached';
import { PlaceCardComponent } from '../../components/ui/place-card';

import {
  filterAreas,
  hasActiveAreaFilters,
  reactToObservable,
} from '../../utils';

/**
 * Tarjetas pintadas por lote. La primera render solo construye esta ventana
 * (unas pocas pantallas) y el resto entra al acercarse al final, así la
 * navegación no se bloquea creando cientos de tarjetas de golpe.
 */
const CARD_WINDOW = 24;

@Component({
  selector: 'app-area-list',
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
                (click)="onTabClick($event, '/area')"
              >
                <tui-icon icon="@tui.map-pinned" />
                {{ filtered().length }}
                {{
                  (filtered().length === 1 ? 'area' : 'areas')
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
                {{ indoorCount() }}
                {{ 'indoor.title' | translate | lowercase }}
              </a>
            </tui-segmented>

            <div class="flex gap-2 flex-wrap sm:flex-nowrap justify-end">
              <button
                tuiButton
                appearance="textfield"
                size="s"
                type="button"
                (click.zoneless)="openCreateArea()"
                [iconStart]="'@tui.plus'"
              >
                {{ 'new' | translate }}
              </button>
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
              <label tuiLabel for="areas-search">
                {{ 'searchPlaceholder' | translate }}
              </label>
              <input
                tuiInput
                #areasSearch
                id="areas-search"
                autocomplete="off"
                [value]="query()"
                (input.zoneless)="onQuery(areasSearch.value)"
              />
            </tui-textfield>
            <app-filter-button
              [hasActiveFilters]="hasActiveFilters()"
              (clicked)="openFilters()"
            />
          </div>

          <!-- Areas list -->
          @if (!loading()) {
            <div
              class="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              @for (a of visibleAreas(); track a.id) {
                <app-place-card kind="area" [item]="a" />
              } @empty {
                <div class="col-span-full">
                  @if (onlineStatus.isOffline()) {
                    <!-- Sin red no hay nada que filtrar: ofrecemos volver. -->
                    <app-offline-not-cached fallbackUrl="/home" />
                  } @else {
                    <app-empty-state icon="@tui.map" />
                  }
                </div>
              }
              @if (hasMoreAreas()) {
                <div class="col-span-full flex justify-center">
                  <app-infinite-scroll-trigger (intersect)="showMoreAreas()" />
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
export class AreaListComponent {
  protected readonly scrollbar = viewChild(TuiScrollbar, { read: ElementRef });
  protected readonly skeletons = Array.from({ length: 16 }, (_, i) => i);
  protected readonly layoutService = inject(LayoutService);
  protected readonly onlineStatus = inject(OnlineStatusService);
  protected readonly router = inject(Router);
  private readonly scrollService = inject(ScrollService);

  protected readonly areasService = inject(AreasService);
  protected readonly filtersService = inject(FiltersService);
  protected readonly outdoorData = inject(OutdoorDataService);
  protected readonly indoorCentersData = inject(IndoorCentersDataService);
  private readonly filterState = inject(FilterStateService);

  readonly loading = computed(
    () => this.areasService.loading() || this.outdoorData.areasListLoading(),
  );
  readonly areas = computed(() => this.outdoorData.areasList());
  readonly indoorCount = computed(
    () => this.indoorCentersData.indoorCentersList().length,
  );

  readonly query: WritableSignal<string> = signal('');
  readonly selectedGradeRange = this.filterState.areaListGradeRange;
  readonly selectedCategories = this.filterState.areaListCategories;
  readonly selectedShade = this.filterState.areaListShade;

  readonly hasActiveFilters = computed(() =>
    hasActiveAreaFilters({
      gradeRange: this.selectedGradeRange(),
      categories: this.selectedCategories(),
      shade: this.selectedShade(),
      toposOnly: this.filterState.areaListToposOnly(),
    }),
  );
  readonly filtered = computed(() =>
    filterAreas(this.areas(), {
      query: this.query(),
      gradeRange: this.selectedGradeRange(),
      categories: this.selectedCategories(),
      shade: this.selectedShade(),
      toposOnly: this.filterState.areaListToposOnly(),
    }),
  );

  /**
   * Ventana de tarjetas efectivamente pintadas: `filtered()` completo solo se
   * recorre para el contador y los filtros, el DOM se queda en `CARD_WINDOW`
   * unidades hasta que el usuario baja el scroll.
   */
  private readonly visibleCount = this.outdoorData.areaListVisibleCount;
  readonly visibleAreas = computed(() =>
    this.filtered().slice(0, this.visibleCount()),
  );
  readonly hasMoreAreas = computed(
    () => this.filtered().length > this.visibleCount(),
  );

  protected showMoreAreas(): void {
    this.visibleCount.update((count) => count + CARD_WINDOW);
  }

  /** Cambiar búsqueda o filtros vuelve la ventana a su tamaño inicial. */
  private readonly filterKey = computed(() =>
    JSON.stringify([
      this.query(),
      this.selectedGradeRange(),
      this.selectedCategories(),
      this.selectedShade(),
      this.filterState.areaListToposOnly(),
    ]),
  );

  constructor() {
    reactToObservable(this.scrollService.scrollToTop$, () => {
      this.scrollToTop();
    });

    let initialRun = true;
    effect(() => {
      this.filterKey();
      if (initialRun) {
        initialRun = false;
        return;
      }
      untracked(() => this.visibleCount.set(CARD_WINDOW));
    });
  }

  protected onTabClick(event: MouseEvent, path: string): void {
    const current = this.router.url.split('?')[0].split('#')[0];
    if (current === path) {
      event.preventDefault();
      this.visibleCount.set(CARD_WINDOW);
      this.scrollToTop();
    }
  }

  private scrollToTop(): void {
    this.visibleCount.set(CARD_WINDOW);
    if (this.scrollbar()?.nativeElement) {
      this.scrollbar()!.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onQuery(v: string) {
    this.query.set(v);
  }

  openFilters(): void {
    this.filtersService.openFilters({ showToposOnly: true });
  }

  openCreateArea(): void {
    this.areasService.openAreaForm();
  }
}

export default AreaListComponent;
