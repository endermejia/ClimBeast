import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  TuiAppearance,
  TuiButton,
  TuiCarousel,
  TuiCheckbox,
  TuiDataList,
  TuiDialogService,
  TuiDropdown,
  TuiIcon,
  TuiInput,
  TuiLabel,
  TuiLoader,
  TuiNotification,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  TUI_CONFIRM,
  TuiAvatar,
  TuiBadgedContent,
  TuiBadgeNotification,
  TuiConfirmData,
  TuiSegmented,
} from '@taiga-ui/kit';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { AuthStateService } from '../../services/auth-state.service';
import { BreadcrumbsService } from '../../services/breadcrumbs.service';
import { CacheService } from '../../services/cache.service';
import { FavoritesDataService } from '../../services/favorites-data.service';
import { FilterStateService } from '../../services/filter-state.service';
import { FiltersService } from '../../services/filters.service';
import { IndoorCentersDataService } from '../../services/indoor-centers-data.service';
import { IndoorService } from '../../services/indoor.service';
import { LayoutService } from '../../services/layout.service';
import { MapDataService } from '../../services/map-data.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { VisitedIndoorCentersService } from '../../services/visited-indoor-centers.service';

import { AscentCardComponent } from '../../components/ascent/ascent-card';
import { IndoorToposComponent } from '../../components/indoor/indoor-topos';
import { IndoorVouchersComponent } from '../../components/indoor/indoor-vouchers';
import { IndoorRoutesTableComponent } from '../../components/route/indoor-routes-table';
import {
  CustomCarouselComponent,
  CarouselItem,
} from '../../components/ui/custom-carousel';
import { EmptyStateComponent } from '../../components/ui/empty-state';
import {
  SectionHeaderAction,
  SectionHeaderComponent,
} from '../../components/ui/section-header';
import { UbicacionDropdownComponent } from '../../components/ui/ubicacion-dropdown';

import {
  ClimbingKinds,
  GRADE_NUMBER_TO_LABEL,
  IndoorAscentWithExtras,
  IndoorCenterDto,
  IndoorRouteWithExtras,
  IndoorTopoListItem,
  IndoorVoucherDto,
  ORDERED_GRADE_VALUES,
  PROJECT_GRADE_LABEL,
  RouteAscentWithExtras,
  VERTICAL_LIFE_GRADES,
} from '../../models';

import { CACHE_KEYS, STORAGE_KEYS } from '../../constants';
import { AnyToSchedulePipe } from '../../pipes';
import {
  createCachedResource,
  handleErrorToast,
  inputValueOrUndefined,
  matchesQuery,
} from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-indoor-center',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    TuiAppearance,
    TuiAvatar,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiButton,
    TuiCarousel,
    TuiCheckbox,
    TuiDataList,
    TuiDropdown,
    TuiIcon,
    TuiInput,
    TuiLabel,
    TuiLoader,
    TuiNotification,
    TuiScrollbar,
    TuiSegmented,
    TuiTextfield,
    RouterLink,
    SectionHeaderComponent,
    IndoorVouchersComponent,
    IndoorRoutesTableComponent,
    IndoorToposComponent,
    AnyToSchedulePipe,
    CustomCarouselComponent,
    EmptyStateComponent,
    AscentCardComponent,
    UbicacionDropdownComponent,
  ],
  styles: `
    @media (min-width: 1024px) {
      :host > tui-scrollbar {
        overflow: hidden !important;
      }
      :host > tui-scrollbar ::ng-deep > .t-content {
        block-size: 100% !important;
        height: 100% !important;
        overflow: hidden !important;
      }
      :host > tui-scrollbar ::ng-deep > tui-scroll-controls {
        display: none !important;
      }
    }
  `,
  template: `
    <tui-scrollbar class="w-full h-full min-h-0 min-w-0">
      <section
        class="w-full max-w-[1600px] mx-auto py-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-6 lg:h-full lg:min-h-0 lg:overflow-hidden pb-6 lg:pb-2"
      >
        @if (center(); as c) {
          <!-- Left Column -->
          <div
            class="flex flex-col w-full lg:flex-1 min-w-0 lg:h-full lg:min-h-0 lg:overflow-hidden"
          >
            <tui-scrollbar class="w-full h-full min-h-0">
              <div
                class="flex flex-col gap-4 w-full min-w-0 px-4 lg:px-0 lg:pr-4 pb-6"
              >
                <div class="mb-2">
                  <app-section-header
                    [title]="c.name"
                    [showLike]="true"
                    [liked]="isLiked()"
                    (toggleLike)="onToggleLike()"
                    [actions]="headerActions()"
                  >
                    <span
                      titleInfo
                      class="flex items-center gap-1 text-sm font-normal text-(--tui-text-secondary) mt-1.5 select-none"
                    >
                      <tui-icon icon="@tui.map-pin" />
                      <span>{{ c.city }}</span>
                    </span>
                  </app-section-header>
                </div>

                <!-- Gallery/Avatar + Schedule (side by side at xl+) -->
                <div class="flex flex-col xl:flex-row xl:flex-wrap gap-4">
                  <div
                    class="relative rounded-3xl overflow-hidden aspect-video xl:flex-1 xl:self-start xl:order-1 bg-(--tui-background-neutral-1)"
                  >
                    @if (carouselItems().length > 0) {
                      <app-custom-carousel
                        [items]="carouselItems()"
                        [(index)]="galleryIndex"
                        [objectCover]="true"
                        class="h-full w-full"
                      />
                    } @else {
                      <div class="flex items-center justify-center h-full">
                        <span
                          [tuiAvatar]="
                            supabase.getPublicUrl(
                              'indoor-centers',
                              c.avatar_url
                            )
                          "
                          size="xxl"
                          class="rounded-3xl"
                        ></span>
                      </div>
                    }
                  </div>

                  <!-- Description (below the image on mobile, below the row on xl+) -->
                  <div
                    class="flex flex-col gap-2 min-w-0 xl:order-3 xl:basis-full"
                  >
                    @if (c.warning) {
                      <div
                        tuiNotification
                        appearance="warning"
                        class="rounded-2xl mb-2"
                      >
                        {{ c.warning }}
                      </div>
                    }
                    <p class="text-base sm:text-lg break-words">
                      {{ c.description }}
                    </p>
                  </div>

                  <!-- Schedule + Location -->
                  <div
                    class="flex flex-col gap-4 xl:w-80 2xl:w-96 shrink-0 xl:order-2"
                  >
                    <div
                      tuiAppearance="flat-grayscale"
                      class="p-4 rounded-3xl flex flex-col gap-4"
                    >
                      <h3 class="font-bold flex items-center gap-2">
                        <tui-icon icon="@tui.clock" />
                        {{ 'indoor.schedule' | translate }}
                      </h3>

                      @let schedule = c.schedule | anyToSchedule;
                      <div class="flex flex-col gap-1 text-sm">
                        @for (
                          day of [
                            'monday',
                            'tuesday',
                            'wednesday',
                            'thursday',
                            'friday',
                            'saturday',
                            'sunday',
                          ];
                          track day
                        ) {
                          <div
                            class="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 p-1 px-2.5 rounded-lg transition-all"
                            [class.bg-(--tui-background-accent-1)]="
                              day === currentDay
                            "
                            [class.text-(--tui-text-primary-on-accent-1)]="
                              day === currentDay
                            "
                            [class.font-bold]="day === currentDay"
                          >
                            <span class="capitalize whitespace-nowrap shrink-0">
                              {{ day | translate }}
                            </span>
                            @let s = schedule.normal[day];
                            <span
                              class="ml-auto whitespace-nowrap text-right"
                              >{{
                                s?.closed
                                  ? ('indoor.closed' | translate)
                                  : s?.open && s?.close
                                    ? s.open +
                                      ' - ' +
                                      s.close +
                                      (s.open2 && s.close2
                                        ? ' / ' + s.open2 + ' - ' + s.close2
                                        : '')
                                    : '-'
                              }}</span
                            >
                          </div>
                        }
                      </div>
                    </div>

                    @if (c.latitude && c.longitude) {
                      <app-ubicacion-dropdown
                        class="self-start"
                        [latitude]="c.latitude"
                        [longitude]="c.longitude"
                        (viewOnMap)="viewOnMap(c.latitude, c.longitude)"
                      />
                    }
                  </div>
                </div>

                @if (segmentedTabs().length > 1) {
                  <tui-segmented
                    [activeItemIndex]="activeTabIndex()"
                    (activeItemIndexChange)="activeTabIndex.set($event)"
                    class="w-full"
                  >
                    @for (tabIdx of segmentedTabs(); track tabIdx) {
                      <button type="button">
                        @if (tabIdx === 0) {
                          {{ toposCount() }}
                          {{ 'indoor.topos' | translate | lowercase }}
                        } @else if (tabIdx === 1) {
                          {{ totalRoutes() }}
                          {{ 'indoor.routes' | translate | lowercase }}
                        } @else if (tabIdx === 2) {
                          {{ ascentsCount() }}
                          {{ 'indoor.ascents' | translate | lowercase }}
                        } @else {
                          {{ vouchersCount() }}
                          {{ 'indoor.vouchers' | translate | lowercase }}
                        }
                      </button>
                    }
                  </tui-segmented>
                }

                <div class="mt-2 lg:flex-1 lg:min-h-0 min-w-0">
                  @let currentTab = segmentedTabs()[activeTabIndex()];
                  @if (loadedTabs().has(0)) {
                    <div
                      [hidden]="currentTab !== 0"
                      [class.hidden]="currentTab !== 0"
                    >
                      <app-indoor-topos
                        [centerId]="c.id"
                        [centerSlug]="c.slug"
                        [center]="c"
                      />
                    </div>
                  }
                  @if (loadedTabs().has(1)) {
                    <div
                      [hidden]="currentTab !== 1"
                      [class.hidden]="currentTab !== 1"
                    >
                      <div class="flex flex-col gap-4">
                        <div class="flex items-center justify-between px-3">
                          <label class="flex items-center gap-2 cursor-pointer">
                            <input
                              tuiCheckbox
                              type="checkbox"
                              [ngModel]="showLegacyRoutes()"
                              (ngModelChange)="showLegacyRoutes.set($event)"
                              autocomplete="off"
                            />
                            <span class="text-xs opacity-75 select-none">{{
                              'indoor.showLegacyRoutes' | translate
                            }}</span>
                          </label>

                          @if (totalRoutes() > 0) {
                            <div
                              class="flex items-center gap-2 text-xs font-semibold opacity-70"
                            >
                              @if (allCompleted()) {
                                {{ 'indoor.allCompleted' | translate }}
                              } @else {
                                {{
                                  'indoor.partialCompleted'
                                    | translate
                                      : {
                                          completed:
                                            totalRoutes() - pendingRoutes(),
                                          total: totalRoutes(),
                                        }
                                }}
                              }
                            </div>
                          }

                          @if (canCreateRoute()) {
                            <button
                              tuiButton
                              appearance="textfield"
                              size="s"
                              iconStart="@tui.plus"
                              (click.zoneless)="createRoute()"
                            >
                              {{ 'new' | translate }}
                            </button>
                          }
                        </div>

                        <div class="flex items-end gap-2">
                          <tui-textfield
                            class="grow block"
                            tuiTextfieldSize="l"
                          >
                            <label tuiLabel for="indoor-route-search">{{
                              'searchPlaceholder' | translate
                            }}</label>
                            <input
                              tuiInput
                              #indoorRouteSearch
                              id="indoor-route-search"
                              autocomplete="off"
                              [value]="routeQuery()"
                              (input.zoneless)="
                                routeQuery.set(indoorRouteSearch.value)
                              "
                            />
                          </tui-textfield>
                          <tui-badged-content>
                            @if (hasActiveRouteFilters()) {
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
                              (click.zoneless)="openRouteFilters()"
                            ></button>
                          </tui-badged-content>
                        </div>

                        <app-indoor-routes-table
                          [data]="filteredCenterRoutes()"
                          [centerId]="c.id"
                          [centerSlug]="c.slug"
                          [availableTopos]="topos()"
                        />
                      </div>
                    </div>
                  }
                  @if (loadedTabs().has(2)) {
                    <div
                      [hidden]="currentTab !== 2"
                      [class.hidden]="currentTab !== 2"
                    >
                      @let ascents = mappedAscents();
                      @if (centerAscentsLoading()) {
                        <div class="flex items-center justify-center p-8">
                          <tui-loader size="m" />
                        </div>
                      } @else {
                        <div
                          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                        >
                          @for (ascent of ascents; track ascent.id) {
                            <app-ascent-card
                              [data]="ascent"
                              [showRoute]="true"
                              [showUser]="true"
                            />
                          } @empty {
                            <div class="col-span-full">
                              <app-empty-state
                                icon="/image/indoor-brush.svg"
                                iconSize="8rem"
                                message="indoor.noAscents"
                              />
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                  @if (loadedTabs().has(3)) {
                    <div
                      [hidden]="currentTab !== 3"
                      [class.hidden]="currentTab !== 3"
                    >
                      <app-indoor-vouchers [centerId]="c.id" />
                    </div>
                  }
                </div>
              </div>
            </tui-scrollbar>
          </div>

          <!-- Right Column: Ascents Sidebar (desktop only) -->
          <div
            class="hidden lg:flex lg:w-[420px] xl:w-[460px] 2xl:w-[500px] shrink-0 min-w-0 lg:h-full flex-col"
          >
            <div class="flex flex-col w-full lg:h-full min-w-0 lg:min-h-0">
              <tui-scrollbar class="w-full lg:flex-1 lg:min-h-0">
                <div class="w-full min-w-0 px-4 lg:px-0 lg:pr-4 pb-6">
                  @let ascents = mappedAscents();
                  @if (centerAscentsLoading()) {
                    <div class="flex items-center justify-center p-8">
                      <tui-loader size="m" />
                    </div>
                  } @else {
                    <div class="flex flex-col gap-4">
                      @for (ascent of ascents; track ascent.id) {
                        <app-ascent-card
                          [data]="ascent"
                          [showRoute]="true"
                          [showUser]="true"
                        />
                      } @empty {
                        <app-empty-state
                          icon="/image/indoor-brush.svg"
                          iconSize="8rem"
                          message="indoor.noAscents"
                        />
                      }
                    </div>
                  }
                </div>
              </tui-scrollbar>
            </div>
          </div>
        } @else if (centerNotFound()) {
          <div
            class="w-full min-h-[50vh] flex flex-col items-center justify-center gap-3 text-center"
          >
            <h2 class="text-2xl font-bold">
              {{ 'notFound.title' | translate }}
            </h2>
            <a tuiButton appearance="flat" routerLink="/home">{{
              'notFound.goHome' | translate
            }}</a>
          </div>
        } @else {
          <div class="w-full min-h-[50vh] flex items-center justify-center">
            <tui-loader size="xxl" />
          </div>
        }
      </section>
    </tui-scrollbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col w-full h-full min-h-0' },
})
export class IndoorCenterComponent {
  protected readonly mappedAscents = computed(
    () => this.centerAscents() as unknown as RouteAscentWithExtras[],
  );

  slug = input.required<string>();

  protected readonly authState = inject(AuthStateService);
  protected readonly breadcrumbsService = inject(BreadcrumbsService);
  private readonly cache = inject(CacheService);
  protected readonly favoritesData = inject(FavoritesDataService);
  protected readonly filterState = inject(FilterStateService);
  protected readonly filtersService = inject(FiltersService);
  protected readonly layoutService = inject(LayoutService);
  protected readonly mapData = inject(MapDataService);
  protected readonly indoorCentersData = inject(IndoorCentersDataService);
  protected readonly indoor = inject(IndoorService);
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly queryParams = toSignal(this.route.queryParams);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly visitedCentersService = inject(VisitedIndoorCentersService);

  protected readonly isLiked = computed(() => {
    const centerId = this.center()?.id;
    if (!centerId) return false;
    return this.favoritesData.likedIndoorCenterIds().includes(centerId);
  });

  onToggleLike(): void {
    const c = this.center();
    if (!c) return;
    void this.indoor.toggleIndoorCenterLike(c.id);
  }

  protected readonly activeTabIndex = signal(0);
  protected readonly loadedTabs = signal<Set<number>>(new Set([0]));
  protected readonly galleryIndex = signal(0);

  protected readonly carouselItems = computed<CarouselItem[]>(() => {
    const c = this.center();
    if (!c?.gallery_urls) return [];
    return c.gallery_urls.map((url) => ({
      type: 'image',
      url: this.supabase.getPublicUrl('indoor-assets', url),
    }));
  });

  protected readonly center = computed<IndoorCenterDto | null>(
    // Valor cache-first: en visitas repetidas pinta desde la caché mientras
    // el resource se revalida en segundo plano. Nunca lanza (el helper
    // captura los errores) y devuelve la caché o `null` si no hay datos.
    () => this.centerCached.signal(),
  );

  /** Solo mostramos «no encontrado» cuando la consulta ya ha terminado. */
  protected readonly centerNotFound = computed(() => {
    // En SSR no hay navegador: `getCenterBySlug` devuelve null y el servidor
    // escribiría «No encontrado» en el HTML (es lo que se ve nada más entrar).
    // El servidor pinta el spinner para que case con el primer estado del
    // cliente; la carga real la hace el navegador.
    if (!this.isBrowser) {
      return false;
    }
    // Mientras el router no enlace `slug` no hay consulta real: el helper
    // devolvería `null` al instante (cacheKey nula) y eso se confundiría con
    // «no encontrado», así que seguimos en el spinner.
    const slug = inputValueOrUndefined(() => this.slug());
    if (!slug) {
      return false;
    }
    if (this.centerResource.status() === 'error') {
      return true;
    }
    // Primera visita en curso: ni resource ni caché tienen datos → cargando
    if (this.centerLoading()) {
      return false;
    }
    // idle / loading / reloading sin valor previo → seguimos cargando
    if (!this.centerResource.hasValue()) {
      return false;
    }
    return !this.center();
  });

  private readonly centerCached = createCachedResource<
    string | undefined,
    IndoorCenterDto | null
  >({
    // Si el router aún no ha enlazado `slug` devolvemos undefined → cacheKey
    // nula y no se consulta red (el helper devuelve `null` al instante)
    params: () => inputValueOrUndefined(() => this.slug()),
    isBrowser: this.isBrowser,
    cacheKey: (slug) => (slug ? CACHE_KEYS.centerDetail(slug) : null),
    fetcher: async (slug) => {
      if (!slug) return null;
      return this.indoor.getCenterBySlug(slug);
    },
    cache: this.cache,
    fallbackValue: null,
    logTag: 'IndoorCenter',
  });
  protected readonly centerResource = this.centerCached.resource;
  protected readonly centerLoading = this.centerCached.showSkeleton;

  private readonly toposCached = createCachedResource<
    string | undefined,
    IndoorTopoListItem[]
  >({
    params: () => this.center()?.id,
    isBrowser: this.isBrowser,
    cacheKey: (id) => (id ? CACHE_KEYS.centerTopos(id) : null),
    fetcher: async (id) => {
      if (!id) return [];
      return this.indoor.getCenterTopos(id);
    },
    cache: this.cache,
    fallbackValue: [],
    logTag: 'IndoorCenter',
  });
  protected readonly topos = this.toposCached.signal;

  private readonly vouchersCached = createCachedResource<
    string | undefined,
    IndoorVoucherDto[]
  >({
    params: () => this.center()?.id,
    isBrowser: this.isBrowser,
    cacheKey: (id) => (id ? CACHE_KEYS.centerVouchers(id) : null),
    fetcher: async (id) => {
      if (!id) return [];
      return this.indoor.getCenterVouchers(id);
    },
    cache: this.cache,
    fallbackValue: [],
    logTag: 'IndoorCenter',
  });
  protected readonly vouchers = this.vouchersCached.signal;

  protected readonly hasVouchers = computed(() => this.vouchers().length > 0);

  protected readonly showLegacyRoutes = signal<boolean>(
    typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_KEYS.showLegacyRoutes) === 'true'
      : false,
  );

  private readonly centerRoutesCached = createCachedResource<
    { id: string | undefined; showLegacy: boolean; reloadTick: number },
    IndoorRouteWithExtras[]
  >({
    params: () => ({
      id: this.center()?.id,
      showLegacy: this.showLegacyRoutes(),
      reloadTick: this.indoorCentersData.indoorRoutesReloadTick(),
    }),
    isBrowser: this.isBrowser,
    cacheKey: ({ id, showLegacy }) =>
      id ? CACHE_KEYS.centerRoutes(id, showLegacy) : null,
    fetcher: async ({ id, showLegacy }) => {
      if (!id) return [];
      return this.indoor.getCenterRoutes(id, showLegacy);
    },
    cache: this.cache,
    fallbackValue: [],
    logTag: 'IndoorCenter',
  });
  protected readonly centerRoutesResource = this.centerRoutesCached.resource;
  protected readonly centerRoutes = this.centerRoutesCached.signal;

  protected readonly routeQuery = signal('');
  protected readonly selectedGradeRange =
    this.filterState.indoorRoutesGradeRange;
  protected readonly selectedCategories =
    this.filterState.indoorRoutesCategories;
  protected readonly selectedToposOnly = this.filterState.indoorRoutesToposOnly;

  protected readonly activeRouteFilterCount = computed(() => {
    let count = 0;
    const [lo, hi] = this.selectedGradeRange();
    if (lo > 0 || hi < ORDERED_GRADE_VALUES.length - 1) {
      count++;
    }
    if (this.selectedCategories().length > 0) {
      count++;
    }
    if (this.selectedToposOnly()) {
      count++;
    }
    return count;
  });

  protected readonly hasActiveRouteFilters = computed(() => {
    return this.activeRouteFilterCount() > 0;
  });

  protected readonly filteredCenterRoutes = computed(() => {
    const routes = this.centerRoutes();
    const query = this.routeQuery().trim();
    const [minIdx, maxIdx] = this.selectedGradeRange();
    const allowedLabels = ORDERED_GRADE_VALUES.slice(minIdx, maxIdx + 1);
    const categories = this.selectedCategories();
    const toposOnly = this.selectedToposOnly();

    const textMatches = (r: IndoorRouteWithExtras) => {
      if (!query) return true;
      const gradeLabel =
        r.grade != null
          ? GRADE_NUMBER_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES]
          : null;
      const equippersNames = (r.equippers || [])
        .map((e) => e.name)
        .filter(Boolean);
      const toposNames = (r.topos || []).map((t) => t.name).filter(Boolean);
      const translatedColor = r.color
        ? this.translate.instant('colors.' + r.color)
        : null;

      return (
        matchesQuery(r.name, query) ||
        (gradeLabel ? matchesQuery(gradeLabel, query) : false) ||
        (r.color ? matchesQuery(r.color, query) : false) ||
        (translatedColor ? matchesQuery(translatedColor, query) : false) ||
        equippersNames.some((name) => matchesQuery(name, query)) ||
        toposNames.some((name) => matchesQuery(name, query))
      );
    };

    const gradeMatches = (r: IndoorRouteWithExtras) => {
      if (minIdx === 0 && maxIdx === ORDERED_GRADE_VALUES.length - 1)
        return true;
      if (r.grade == null) return true;
      const label = GRADE_NUMBER_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES];
      if (!label || label === PROJECT_GRADE_LABEL) return true;
      return (allowedLabels as readonly string[]).includes(label);
    };

    const categoryMatches = (r: IndoorRouteWithExtras) => {
      if (categories.length === 0) return true;
      const kind = r.climbing_kind;
      if (!kind) return true;
      if (categories.includes(0) && kind === ClimbingKinds.SPORT) return true;
      if (categories.includes(1) && kind === ClimbingKinds.BOULDER) return true;
      if (categories.includes(2) && kind === ClimbingKinds.MULTIPITCH)
        return true;
      return false;
    };

    const toposOnlyMatches = (r: IndoorRouteWithExtras) => {
      if (!toposOnly) return true;
      return (r.topos && r.topos.length > 0) || !!r.topo_id;
    };

    return routes.filter(
      (r) =>
        textMatches(r) &&
        gradeMatches(r) &&
        categoryMatches(r) &&
        toposOnlyMatches(r),
    );
  });

  protected openRouteFilters(): void {
    this.filtersService.openIndoorRouteFilters();
  }

  protected readonly totalRoutes = computed(() => {
    return this.centerRoutes().length;
  });

  protected readonly pendingRoutes = computed(() => {
    return this.centerRoutes().filter((r) => !r.own_ascent).length;
  });

  protected readonly allCompleted = computed(() => {
    const total = this.totalRoutes();
    return total > 0 && this.pendingRoutes() === 0;
  });

  protected readonly toposCount = computed(() => this.topos().length);

  protected readonly vouchersCount = computed(() => this.vouchers().length);

  protected readonly ascentsCount = computed(() => this.mappedAscents().length);

  private readonly centerAscentsCached = createCachedResource<
    { id: string | undefined; reloadTick: number },
    IndoorAscentWithExtras[]
  >({
    params: () => ({
      id: this.center()?.id,
      reloadTick: this.indoorCentersData.indoorRoutesReloadTick(),
    }),
    isBrowser: this.isBrowser,
    cacheKey: ({ id }) => (id ? CACHE_KEYS.centerAscents(id) : null),
    fetcher: async ({ id }) => {
      if (!id) return [];
      return this.indoor.getCenterAscents(id);
    },
    cache: this.cache,
    fallbackValue: [],
    logTag: 'IndoorCenter',
  });
  protected readonly centerAscents = this.centerAscentsCached.signal;
  protected readonly centerAscentsLoading =
    this.centerAscentsCached.showSkeleton;

  protected readonly isAdmin = computed(() => {
    return this.authState.isAdmin();
  });

  protected readonly canCreateRoute = computed(() => {
    const center = this.center();
    return this.authState.canCreateIndoorRoute(center);
  });

  protected readonly canEdit = computed(() => {
    const center = this.center();
    if (!center) return false;
    return !!this.authState.indoorAdminPermissions()[center.id];
  });

  protected readonly headerActions = computed<SectionHeaderAction[]>(() => {
    const c = this.center();
    if (!c) return [];

    const actions: SectionHeaderAction[] = [];
    const isAdmin = this.authState.isAdmin();
    const isCenterAdmin = this.authState.isIndoorAdminOf(c.id);
    const canEdit = isAdmin || isCenterAdmin;

    if (canEdit) {
      actions.push({
        label: 'edit',
        icon: '@tui.square-pen',
        appearance: 'neutral',
        action: () => this.openEditCenter(),
      });
      if (isAdmin) {
        actions.push({
          label: 'delete',
          icon: '@tui.trash',
          appearance: 'negative',
          action: () => this.deleteCenter(),
        });
      }
    } else if (!isAdmin && this.authState.userProfile()?.id) {
      if (!this.hasPendingAdminRequest()) {
        actions.push({
          label: 'admin.indoorAdminRequests.button',
          icon: '@tui.shield-alert',
          appearance: 'secondary',
          action: () => this.requestAdmin(),
        });
      }
      if (!this.isRoutesetter() && !this.hasPendingRoutesetterRequest()) {
        actions.push({
          label: 'admin.routesetterRequests.button',
          icon: '@tui.wrench',
          appearance: 'secondary',
          action: () => this.requestRoutesetter(),
        });
      }
    }

    return actions;
  });

  protected readonly hasPendingAdminRequest = computed(() => {
    const center = this.center();
    if (!center) return false;
    return this.authState.pendingIndoorAdminRequestCenterIds().has(center.id);
  });

  protected async requestAdmin(): Promise<void> {
    const center = this.center();
    if (!center || !this.isBrowser) return;

    const t = await firstValueFrom(
      this.translate.get([
        'admin.indoorAdminRequests.confirmTitle',
        'admin.indoorAdminRequests.confirmMessage',
      ]),
    );
    const title = t['admin.indoorAdminRequests.confirmTitle'];
    const message = t['admin.indoorAdminRequests.confirmMessage'];

    const data: TuiConfirmData = {
      content: message,
      yes: this.translate.instant('accept'),
      no: this.translate.instant('cancel'),
      appearance: 'primary',
    };

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: title,
        size: 's',
        data,
      }),
      { defaultValue: false },
    );

    if (!confirmed) return;

    const success = await this.indoor.requestIndoorCenterAdmin(center.id);
    if (success) {
      this.authState.pendingIndoorAdminRequestsResource.reload();
    }
  }

  protected readonly isRoutesetter = computed(() => {
    const center = this.center();
    if (!center) return false;
    return this.authState.routesetterIndoorCenters().includes(center.id);
  });

  protected readonly hasPendingRoutesetterRequest = computed(() => {
    const center = this.center();
    if (!center) return false;
    return this.authState
      .pendingIndoorRoutesetterRequestCenterIds()
      .has(center.id);
  });

  protected async requestRoutesetter(): Promise<void> {
    const center = this.center();
    if (!center || !this.isBrowser) return;

    const t = await firstValueFrom(
      this.translate.get([
        'admin.routesetterRequests.confirmTitle',
        'admin.routesetterRequests.confirmMessage',
      ]),
    );
    const title = t['admin.routesetterRequests.confirmTitle'];
    const message = t['admin.routesetterRequests.confirmMessage'];

    const data: TuiConfirmData = {
      content: message,
      yes: this.translate.instant('accept'),
      no: this.translate.instant('cancel'),
      appearance: 'primary',
    };

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: title,
        size: 's',
        data,
      }),
      { defaultValue: false },
    );

    if (!confirmed) return;

    const success = await this.indoor.requestIndoorCenterRoutesetter(center.id);
    if (success) {
      this.authState.pendingIndoorRoutesetterRequestsResource.reload();
    }
  }

  protected async openEditCenter(): Promise<void> {
    const center = this.center();
    if (!center) return;
    const success = await this.indoor.openIndoorCenterForm({
      centerData: center,
    });
    if (success) {
      this.centerResource.reload();
    }
  }

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.breadcrumbsService.selectedIndoorCenter.set(null);
    });

    effect(() => {
      const c = this.center();
      this.breadcrumbsService.selectedIndoorCenter.set(c);
    });

    effect(() => {
      const c = this.center();
      if (c) {
        this.visitedCentersService.addVisitedCenter({
          id: c.id,
          name: c.name,
          slug: c.slug,
        });
      }
    });

    effect(() => {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            STORAGE_KEYS.showLegacyRoutes,
            String(this.showLegacyRoutes()),
          );
        }
      } catch {
        // Ignored
      }
    });

    effect(() => {
      const has = this.hasVouchers();
      const currentTab = this.segmentedTabs()[this.activeTabIndex()];
      if (!has && currentTab === 3) {
        this.activeTabIndex.set(0);
      }
    });

    effect(() => {
      const slug = inputValueOrUndefined(() => this.slug());
      // Mientras el router no enlace la input no reseteamos las pestañas
      if (!slug) return;
      untracked(() => {
        const currentTab = this.segmentedTabs()[this.activeTabIndex()] ?? 0;
        this.loadedTabs.set(new Set([currentTab]));
      });
    });

    effect(() => {
      const currentTab = this.segmentedTabs()[this.activeTabIndex()];
      if (currentTab !== undefined) {
        this.loadedTabs.update((set) => {
          if (set.has(currentTab)) return set;
          const next = new Set(set);
          next.add(currentTab);
          return next;
        });
      }
    });

    effect(() => {
      const tabs = this.segmentedTabs();
      if (this.activeTabIndex() >= tabs.length && tabs.length > 0) {
        this.activeTabIndex.set(0);
      }
    });

    effect(() => {
      const params = this.queryParams();
      const tabs = this.segmentedTabs();
      if (!params || !tabs.length) return;

      const tab = params['tab'];
      if (tab === 'routes' && tabs.includes(1)) {
        this.activeTabIndex.set(tabs.indexOf(1));
      } else if (tab === 'topos' && tabs.includes(0)) {
        this.activeTabIndex.set(tabs.indexOf(0));
      } else if (tab === 'vouchers' && tabs.includes(3)) {
        this.activeTabIndex.set(tabs.indexOf(3));
      } else if (tab === 'ascents' && tabs.includes(2)) {
        this.activeTabIndex.set(tabs.indexOf(2));
      }
    });
  }

  protected readonly segmentedTabs = computed(() => {
    const tabs: number[] = [0, 1];
    if (this.hasVouchers()) {
      tabs.push(3);
    }
    if (this.layoutService.isNotDesktop()) {
      tabs.push(2);
    }
    return tabs;
  });

  async viewOnMap(lat: number, lng: number): Promise<void> {
    this.filterState.areaListShowIndoor.set(true);
    this.mapData.mapBounds.set({
      south_west_latitude: lat - 0.005,
      south_west_longitude: lng - 0.005,
      north_east_latitude: lat + 0.005,
      north_east_longitude: lng + 0.005,
    });
    void this.router.navigateByUrl('/explore');
  }

  async deleteCenter(): Promise<void> {
    const c = this.center();
    if (!c) return;
    if (!this.isBrowser) return;

    const t = await firstValueFrom(
      this.translate.get(['indoor.deleteTitle', 'indoor.deleteConfirm'], {
        name: c.name,
      }),
    );
    const title = t['indoor.deleteTitle'];
    const message = t['indoor.deleteConfirm'];
    const data: TuiConfirmData = {
      content: message,
      yes: this.translate.instant('delete'),
      no: this.translate.instant('cancel'),
      appearance: 'primary-destructive',
    };
    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: title,
        size: 's',
        data,
      }),
      { defaultValue: false },
    );
    if (!confirmed) return;
    try {
      const ok = await this.indoor.deleteCenter(c.id);
      if (ok) {
        await this.router.navigateByUrl('/explore');
      }
    } catch (error) {
      handleErrorToast(error, this.toast);
    }
  }

  protected readonly currentDay = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ][new Date().getDay()];

  async createRoute(): Promise<void> {
    const id = this.center()?.id;
    if (!id) return;
    const success = await this.indoor.openIndoorRouteForm(id);
    if (success) {
      this.centerRoutesResource.reload();
    }
  }
}
