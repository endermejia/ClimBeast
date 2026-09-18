import { LowerCasePipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import {
  TuiDataList,
  TuiDialogService,
  TuiDropdown,
  TuiIcon,
  TuiLoader,
  TuiNotification,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TUI_CONFIRM, TuiSegmented, type TuiConfirmData } from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { AuthStateService } from '../../services/auth-state.service';
import { CragRoutesDataService } from '../../services/crag-routes-data.service';
import { CragsService } from '../../services/crags.service';
import { LanguageService } from '../../services/language.service';
import { LayoutService } from '../../services/layout.service';
import { MapDataService } from '../../services/map-data.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { ParkingsService } from '../../services/parkings.service';
import { RoutesService } from '../../services/routes.service';
import { SeoService } from '../../services/seo.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { ToposService } from '../../services/topos.service';
import { VisitedCragsService } from '../../services/visited-crags.service';

import { AscentsFeedComponent } from '../../components/ascent/ascents-feed';
import { ChartRoutesByGradeComponent } from '../../components/charts/chart-routes-by-grade';

import { CragRoutesComponent } from '../../components/crag/crag-routes';
import { CragToposComponent } from '../../components/crag/crag-topos';
import { MeteoButtonComponent } from '../../components/ui/meteo-button';
import { ParkingButtonComponent } from '../../components/ui/parking-button';
import {
  SectionHeaderAction,
  SectionHeaderComponent,
} from '../../components/ui/section-header';
import { UbicacionDropdownComponent } from '../../components/ui/ubicacion-dropdown';

import {
  AmountByEveryGrade,
  ClimbingKinds,
  type CragDetail,
  type FeedItem,
  type UserProfileBasicDto,
  VERTICAL_LIFE_GRADES,
} from '../../models';

import { handleErrorToast, slugify } from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-crag',
  imports: [
    AscentsFeedComponent,
    ChartRoutesByGradeComponent,
    CragRoutesComponent,
    CragToposComponent,
    LowerCasePipe,
    MeteoButtonComponent,
    ParkingButtonComponent,
    SectionHeaderComponent,
    TranslatePipe,
    TuiDataList,
    TuiDropdown,
    TuiIcon,
    TuiLoader,
    TuiNotification,
    TuiScrollbar,
    TuiSegmented,
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
        @if (cragDetail(); as c) {
          <!-- Left Column: Info + Segmented Tabs -->
          <div
            class="flex flex-col gap-4 w-full px-4 lg:px-0 lg:flex-1 min-w-0 lg:h-full lg:overflow-hidden"
          >
            <ng-template #cragSwitcher>
              <tui-data-list>
                @for (cragItem of sortedCrags(); track cragItem.id) {
                  <button
                    tuiOption
                    (click)="
                      router.navigate(['/area', areaSlug(), cragItem.slug])
                    "
                  >
                    {{ cragItem.name }}
                  </button>
                }
              </tui-data-list>
            </ng-template>

            <div class="mb-2">
              <app-section-header
                [title]="c.name"
                [liked]="c.liked"
                [titleDropdown]="cragSwitcher"
                [itemCount]="sortedCrags().length"
                [actions]="headerActions()"
                (toggleLike)="onToggleLike()"
              />
            </div>

            <div class="flex flex-col md:flex-row md:justify-between gap-4">
              <div class="flex flex-col gap-3 grow">
                @let lang = languageService.selectedLanguage();
                @let desc = lang === 'es' ? c.description_es : c.description_en;
                @let warn = lang === 'es' ? c.warning_es : c.warning_en;

                @if (desc) {
                  <p class="text-lg">{{ desc }}</p>
                }

                <div class="flex flex-wrap items-center gap-3 justify-between">
                  <div class="flex gap-2 items-center">
                    @if (c.latitude && c.longitude) {
                      <app-ubicacion-dropdown
                        [latitude]="c.latitude"
                        [longitude]="c.longitude"
                        (viewOnMap)="viewOnMap(c.latitude, c.longitude)"
                      />
                      <app-meteo-button
                        [latitude]="c.latitude"
                        [longitude]="c.longitude"
                      />
                    }
                    @if (c.parkings.length) {
                      <app-parking-button [crag]="c" />
                    }
                    @if (c.approach) {
                      <div class="flex w-fit items-center gap-1 opacity-70">
                        <tui-icon icon="@tui.footprints" />
                        <span class="text-lg font-medium whitespace-nowrap">
                          {{ c.approach }}
                          min.
                        </span>
                      </div>
                    }
                  </div>
                </div>

                @if (warn) {
                  <div tuiNotification appearance="warning">
                    {{ warn }}
                  </div>
                }

                <div
                  class="flex flex-row flex-wrap justify-between items-center gap-2"
                >
                  @defer (on viewport; hydrate on viewport) {
                    <app-chart-routes-by-grade
                      class="md:hidden! self-end"
                      [grades]="c.grades"
                    />
                  } @placeholder {
                    <div
                      class="h-20 md:hidden! flex items-center justify-center"
                    >
                      <tui-loader size="s" />
                    </div>
                  }
                </div>
              </div>
              @defer (on viewport; hydrate on viewport) {
                <app-chart-routes-by-grade
                  class="hidden md:block self-end"
                  [grades]="c.grades"
                />
              } @placeholder {
                <div class="hidden md:flex h-20 items-center justify-center">
                  <tui-loader size="s" />
                </div>
              }
            </div>

            @if (mobileTabs().length > 1) {
              <tui-segmented
                [activeItemIndex]="activeTabIndex()"
                (activeItemIndexChange)="activeTabIndex.set($event)"
              >
                @for (tabIdx of mobileTabs(); track tabIdx) {
                  <button type="button">
                    @if (tabIdx === 0) {
                      {{ routesCount() }}
                      {{ 'routes' | translate | lowercase }}
                    } @else if (tabIdx === 1) {
                      {{ toposCount() }}
                      {{ 'topos' | translate | lowercase }}
                    } @else {
                      {{ 'ascents' | translate | lowercase }}
                    }
                  </button>
                }
              </tui-segmented>
            }

            <div class="mt-2 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
              @let currentTab = mobileTabs()[activeTabIndex()];
              @if (loadedTabs().has(0)) {
                <div
                  [hidden]="currentTab !== 0"
                  [class.hidden]="currentTab !== 0"
                >
                  <app-crag-routes [crag]="c" />
                </div>
              }
              @if (loadedTabs().has(1)) {
                <div
                  [hidden]="currentTab !== 1"
                  [class.hidden]="currentTab !== 1"
                >
                  @defer (on viewport; hydrate on viewport) {
                    <app-crag-topos
                      [crag]="c"
                      [areaSlug]="areaSlug()"
                      [cragSlug]="cragSlug()"
                    />
                  } @placeholder {
                    <div
                      class="flex items-center justify-center py-16 min-h-32"
                    >
                      <tui-loader size="l" />
                    </div>
                  }
                </div>
              }
              @if (loadedTabs().has(2)) {
                <div
                  [hidden]="currentTab !== 2"
                  [class.hidden]="currentTab !== 2"
                >
                  <app-ascents-feed
                    [ascents]="accumulatedAscents()"
                    [isLoading]="ascentsLoading()"
                    [hasMore]="hasMoreAscents()"
                    [showRoute]="true"
                    (loadMore)="loadMoreAscents()"
                  />
                </div>
              }
            </div>
          </div>

          <!-- Right Column: Ascents Sidebar (desktop only) -->
          <div
            class="hidden lg:flex lg:w-[420px] xl:w-[460px] 2xl:w-[500px] shrink-0 min-w-0 lg:h-full flex-col"
          >
            <div class="flex flex-col w-full lg:h-full min-w-0 lg:min-h-0">
              <tui-scrollbar class="w-full lg:flex-1 lg:min-h-0">
                <div class="w-full min-w-0 px-4 lg:px-0 pb-6">
                  <app-ascents-feed
                    [ascents]="accumulatedAscents()"
                    [isLoading]="ascentsLoading()"
                    [hasMore]="hasMoreAscents()"
                    [showRoute]="true"
                    (loadMore)="loadMoreAscents()"
                  />
                </div>
              </tui-scrollbar>
            </div>
          </div>
        } @else {
          <div class="flex items-center justify-center w-full min-h-[50vh]">
            <tui-loader size="xxl" />
          </div>
        }
      </section>
    </tui-scrollbar>
  `,
  host: { class: 'flex flex-col w-full h-full min-h-0' },
})
export class CragComponent {
  protected readonly authState = inject(AuthStateService);
  protected readonly outdoorData = inject(OutdoorDataService);
  protected readonly languageService = inject(LanguageService);
  protected readonly cragRoutesData = inject(CragRoutesDataService);
  protected readonly layoutService = inject(LayoutService);
  protected readonly mapData = inject(MapDataService);
  protected readonly parkingsService = inject(ParkingsService);
  private readonly routesService = inject(RoutesService);
  private readonly toposService = inject(ToposService);
  protected readonly activeTabIndex = signal(0);
  protected readonly loadedTabs = signal<Set<number>>(new Set([0]));
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);
  protected readonly cragsService = inject(CragsService);
  protected readonly isBrowser = inject(IS_BROWSER);
  protected readonly toast = inject(ToastService);
  protected readonly translate = inject(TranslateService);
  protected readonly dialogs = inject(TuiDialogService);
  private readonly visitedCragsService = inject(VisitedCragsService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);

  protected readonly queryParams = toSignal(this.route.queryParams);

  private readonly ascentsPage = signal(0);
  protected readonly accumulatedAscents = signal<FeedItem[]>([]);

  protected readonly ascentsResource = resource({
    params: () => {
      const crag = this.outdoorData.cragDetail();
      if (!crag) return null;
      return { cragId: crag.id, page: this.ascentsPage() };
    },
    loader: async ({ params }) => {
      if (!params || !this.isBrowser) return [];
      await this.supabase.whenReady();
      const from = params.page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await this.supabase.client
        .from('route_ascents')
        .select(
          `
          *,
          route:routes!inner(
            *,
            crag:crags!inner(id, slug, name)
          )
        `,
        )
        .eq('route.crag.id', params.cragId)
        .order('date', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('[CragComponent] Error fetching ascents:', error);
        return [];
      }
      if (!data || data.length === 0) return [];

      const userIds = [...new Set(data.map((a) => a.user_id).filter(Boolean))];
      let profileMap = new Map<string, UserProfileBasicDto>();
      if (userIds.length > 0) {
        const { data: profiles } = await this.supabase.client
          .from('user_profiles')
          .select('id, name, avatar')
          .in('id', userIds);
        if (profiles) {
          profileMap = new Map(profiles.map((p) => [p.id, p]));
        }
      }

      return data.map((a) => {
        const { route, user_id, ...ascentRest } = a;
        const cragData = route?.crag;
        const mappedRoute = route
          ? { ...route, crag_slug: cragData?.slug, crag_name: cragData?.name }
          : undefined;
        return {
          ...ascentRest,
          user_id,
          kind: 'ascent' as const,
          user: profileMap.get(user_id) ?? undefined,
          route: mappedRoute,
        } as FeedItem;
      });
    },
  });

  protected readonly ascentsLoading = computed(
    () => this.ascentsResource.isLoading() && this.ascentsPage() === 0,
  );

  protected readonly hasMoreAscents = computed(() => {
    if (this.ascentsResource.isLoading()) return false;
    const items = this.ascentsResource.value();
    if (!items) return false;
    return items.length === PAGE_SIZE;
  });

  readonly showToposTab = computed(() => {
    const c = this.cragDetail();
    if (!c) return false;

    const canEditAsAdmin = this.authState.canEditAsAdmin();
    const canEditAsAllowedEquipper =
      this.authState.areaAdminPermissions()[c.area_id];

    const isSecret = !c.is_public && (c.price === null || c.price === 0);
    const hasAccess =
      c.is_public || c.purchased || canEditAsAdmin || canEditAsAllowedEquipper;

    if (isSecret && !hasAccess) {
      return false;
    }

    return (
      (c.topos?.length ?? 0) > 0 || canEditAsAdmin || canEditAsAllowedEquipper
    );
  });

  readonly visibleTabs = computed(() => {
    const tabs: number[] = [];
    if ((this.routesCount() ?? 0) > 0) tabs.push(0);
    if (this.showToposTab()) tabs.push(1);
    return tabs;
  });

  protected readonly mobileTabs = computed(() => {
    const tabs = [...this.visibleTabs()];
    tabs.push(2);
    return tabs;
  });

  protected readonly headerActions = computed<SectionHeaderAction[]>(() => {
    const c = this.cragDetail();
    if (!c) return [];

    const actions: SectionHeaderAction[] = [];
    const isAdmin = this.authState.isAdmin();
    const canAreaAdmin = this.authState.isAreaAdminOf(c.area_id);
    const canEdit = this.authState.checkCragEditPermissionDirect(c);

    if (canEdit) {
      actions.push({
        label: 'edit',
        icon: '@tui.square-pen',
        appearance: 'neutral',
        action: () => this.openEditCrag(),
      });
    }

    if (canAreaAdmin) {
      actions.push({
        label: 'routes.newTitle',
        icon: '@tui.plus',
        appearance: 'neutral',
        action: () => this.openCreateRoute(),
      });
      actions.push({
        label: 'routes.unifyTitle',
        icon: '@tui.blend',
        appearance: 'neutral',
        action: () => this.routesService.openUnifyRoutes(),
      });
      actions.push({
        label: 'topos.newTitle',
        icon: '@tui.plus',
        appearance: 'neutral',
        action: () => this.openCreateTopo(),
      });
      actions.push({
        label: 'admin.parkings.new',
        icon: '@tui.square-parking',
        appearance: 'neutral',
        action: () => this.openCreateParking(),
      });
      actions.push({
        label: 'admin.parkings.link',
        icon: '@tui.link',
        appearance: 'neutral',
        action: () => this.openLinkParking(),
      });
    }

    if (canEdit && (isAdmin || canAreaAdmin)) {
      actions.push({
        label: 'delete',
        icon: '@tui.trash',
        appearance: 'negative',
        action: () => this.deleteCrag(),
      });
    }

    return actions;
  });

  areaSlug: InputSignal<string> = input.required<string>();
  cragSlug: InputSignal<string> = input.required<string>();

  readonly loading = this.cragsService.loading;
  protected readonly sortedCrags = computed(() => {
    const list = this.outdoorData.cragsList() || [];
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  });

  protected readonly cragDetail = computed<CragDetail | null>(() => {
    const c = this.outdoorData.cragDetail();
    if (!c) return null;

    const routes = this.cragRoutesData.cragRoutes() ?? [];
    const gradesVal: AmountByEveryGrade = {};
    for (const r of routes) {
      if (r.grade >= 0) {
        const g = r.grade as VERTICAL_LIFE_GRADES;
        gradesVal[g] = (gradesVal[g] ?? 0) + 1;
      }
    }

    return {
      ...c,
      grades: gradesVal,
    };
  });

  protected readonly routesCount = computed(() => {
    const detail = this.cragDetail();
    const routes = this.cragRoutesData.cragRoutes();
    return routes
      ? routes.length
      : Object.values(detail?.grades || {}).reduce(
          (a, b) => (a ?? 0) + (b ?? 0),
          0,
        );
  });

  protected readonly toposCount = computed(() => {
    return this.cragDetail()?.topos?.length ?? 0;
  });

  constructor() {
    effect(() => {
      const aSlug = this.areaSlug();
      const cSlug = this.cragSlug();
      this.outdoorData.selectCrag(aSlug, cSlug);
      untracked(() => {
        this.ascentsPage.set(0);
        this.accumulatedAscents.set([]);
        const currentTab = this.mobileTabs()[this.activeTabIndex()] ?? 0;
        this.loadedTabs.set(new Set([currentTab]));
      });
    });

    effect(() => {
      const newItems = this.ascentsResource.value();
      if (!newItems) return;
      untracked(() => {
        if (this.ascentsPage() === 0) {
          this.accumulatedAscents.set(newItems);
        } else {
          this.accumulatedAscents.update((prev) => [...prev, ...newItems]);
        }
      });
    });

    effect(() => {
      const currentTab = this.mobileTabs()[this.activeTabIndex()];
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
      if (!this.isBrowser) return;
      const areaLoading = this.outdoorData.areasListResource.isLoading();
      const cragLoading = this.outdoorData.cragDetailResource.isLoading();
      if (areaLoading || cragLoading) return;
      const area = this.outdoorData.selectedArea();
      const crag = this.outdoorData.cragDetail();
      if (!area || !crag) {
        this.router.navigateByUrl('/page-not-found');
      }
    });

    effect(() => {
      const crag = this.cragDetail();
      const area = this.outdoorData.selectedArea();
      const aSlug = this.areaSlug();
      const cSlug = this.cragSlug();
      if (!crag || !area) return;
      const routesCount = this.routesCount();
      const lang = this.languageService.selectedLanguage();
      const desc = lang === 'es' ? crag.description_es : crag.description_en;
      const appDescription = this.translate.instant('seo.description');
      const description = desc
        ? `${desc} – ${routesCount} ${this.translate.instant('routes').toLowerCase()}.`
        : `${crag.name} – ${area.name}. ${routesCount} ${this.translate.instant('routes').toLowerCase()}. ${appDescription}`;
      this.seo.setPage({
        title: `${crag.name} – ${area.name}`,
        description,
        canonicalUrl: `https://climbeast.com/area/${aSlug}/${cSlug}`,
      });
    });

    effect(() => {
      const tabs = this.mobileTabs();
      if (this.activeTabIndex() >= tabs.length && tabs.length > 0) {
        this.activeTabIndex.set(0);
      }
    });

    effect(() => {
      const params = this.queryParams();
      const tabs = this.visibleTabs();
      if (!params || !tabs.length) return;

      const tab = params['tab'];
      if (tab === 'topos' && tabs.includes(1)) {
        this.activeTabIndex.set(this.mobileTabs().indexOf(1));
      } else if (tab === 'routes' && tabs.includes(0)) {
        this.activeTabIndex.set(this.mobileTabs().indexOf(0));
      }
    });

    effect(() => {
      const crag = this.cragDetail();
      const area = this.outdoorData.selectedArea();
      if (crag && area) {
        this.visitedCragsService.addVisitedCrag({
          id: crag.id,
          name: crag.name,
          slug: crag.slug,
          area_slug: area.slug,
        });
      }
    });
  }

  loadMoreAscents(): void {
    if (this.ascentsResource.isLoading()) return;
    if (!this.hasMoreAscents()) return;
    this.ascentsPage.update((p) => p + 1);
  }

  async viewOnMap(lat: number, lng: number): Promise<void> {
    const area = this.outdoorData.selectedArea();
    let minLat = lat;
    let maxLat = lat;
    let minLng = lng;
    let maxLng = lng;

    if (area) {
      await this.supabase.whenReady();
      const { data } = await this.supabase.client
        .from('crags')
        .select('latitude, longitude')
        .eq('area_id', area.id)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (data) {
        data.forEach((c) => {
          if (c.latitude! < minLat) minLat = c.latitude!;
          if (c.latitude! > maxLat) maxLat = c.latitude!;
          if (c.longitude! < minLng) minLng = c.longitude!;
          if (c.longitude! > maxLng) maxLng = c.longitude!;
        });
      }
    }

    this.mapData.mapBounds.set({
      south_west_latitude: minLat,
      south_west_longitude: minLng,
      north_east_latitude: maxLat,
      north_east_longitude: maxLng,
    });
    void this.router.navigateByUrl('/explore');
  }

  onToggleLike(): void {
    if (!this.isBrowser) return;
    const c = this.cragDetail();
    if (!c) return;
    this.cragsService.toggleCragLike(c.id);
  }

  async deleteCrag(): Promise<void> {
    const c = this.cragDetail();
    if (!c) return;
    if (!this.isBrowser) return;

    const t = await firstValueFrom(
      this.translate.get(['crags.deleteTitle', 'crags.deleteConfirm'], {
        name: c.name,
      }),
    );
    const title = t['crags.deleteTitle'];
    const message = t['crags.deleteConfirm'];
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
      const ok = await this.cragsService.delete(c.id);
      if (ok) {
        await this.router.navigateByUrl(`/area/${c.area_slug}`);
      }
    } catch (error) {
      handleErrorToast(error, this.toast);
    }
  }

  openEditCrag(): void {
    const c = this.cragDetail();
    if (!c) return;
    this.cragsService.openCragForm({
      cragData: {
        id: c.id,
        area_id: c.area_id!,
        name: c.name,
        slug: c.slug,
        latitude: c.latitude,
        longitude: c.longitude,
        approach: c.approach,
        description_es: c.description_es,
        description_en: c.description_en,
        warning_es: c.warning_es,
        warning_en: c.warning_en,
      },
    });
  }

  openCreateParking(): void {
    const c = this.cragDetail();
    if (!c) return;
    this.parkingsService.openParkingForm({
      cragId: c.id,
      defaultLocation:
        c.latitude && c.longitude
          ? { lat: c.latitude, lng: c.longitude }
          : undefined,
    });
  }

  openLinkParking(): void {
    const c = this.cragDetail();
    if (!c) return;
    const existingParkingIds = (c.parkings ?? []).map((p) => p.id);
    this.parkingsService.openLinkParkingForm({
      cragId: c.id,
      existingParkingIds,
    });
  }

  openCreateRoute(prefillName?: string): void {
    const c = this.cragDetail();
    if (!c) return;
    this.routesService.openRouteForm({
      cragId: c.id,
      routeData: prefillName
        ? {
            id: 0,
            crag_id: c.id,
            name: prefillName,
            slug: slugify(prefillName),
            grade: 0,
            climbing_kind: ClimbingKinds.SPORT,
          }
        : undefined,
    });
  }

  openCreateTopo(): void {
    const c = this.cragDetail();
    if (!c) return;
    this.toposService.openTopoForm({ cragId: c.id });
  }
}
