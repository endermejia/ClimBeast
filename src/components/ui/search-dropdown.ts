import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  inject,
  input,
  Pipe,
  PipeTransform,
  resource,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { TuiAutoFocus } from '@taiga-ui/cdk';
import {
  TuiAppearance,
  TuiDataList,
  TuiIcon,
  TuiLink,
  TuiScrollbar,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiBadge,
  TuiPulse,
  TuiSkeleton,
  TuiTab,
  TuiTabs,
} from '@taiga-ui/kit';
import { TUI_INPUT_SEARCH, TuiInputSearch } from '@taiga-ui/layout';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs';

import { AreasService } from '../../services/areas.service';
import { AuthStateService } from '../../services/auth-state.service';
import { CragsService } from '../../services/crags.service';
import { LocalStorage } from '../../services/local-storage';
import { MerchandiseService } from '../../services/merchandise.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { RoutesService } from '../../services/routes.service';
import { SearchService } from '../../services/search.service';
import { TourService, TourStep } from '../../services/tour.service';
import { VisitedAreasService } from '../../services/visited-areas.service';
import { VisitedCragsService } from '../../services/visited-crags.service';
import { VisitedIndoorCentersService } from '../../services/visited-indoor-centers.service';

import {
  ActiveArea,
  ActiveCrag,
  ActiveIndoorCenter,
  MerchandiseItemDetail,
  SearchAreaItem,
  SearchCragItem,
  SearchData,
  SearchItem,
  SearchRouteItem,
} from '../../models';

import { CACHE_KEYS } from '../../constants';
import { gradeToNumber } from '../../utils';

import { GradeComponent } from './avatar-grade';
import { TourHintComponent } from './tour-hint';

@Pipe({
  name: 'isTourHighlight',
  standalone: true,
  pure: true,
})
export class IsTourHighlightPipe implements PipeTransform {
  transform(item: SearchItem, isTourSearch: boolean): boolean {
    if (!isTourSearch) {
      return false;
    }
    const pathSegments = (item.href || '').split('/').filter(Boolean);
    const isArea =
      item.type === 'area' ||
      (pathSegments.length === 2 && pathSegments[0] === 'area');
    const isMillena = (item.title || '').toLowerCase().includes('millena');
    return isArea && isMillena;
  }
}

@Component({
  selector: 'app-search-dropdown',
  imports: [
    FormsModule,
    GradeComponent,
    IsTourHighlightPipe,
    NgTemplateOutlet,
    ReactiveFormsModule,
    RouterLink,
    TourHintComponent,
    TranslatePipe,
    TuiAppearance,
    TuiAutoFocus,
    TuiAvatar,
    TuiBadge,
    TuiDataList,
    TuiIcon,
    TuiInputSearch,
    TuiLink,
    TuiPulse,
    TuiScrollbar,
    TuiSkeleton,
    TuiTab,
    TuiTabs,
    TuiTextfield,
    TuiTitle,
  ],
  providers: [
    {
      provide: TUI_INPUT_SEARCH,
      useFactory: () => {
        const translate = inject(TranslateService);
        return toSignal(
          translate.stream('searchPlaceholder').pipe(
            map((placeholder: string) => ({
              popular: '',
              history: '',
              placeholder,
              hotkey: '',
              all: '',
              empty: '',
            })),
          ),
          {
            initialValue: {
              popular: '',
              history: '',
              placeholder: '',
              hotkey: '',
              all: '',
              empty: '',
            },
          },
        );
      },
    },
  ],
  template: `
    <div class="flex flex-col gap-2 overflow-hidden flex-none relative">
      <button
        tuiAppearance="flat-grayscale"
        [tuiSkeleton]="loading()"
        class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full cursor-pointer relative group"
        (click)="searchOpen.set(true)"
        [attr.aria-label]="'search' | translate"
      >
        @if (tourService.isActive() && tourService.step() === TourStep.SEARCH) {
          <span
            class="absolute bottom-2 left-2 pointer-events-none z-10 size-0"
          >
            <tui-pulse />
          </span>
        }
        <tui-icon
          icon="@tui.search"
          [style.color]="
            searchOpen()
              ? 'var(--tui-text-negative)'
              : 'var(--tui-text-primary)'
          "
        />
        <span
          class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
        >
          {{ 'search' | translate }}
        </span>
      </button>
      <div class="hidden">
        <tui-textfield>
          <input
            #searchInput
            autocomplete="off"
            tuiAutoFocus
            [value]="searchValue()"
            (input)="searchValue.set(toValue($event))"
            [tuiInputSearch]="searchContent"
            [(tuiInputSearchOpen)]="searchOpen"
            [placeholder]="'searchPlaceholder' | translate"
          />
          <ng-template #searchContent>
            <ng-template #itemTemplate let-item>
              <div class="flex items-center w-full gap-3">
                @if (item.grade !== undefined) {
                  <app-grade
                    [grade]="item.grade"
                    [kind]="item.climbing_kind"
                    class="shrink-0"
                  />
                }
                @if (
                  item.type === 'user' ||
                  item.type === 'indoor' ||
                  item.type === 'equipper' ||
                  item.type === 'shop-item'
                ) {
                  <span tuiAvatar size="xs" class="shrink-0">
                    @if (item.icon && !item.icon.startsWith('@tui.')) {
                      <img [src]="item.icon" [alt]="item.title" />
                    } @else {
                      <tui-icon
                        [icon]="
                          item.icon ||
                          (item.type === 'user'
                            ? '@tui.user'
                            : item.type === 'equipper'
                              ? '@tui.hammer'
                              : item.type === 'shop-item'
                                ? '@tui.shirt'
                                : '@tui.map-pin')
                        "
                      />
                    }
                  </span>
                } @else if (item.icon && item.grade === undefined) {
                  <tui-icon [icon]="item.icon" class="shrink-0" />
                }
                <span tuiTitle class="min-w-0 flex-1 truncate">
                  {{ item.title }}
                  @if (item.subtitle) {
                    <span tuiSubtitle>{{ item.subtitle }}</span>
                  }
                </span>
              </div>
            </ng-template>

            <!-- Sin búsqueda activa: últimos buscados + populares + tienda -->
            @if (!searchValue().trim() && hasSuggestions()) {
              <div
                class="flex flex-col bg-(--tui-background-base) rounded-xl overflow-hidden w-[calc(100vw-1rem)] md:w-auto md:min-w-200 max-h-[80vh] relative"
              >
                <tui-scrollbar class="flex-1 min-h-0">
                  @if (
                    recentSuggestions().length > 0 ||
                    popularSuggestions().length > 0
                  ) {
                    <tui-data-list size="s">
                      @if (recentSuggestions().length > 0) {
                        <tui-opt-group [label]="'search.recent' | translate">
                          @for (item of recentSuggestions(); track item.href) {
                            <a
                              tuiOption
                              [routerLink]="item.href"
                              (click)="onSuggestionClick()"
                            >
                              <ng-container
                                [ngTemplateOutlet]="itemTemplate"
                                [ngTemplateOutletContext]="{ $implicit: item }"
                              ></ng-container>
                            </a>
                          }
                        </tui-opt-group>
                      }

                      @if (popularSuggestions().length > 0) {
                        <tui-opt-group [label]="'search.popular' | translate">
                          @for (item of popularSuggestions(); track item.href) {
                            <a
                              tuiOption
                              [routerLink]="item.href"
                              (click)="onSuggestionClick()"
                            >
                              <ng-container
                                [ngTemplateOutlet]="itemTemplate"
                                [ngTemplateOutletContext]="{ $implicit: item }"
                              ></ng-container>
                            </a>
                          }
                        </tui-opt-group>
                      }
                    </tui-data-list>
                  }

                  <!-- 🛒 Tienda: artículos destacados para potenciar las ventas -->
                  @if (showShopSection()) {
                    <div
                      class="flex flex-col gap-3 border-t border-(--tui-border-normal) p-3"
                    >
                      <div class="flex items-center justify-between gap-2">
                        <span
                          tuiAppearance="flat-grayscale"
                          class="flex items-center gap-1.5"
                        >
                          <tui-icon icon="@tui.store" />
                          <span tuiTitle>{{
                            'search.shop.title' | translate
                          }}</span>
                        </span>
                        <a
                          tuiLink
                          routerLink="/merchandising"
                          (click)="onSuggestionClick()"
                        >
                          {{ 'search.shop.viewAll' | translate }}
                        </a>
                      </div>

                      <div class="flex gap-3 overflow-x-auto pb-1">
                        @for (
                          featured of featuredShopItems();
                          track featured.item.id
                        ) {
                          <a
                            tuiAppearance="flat-grayscale"
                            routerLink="/merchandising"
                            (click)="onSuggestionClick()"
                            class="flex w-28 shrink-0 flex-col gap-2 rounded-2xl border border-(--tui-border-normal) p-2 no-underline"
                          >
                            <span
                              class="relative block aspect-square w-full overflow-hidden rounded-xl bg-(--tui-background-neutral-1)"
                            >
                              @if (featured.item.image_urls?.[0]; as imageUrl) {
                                <img
                                  [src]="imageUrl"
                                  [alt]="featured.item.name"
                                  loading="lazy"
                                  class="h-full w-full object-cover"
                                />
                              } @else {
                                <tui-icon
                                  icon="@tui.shirt"
                                  class="m-auto size-6 opacity-30"
                                />
                              }
                            </span>
                            <span tuiTitle>{{ featured.item.name }}</span>
                            <span
                              tuiBadge
                              appearance="primary"
                              size="s"
                              class="mt-auto self-start"
                            >
                              {{ featured.price }}
                            </span>
                          </a>
                        }
                      </div>
                    </div>
                  }
                </tui-scrollbar>
              </div>
            } @else if (results() !== null) {
              <div
                class="flex flex-col h-full bg-(--tui-background-base) rounded-xl overflow-hidden w-[calc(100vw-1rem)] md:w-auto md:min-w-200 max-h-[80vh] relative"
              >
                <div class="p-2">
                  <tui-tabs [(activeItemIndex)]="activeSearchTab">
                    @if (groupedResults().length > 1) {
                      <button tuiTab>
                        {{ 'all' | translate }}
                        <span
                          tuiBadge
                          size="s"
                          appearance="neutral"
                          class="ml-2 inline-flex items-center"
                        >
                          {{ totalResults() }}
                        </span>
                      </button>
                    }
                    @for (group of groupedResults(); track group.key) {
                      <button tuiTab>
                        {{ group.key | translate }}
                        <span
                          tuiBadge
                          size="s"
                          appearance="neutral"
                          class="ml-2 inline-flex items-center"
                        >
                          {{ group.items.length }}
                        </span>
                      </button>
                    }
                  </tui-tabs>
                </div>

                @if (
                  tourService.isActive() &&
                  tourService.step() === TourStep.SEARCH
                ) {
                  <div
                    class="mx-4 mb-2 rounded-xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal)"
                  >
                    <app-tour-hint
                      [description]="'tour.search.description' | translate"
                      (next)="onTourNext()"
                      (skip)="onTourSkip()"
                    />
                  </div>
                }

                <tui-scrollbar class="flex-1 min-h-0">
                  <tui-data-list
                    size="s"
                    [emptyContent]="
                      (results() !== null && totalResults() === 0
                        ? 'nothingFound'
                        : ''
                      ) | translate
                    "
                  >
                    @if (
                      groupedResults().length > 1 && activeSearchTab() === 0
                    ) {
                      <!-- "All" Tab -->
                      @for (group of groupedResults(); track group.key) {
                        <tui-opt-group [label]="group.key | translate">
                          @for (
                            item of group.items;
                            track item.href + item.type + item.title
                          ) {
                            @let isHighlight =
                              item | isTourHighlight: isTourSearch();
                            <a
                              tuiOption
                              [routerLink]="item.href || null"
                              (click)="onResultClick(item, $event)"
                              [class.ring-2]="isHighlight"
                              [class.ring-negative]="isHighlight"
                              class="relative"
                            >
                              @if (isHighlight) {
                                <span
                                  class="absolute bottom-2 left-2 pointer-events-none z-10 size-0"
                                >
                                  <tui-pulse />
                                </span>
                              }
                              <ng-container
                                [ngTemplateOutlet]="itemTemplate"
                                [ngTemplateOutletContext]="{
                                  $implicit: item,
                                }"
                              ></ng-container>
                            </a>
                          }
                        </tui-opt-group>
                      }
                    } @else {
                      <!-- Category specific Tab -->
                      @let tabOffset = groupedResults().length > 1 ? 1 : 0;
                      @let activeGroup =
                        groupedResults()[activeSearchTab() - tabOffset];
                      @if (activeGroup) {
                        @for (
                          item of activeGroup.items;
                          track item.href + item.type + item.title
                        ) {
                          @let isHighlight =
                            item | isTourHighlight: isTourSearch();
                          <a
                            tuiOption
                            [routerLink]="item.href || null"
                            (click)="onResultClick(item, $event)"
                            [class.ring-2]="isHighlight"
                            [class.ring-negative]="isHighlight"
                            class="relative"
                          >
                            @if (isHighlight) {
                              <span
                                class="absolute bottom-2 left-2 pointer-events-none z-10 size-0"
                              >
                                <tui-pulse />
                              </span>
                            }
                            <ng-container
                              [ngTemplateOutlet]="itemTemplate"
                              [ngTemplateOutletContext]="{
                                $implicit: item,
                              }"
                            ></ng-container>
                          </a>
                        }
                      }
                    }
                  </tui-data-list>
                </tui-scrollbar>
              </div>
            }
          </ng-template>
        </tui-textfield>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchDropdownComponent {
  readonly loading = input<boolean>(false);

  protected readonly tourService = inject(TourService);
  protected readonly TourStep = TourStep;
  protected readonly outdoorData = inject(OutdoorDataService);
  private readonly searchService = inject(SearchService);
  private readonly areasService = inject(AreasService);
  private readonly authState = inject(AuthStateService);
  private readonly cragsService = inject(CragsService);
  private readonly merchService = inject(MerchandiseService);
  private readonly routesService = inject(RoutesService);
  private readonly storage = inject(LocalStorage);
  private readonly translate = inject(TranslateService);
  private readonly visitedAreas = inject(VisitedAreasService);
  private readonly visitedCrags = inject(VisitedCragsService);
  private readonly visitedIndoorCenters = inject(VisitedIndoorCentersService);

  readonly searchValue = signal('');
  readonly searchOpen = signal(false);
  protected activeSearchTab = signal(0);

  /**
   * El catálogo de la tienda solo se pide la primera vez que se abre el
   * buscador: `shopRequested` se queda en `true` para que cerrarlo no
   * descargue los artículos ya cargados ni obligue a repetir la consulta.
   *
   * Mismo criterio que la página de la tienda: los usuarios ven solo
   * artículos `active`, los admins ven además los inactivos (su catálogo).
   */
  private readonly shopRequested = signal(false);

  private readonly shopResource = resource<
    MerchandiseItemDetail[],
    { admin: boolean } | undefined
  >({
    params: () =>
      this.shopRequested() ? { admin: this.authState.isAdmin() } : undefined,
    loader: ({ params }) =>
      this.merchService.getMerchandiseItems(!params.admin, false),
  });

  /** Re-renderiza los precios formateados al cambiar de idioma. */
  private readonly langChange = toSignal(
    this.translate.onLangChange.pipe(map(() => true)),
    { initialValue: false },
  );

  constructor() {
    const cdr = inject(ChangeDetectorRef);
    let wasTourSearch = false;
    effect(() => {
      const isTourSearch =
        this.tourService.isActive() &&
        this.tourService.step() === TourStep.SEARCH;

      if (isTourSearch) {
        wasTourSearch = true;
        setTimeout(() => {
          this.searchOpen.set(true);
          this.searchValue.set('Millena');
          cdr.markForCheck();
        }, 500);
      } else if (wasTourSearch) {
        wasTourSearch = false;
        this.searchOpen.set(false);
        this.searchValue.set('');
      }
    });

    effect(() => {
      if (this.searchOpen()) {
        this.activeSearchTab.set(0);
        this.shopRequested.set(true);
      }
    });

    effect(() => {
      if (this.groupedResults().length <= 1) {
        this.activeSearchTab.set(0);
      }
    });
  }

  protected readonly isTourSearch = computed(
    () =>
      this.tourService.isActive() &&
      this.tourService.step() === TourStep.SEARCH,
  );

  protected readonly results = toSignal(
    toObservable(this.searchValue).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((query: string) => this.searchService.search(query)),
    ),
    { initialValue: null as SearchData | null },
  );

  protected toValue(event: Event): string {
    return (event.target as HTMLInputElement)?.value ?? '';
  }

  protected readonly groupedResults = computed(() => {
    const data = this.results();
    if (!data) return [];

    const groups = Object.entries(data)
      .filter(([, items]) => items.length > 0)
      .map(([key, items]) => ({
        key,
        items: items as readonly SearchItem[],
      }));

    // Artículos de la tienda que encajan con la búsqueda.
    const shopItems = this.shopResults();
    if (shopItems.length > 0) {
      groups.push({ key: 'search.shop.title', items: shopItems });
    }

    return groups;
  });

  protected readonly totalResults = computed(() =>
    this.groupedResults().reduce(
      (acc, current) => acc + current.items.length,
      0,
    ),
  );

  // ─── Tienda ────────────────────────────────────────────────────────────────

  private readonly shopItems = computed(() => this.shopResource.value() ?? []);

  /**
   * Artículos destacados que se muestran como tarjetas dentro del panel
   * vacío del buscador, para dar visibilidad a la tienda sin teclear nada.
   */
  protected readonly featuredShopItems = computed(() => {
    this.langChange();
    return this.shopItems()
      .slice(0, 4)
      .map((item) => ({ item, price: this.formatPrice(item.price) }));
  });

  /** La sección solo aparece si la tienda tiene artículos que enseñar. */
  protected readonly showShopSection = computed(
    () => this.featuredShopItems().length > 0,
  );

  /** Artículos de la tienda que coinciden con lo que se está escribiendo. */
  protected readonly shopResults = computed<SearchItem[]>(() => {
    this.langChange();
    const query = this.searchValue().trim().toLowerCase();
    if (query.length < 2) return [];

    return this.shopItems()
      .filter((item) =>
        [item.name, item.description ?? '', item.category ?? ''].some((field) =>
          field.toLowerCase().includes(query),
        ),
      )
      .slice(0, 6)
      .map((item) => this.toSearchItem(item));
  });

  /** Artículo de la tienda como elemento del buscador. */
  private toSearchItem(item: MerchandiseItemDetail): SearchItem {
    return {
      title: item.name,
      subtitle: this.formatPrice(item.price),
      href: '/merchandising',
      icon: item.image_urls?.[0] ?? '@tui.shirt',
      type: 'shop-item',
      data: item,
    };
  }

  /**
   * Últimos buscados: sitios ya visitados (áreas, sectores y rocódromos)
   * persistidos en localStorage por los servicios `Visited*`, ordenados por
   * fecha de visita y limitados a 3.
   */
  protected readonly recentSuggestions = computed<SearchItem[]>(() => {
    const items = [
      ...this.visitedAreas.visitedAreas().map((area) => ({
        visitedAt: area.visitedAt ?? 0,
        item: {
          title: area.name,
          href: `/area/${area.slug}`,
          icon: '@tui.map-pin',
        },
      })),
      ...this.visitedCrags.visitedCrags().map((crag) => ({
        visitedAt: crag.visitedAt ?? 0,
        item: {
          title: crag.name,
          href: `/area/${crag.area_slug}/${crag.slug}`,
          icon: '@tui.mountain',
        },
      })),
      ...this.visitedIndoorCenters.visitedCenters().map((center) => ({
        visitedAt: center.visitedAt ?? 0,
        item: {
          title: center.name,
          href: `/indoor/${center.slug}`,
          icon: '@tui.dumbbell',
        },
      })),
    ];

    return items
      .sort((a, b) => b.visitedAt - a.visitedAt)
      .slice(0, 3)
      .map(({ item }) => item);
  });

  /**
   * Populares: sitios más activos del home (los de los últimos ascensos),
   * cacheados en localStorage por la home. La caché se relee al abrir el
   * dropdown para no quedarse con el valor vacío de antes de cargar la home.
   * Mezcla área + sector + rocódromo y evita repetir los "recientes".
   */
  protected readonly popularSuggestions = computed<SearchItem[]>(() => {
    if (!this.searchOpen()) return [];

    const recent = new Set(this.recentSuggestions().map(({ href }) => href));
    const groups: SearchItem[][] = [
      this.readCache<ActiveArea>(CACHE_KEYS.activeAreas).map((area) => ({
        title: area.name,
        href: `/area/${area.slug}`,
        icon: '@tui.map-pin',
      })),
      this.readCache<ActiveCrag>(CACHE_KEYS.activeCrags).map((crag) => ({
        title: crag.name,
        href: `/area/${crag.area_slug}/${crag.slug}`,
        icon: '@tui.mountain',
      })),
      this.readCache<ActiveIndoorCenter>(CACHE_KEYS.activeIndoorCenters).map(
        (center) => ({
          title: center.name,
          href: `/indoor/${center.slug}`,
          icon: '@tui.dumbbell',
        }),
      ),
    ];

    const seen = new Set<string>(recent);
    const result: SearchItem[] = [];

    for (
      let index = 0;
      result.length < 3 && groups.some((group) => index < group.length);
      index++
    ) {
      for (const group of groups) {
        const item = group[index];
        if (item && !seen.has(item.href) && result.length < 3) {
          seen.add(item.href);
          result.push(item);
        }
      }
    }

    return result;
  });

  protected readonly hasSuggestions = computed(
    () =>
      this.recentSuggestions().length > 0 ||
      this.popularSuggestions().length > 0 ||
      this.showShopSection(),
  );

  protected onSuggestionClick(): void {
    this.searchOpen.set(false);
    this.searchValue.set('');
  }

  private readCache<T>(key: string): T[] {
    const raw = this.storage.getItem(key);
    if (!raw) return [];

    try {
      return JSON.parse(raw) as T[];
    } catch {
      return [];
    }
  }

  /** Precio en euros con el formato del idioma activo ("12,00 €"). */
  private formatPrice(value: number): string {
    return new Intl.NumberFormat(this.translate.currentLang || 'es', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  }

  protected onTourNext(): void {
    this.searchOpen.set(false);
    this.searchValue.set('');
    void this.tourService.next();
  }

  protected onTourSkip(): void {
    this.searchOpen.set(false);
    this.searchValue.set('');
    void this.tourService.finish();
  }

  protected onResultClick(item: SearchItem, event?: Event): void {
    if (item.type?.startsWith('create-') || item.type?.startsWith('import-')) {
      event?.preventDefault();
      event?.stopPropagation();

      const query = (this.searchValue() || '').trim();

      switch (item.type) {
        case 'create-area':
          this.areasService.openAreaForm({ areaData: { name: query } });
          break;
        case 'create-crag':
          this.cragsService.openCragForm({
            areaId: this.outdoorData.selectedArea()?.id,
            cragData: { name: query },
          });
          break;
        case 'create-route':
          this.routesService.openRouteForm({
            cragId: this.outdoorData.selectedCrag()?.id,
            routeData: { name: query },
          });
          break;
        case 'import-area': {
          const anuArea = item.data as SearchAreaItem;
          this.areasService.openAreaForm({
            areaData: {
              name: anuArea.areaName,
              slug: anuArea.areaSlug,
              eight_anu_crag_slugs: [anuArea.areaSlug],
            },
          });
          break;
        }
        case 'import-crag': {
          const anuCrag = item.data as SearchCragItem;
          this.cragsService.openCragForm({
            areaId: this.outdoorData.selectedArea()?.id,
            cragData: {
              name: anuCrag.cragName,
              slug: anuCrag.cragSlug,
              eight_anu_sector_slugs: [anuCrag.cragSlug],
            },
          });
          break;
        }
        case 'import-route': {
          const anuRoute = item.data as SearchRouteItem;
          this.routesService.openRouteForm({
            cragId: this.outdoorData.selectedCrag()?.id,
            routeData: {
              name: anuRoute.zlaggableName,
              slug: anuRoute.zlaggableSlug,
              grade: gradeToNumber(anuRoute.difficulty),
              eight_anu_route_slugs: [anuRoute.zlaggableSlug],
            },
          });
          break;
        }
      }
    }

    const isTourSearch =
      this.tourService.isActive() &&
      this.tourService.step() === TourStep.SEARCH;

    this.searchOpen.set(false);
    this.searchValue.set('');

    if (isTourSearch) {
      void this.tourService.next();
    }
  }
}
