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
  WritableSignal,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { Router, RouterLink } from '@angular/router';

import {
  TuiAppearance,
  TuiButton,
  TuiDialogService,
  TuiDropdown,
  TuiHint,
  TuiIcon,
  TuiInput,
  TuiLabel,
  TuiLoader,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  TUI_CONFIRM,
  TuiAvatar,
  TuiBadgedContent,
  TuiBadgeNotification,
  TuiChevron,
  TuiComboBox,
  type TuiConfirmData,
  TuiDataListWrapper,
  TuiSegmented,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AreaDonationsService } from '../../services/area-donations.service';
import { AreasService } from '../../services/areas.service';
import { AuthStateService } from '../../services/auth-state.service';
import { CacheService } from '../../services/cache.service';
import { CragsService } from '../../services/crags.service';
import { FilterStateService } from '../../services/filter-state.service';
import { FiltersService } from '../../services/filters.service';
import { LayoutService } from '../../services/layout.service';
import { MapDataService } from '../../services/map-data.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { SeoService } from '../../services/seo.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { UserProfilesService } from '../../services/user-profiles.service';

import { AreaRevenuePanelComponent } from '../../components/area/area-revenue-panel';
import { AscentsFeedComponent } from '../../components/ascent/ascents-feed';
import { ChartRoutesByGradeComponent } from '../../components/charts/chart-routes-by-grade';
import { CragCardComponent } from '../../components/crag/crag-card';
import { OutdoorRoutesTableComponent } from '../../components/route/outdoor-routes-table';
import { EmptyStateComponent } from '../../components/ui/empty-state';
import { MeteoButtonComponent } from '../../components/ui/meteo-button';
import {
  SectionHeaderAction,
  SectionHeaderComponent,
} from '../../components/ui/section-header';
import { UbicacionDropdownComponent } from '../../components/ui/ubicacion-dropdown';
import { UserInfoHintComponent } from '../../components/ui/user-info-hint';

import {
  AreaDetail,
  ClimbingKinds,
  type FeedItem,
  isGradeRangeOverlap,
  normalizeRoutesByGrade,
  ORDERED_GRADE_VALUES,
  type RouteItem,
  type UserProfileBasicDto,
} from '../../models';

import { CACHE_KEYS } from '../../constants';
import { AvatarUrlPipe } from '../../pipes';
import { handleErrorToast, matchesQuery } from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-area',
  imports: [
    AscentsFeedComponent,
    AreaRevenuePanelComponent,
    AvatarUrlPipe,
    ChartRoutesByGradeComponent,
    CragCardComponent,
    EmptyStateComponent,
    FormsModule,
    LowerCasePipe,
    OutdoorRoutesTableComponent,
    ReactiveFormsModule,
    RouterLink,
    SectionHeaderComponent,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiButton,
    TuiChevron,
    TuiComboBox,
    TuiDataListWrapper,
    TuiDropdown,
    TuiHint,
    TuiIcon,
    TuiInput,
    TuiLabel,
    TuiLoader,
    TuiScrollbar,
    TuiSegmented,
    TuiTextfield,
    UbicacionDropdownComponent,
    MeteoButtonComponent,
    UserInfoHintComponent,
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
        <!-- Left Column -->
        <div
          class="flex flex-col w-full px-4 lg:px-0 lg:flex-1 min-w-0 lg:h-full lg:overflow-hidden"
        >
          @let canEditAsAdmin = authState.canEditAsAdmin();
          @if (outdoorData.selectedArea(); as area) {
            @let canAreaAdmin = authState.areaAdminPermissions()[area.id];
            <div class="mb-4">
              <app-section-header
                class="w-full"
                [title]="area.name"
                [liked]="area.liked"
                [actions]="headerActions()"
                (toggleLike)="onToggleLike()"
              >
                @if (!isPublic()) {
                  <tui-icon icon="@tui.lock" />
                }
              </app-section-header>
            </div>

            <div class="mb-4 flex flex-wrap justify-between items-center gap-2">
              <div class="flex gap-2">
                @if (areaCenter(); as center) {
                  <app-ubicacion-dropdown
                    [latitude]="center.latitude"
                    [longitude]="center.longitude"
                    (viewOnMap)="viewOnMap()"
                  />
                  <app-meteo-button
                    [latitude]="center.latitude"
                    [longitude]="center.longitude"
                  />
                } @else {
                  <app-ubicacion-dropdown (viewOnMap)="viewOnMap()" />
                }

                @if (hasTopos()) {
                  @let details = areaDetail();
                  @let hasAccess =
                    canEditAsAdmin ||
                    canAreaAdmin ||
                    details?.is_public ||
                    details?.purchased;

                  @if (hasAccess) {
                    <button
                      tuiButton
                      appearance="flat"
                      size="m"
                      type="button"
                      (click.zoneless)="viewFirstTopo()"
                      [iconStart]="'/image/topo.svg'"
                    >
                      {{ 'topos' | translate }}
                    </button>
                  } @else if (!areaDetailResource.isLoading()) {
                    @let isSecret =
                      details &&
                      !details.is_public &&
                      (details.price === null || details.price === 0);
                    @if (!isSecret) {
                      <div class="flex flex-col gap-2">
                        <button
                          tuiButton
                          appearance="accent"
                          size="m"
                          type="button"
                          (click.zoneless)="buyTopo()"
                          [iconStart]="'@tui.hand-heart'"
                        >
                          {{ 'payments.getTopos' | translate }}
                        </button>
                      </div>
                    } @else {
                      <div
                        class="flex items-center gap-1.5 opacity-60 text-xs py-2"
                      >
                        <tui-icon icon="@tui.lock" />
                        <span>{{ 'topos.secretText' | translate }}</span>
                      </div>
                    }
                  }
                }
              </div>
              @defer (on viewport; hydrate on viewport) {
                <app-chart-routes-by-grade [grades]="area.grades" />
              } @placeholder {
                <div class="h-20 flex items-center justify-center">
                  <tui-loader size="s" />
                </div>
              } @error {
                <div class="p-4 text-center text-xs opacity-60">
                  {{ 'errors.unexpected' | translate }}
                </div>
              }
            </div>

            <app-area-revenue-panel
              [areaId]="area.id"
              [areaName]="area.name"
              [isPaywalled]="!isPublic()"
              [areaPrice]="areaDetail()?.price || 0"
              [isPurchased]="!!areaDetail()?.purchased"
              [toposCount]="area.topos_count || 0"
              class="mb-6 block"
            />

            @let admins = areaAdmins();
            @if (admins.length > 0 || canEditAsAdmin) {
              <div class="flex flex-col gap-3 mb-6">
                <span
                  class="text-xs uppercase opacity-60 font-semibold tracking-wider"
                >
                  {{ 'admins' | translate }}
                </span>
                <div class="flex flex-wrap gap-4 items-center">
                  @for (admin of admins; track admin.user_id) {
                    <div
                      class="flex items-center gap-2 bg-(--tui-background-neutral-1) py-1 pr-3 rounded-full border border-(--tui-border-normal) group transition-all hover:bg-(--tui-background-neutral-1-hover) no-underline text-inherit"
                      [class.pl-1]="admin.user.avatar"
                      [class.pl-3]="!admin.user.avatar"
                    >
                      <a
                        [routerLink]="['/profile', admin.user_id]"
                        [tuiHint]="adminUserHint"
                        (contextmenu.zoneless)="$event.preventDefault()"
                        class="flex items-center gap-2 no-underline text-inherit cursor-pointer select-none"
                      >
                        @if (admin.user.avatar) {
                          <span tuiAvatar size="s">
                            <img
                              [src]="admin.user.avatar | avatarUrl"
                              [alt]="admin.user.name"
                            />
                          </span>
                        }
                        <span class="text-sm font-medium">{{
                          admin.user.name
                        }}</span>
                      </a>
                      <ng-template #adminUserHint>
                        <app-user-info-hint
                          [userId]="admin.user_id"
                          [fallbackName]="admin.user.name"
                          [fallbackAvatar]="admin.user.avatar"
                        />
                      </ng-template>
                      @if (canEditAsAdmin) {
                        <button
                          tuiIconButton
                          appearance="flat"
                          size="xs"
                          type="button"
                          iconStart="@tui.x"
                          [attr.aria-label]="'delete' | translate"
                          class="opacity-0 group-hover:opacity-50 hover:opacity-100! transition-opacity -mr-1"
                          (click.zoneless)="removeAdmin(admin.user_id)"
                        ></button>
                      }
                    </div>
                  }

                  @if (canEditAsAdmin) {
                    <div class="w-64">
                      <tui-textfield
                        appearance="floating"
                        size="s"
                        tuiChevron
                        [tuiTextfieldCleaner]="true"
                        [stringify]="stringifyUser"
                        class="rounded-full!"
                      >
                        <label tuiLabel for="admin-search-input">{{
                          'addUser' | translate
                        }}</label>
                        <input
                          id="admin-search-input"
                          tuiComboBox
                          [matcher]="null"
                          [placeholder]="'searchPlaceholder' | translate"
                          (ngModelChange)="
                            onAdminSelected($event, adminSearchInput)
                          "
                          [ngModel]="selectedAdminUser()"
                          (input.zoneless)="
                            userSearchQuery.set(adminSearchInput.value)
                          "
                          #adminSearchInput
                        />
                        <tui-data-list-wrapper
                          *tuiDropdown
                          [items]="foundUsers()"
                        />
                      </tui-textfield>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Segmented: Crags / Routes -->
            <tui-segmented
              [activeItemIndex]="contentTabIndex()"
              (activeItemIndexChange)="contentTabIndex.set($event)"
              class="mb-4"
            >
              <button type="button">
                {{ cragsCount() }}
                {{
                  (cragsCount() === 1 ? 'crag' : 'crags')
                    | translate
                    | lowercase
                }}
              </button>
              <button type="button">
                {{ allRoutes().length }}
                {{ 'routes' | translate | lowercase }}
              </button>
            </tui-segmented>

            @if (contentTabIndex() === 0) {
              <!-- Search + Filters for Crags -->
              <div
                class="sticky top-0 z-10 py-4 flex items-end gap-2 bg-(--tui-background-base)"
              >
                <tui-textfield
                  appearance="floating"
                  class="grow block"
                  tuiTextfieldSize="l"
                >
                  <label tuiLabel for="crags-search">{{
                    'searchPlaceholder' | translate
                  }}</label>
                  <input
                    tuiInput
                    #cragsSearch
                    id="crags-search"
                    autocomplete="off"
                    [value]="query()"
                    (input.zoneless)="onQuery(cragsSearch.value)"
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

              <div class="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                @for (crag of crags(); track crag.slug) {
                  <app-crag-card
                    [crag]="{ ...crag, area_slug: areaSlug() }"
                    [showAreaName]="false"
                  />
                } @empty {
                  <app-empty-state
                    class="col-span-full"
                    icon="@tui.layout-grid"
                  />
                }
              </div>
            } @else {
              <!-- Routes Table -->
              @if (allRoutes().length > 0) {
                <app-outdoor-routes-table
                  [data]="allRoutes()"
                  [showLocation]="true"
                  [showRowColors]="true"
                  [hiddenColumns]="['topo', 'equippers']"
                />
              } @else {
                <app-empty-state class="mt-8" icon="@tui.route" />
              }
            }
          } @else {
            <div class="flex items-center justify-center py-16">
              <tui-loader size="xxl" />
            </div>
          }
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
      </section>
    </tui-scrollbar>
  `,
  host: { class: 'flex flex-col w-full h-full min-h-0' },
})
export class AreaComponent {
  protected readonly authState = inject(AuthStateService);
  protected readonly outdoorData = inject(OutdoorDataService);
  protected readonly filterState = inject(FilterStateService);
  protected readonly layoutService = inject(LayoutService);
  protected readonly mapData = inject(MapDataService);
  protected readonly router = inject(Router);
  protected readonly toast = inject(ToastService);
  protected readonly isBrowser = inject(IS_BROWSER);
  protected readonly areas = inject(AreasService);
  protected readonly cragsService = inject(CragsService);
  private readonly donationsService = inject(AreaDonationsService);
  protected readonly supabase = inject(SupabaseService);
  protected readonly dialogs = inject(TuiDialogService);
  protected readonly translate = inject(TranslateService);
  protected readonly filtersService = inject(FiltersService);
  private readonly seo = inject(SeoService);
  protected readonly userProfiles = inject(UserProfilesService);
  private readonly cache = inject(CacheService);

  areaSlug: InputSignal<string> = input.required<string>();
  readonly query: WritableSignal<string> = signal('');
  protected readonly userSearchQuery = signal('');
  protected readonly selectedAdminUser = signal<UserProfileBasicDto | null>(
    null,
  );
  readonly selectedGradeRange = this.filterState.areaListGradeRange;
  readonly selectedCategories = this.filterState.areaListCategories;
  readonly selectedShade = this.filterState.areaListShade;

  protected readonly contentTabIndex = signal(0);

  private readonly ascentsPage = signal(0);
  protected readonly accumulatedAscents = signal<FeedItem[]>([]);

  protected readonly ascentsResource = resource({
    params: () => {
      const area = this.outdoorData.selectedArea();
      if (!area) return null;
      return { areaId: area.id, page: this.ascentsPage() };
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
            crag:crags!inner(id, slug, name, area_id)
          )
        `,
        )
        .eq('route.crag.area_id', params.areaId)
        .order('date', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('[AreaComponent] Error fetching ascents:', error);
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

  readonly hasActiveFilters = computed(() => {
    const [lo, hi] = this.selectedGradeRange();
    const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
    return (
      gradeActive ||
      this.selectedCategories().length > 0 ||
      this.selectedShade().length > 0
    );
  });

  protected readonly hasTopos = computed(() => {
    return (this.outdoorData.selectedArea()?.topos_count ?? 0) > 0;
  });

  protected readonly areaDetailResource = resource({
    params: () => this.outdoorData.selectedArea()?.id,
    loader: async ({ params: id }) => {
      if (!id) return null;
      const { data } = await this.areas.getById(id);
      return data as AreaDetail | null;
    },
  });

  protected readonly areaDetail = computed(() =>
    this.areaDetailResource.value(),
  );

  protected readonly canEditAsAdmin = computed(() =>
    this.authState.canEditAsAdmin(),
  );

  protected readonly canEditArea = computed(() => this.authState.canEditArea());

  protected readonly isPublic = computed(
    () => this.areaDetail()?.is_public ?? true,
  );

  protected readonly headerActions = computed<SectionHeaderAction[]>(() => {
    const area = this.outdoorData.selectedArea();
    if (!area) return [];

    const actions: SectionHeaderAction[] = [];
    const isAdmin = this.authState.isAdmin();
    const canAreaAdmin = this.authState.isAreaAdminOf(area.id);
    const canEdit = this.authState.checkAreaEditPermissionDirect(area);
    const userId = this.authState.userProfile()?.id;

    if (canEdit) {
      if (!this.isPublic()) {
        actions.push({
          label: 'areas.manageAccess',
          icon: '@tui.users',
          appearance: 'neutral',
          action: () => this.openAccessManager(),
        });
      }
      actions.push({
        label: 'edit',
        icon: '@tui.square-pen',
        appearance: 'neutral',
        action: () => this.openEditArea(),
      });
      if (isAdmin) {
        actions.push({
          label: 'delete',
          icon: '@tui.trash',
          appearance: 'negative',
          action: () => this.deleteArea(),
        });
      }
    } else if (
      userId &&
      !canAreaAdmin &&
      !this.authState.pendingAdminRequestAreaIds().has(area.id)
    ) {
      actions.push({
        label: 'adminRequests.button',
        icon: '@tui.shield-alert',
        appearance: 'secondary',
        action: () => this.requestAdmin(),
      });
    }

    return actions;
  });

  protected readonly allRoutesResource = resource({
    params: () => {
      const area = this.outdoorData.selectedArea();
      return area?.id ?? null;
    },
    loader: async ({ params: areaId }) => {
      if (!areaId || !this.isBrowser) return [];
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.client
        .from('routes')
        .select(
          `*,
          liked:route_likes(id),
          project:route_projects(id),
          ascents:route_ascents(rate, type),
          own_ascent:route_ascents(*),
          topo_routes(topo:topos(id, name, slug)),
          route_equippers(equipper:equippers(*)),
          crag:crags!inner(id, slug, name, area_id, area:areas(slug, name))
        `,
        )
        .eq('crag.area_id', areaId)
        .order('grade', { ascending: true });

      if (error) {
        console.error('[AreaComponent] Error fetching routes:', error);
        return [];
      }
      if (!data) return [];

      return data.map((r) => {
        const { crag, liked, project, own_ascent, ...rest } = r;
        const cragArea = (
          crag as { area?: { slug?: string; name?: string } } | null
        )?.area;
        return {
          ...rest,
          liked: (liked?.length ?? 0) > 0,
          project: (project?.length ?? 0) > 0,
          own_ascent: own_ascent?.[0] ?? null,
          crag_id: crag?.id ?? r.crag_id,
          area_id: crag?.area_id ?? undefined,
          crag_slug: crag?.slug ?? undefined,
          crag_name: crag?.name ?? undefined,
          area_slug: cragArea?.slug ?? undefined,
          area_name: cragArea?.name ?? undefined,
        } as RouteItem;
      });
    },
  });

  protected readonly allRoutes = computed(
    () => this.allRoutesResource.value() ?? [],
  );

  readonly filteredCrags = computed(() => {
    const query = this.query();
    const [minIdx, maxIdx] = this.selectedGradeRange();
    const list = this.outdoorData.cragsList();

    const textMatches = (c: (typeof list)[number]) =>
      matchesQuery(c.name, query) || matchesQuery(c.slug, query);

    const gradeMatches = (c: (typeof list)[number]) => {
      const grades = normalizeRoutesByGrade(c.grades);
      return isGradeRangeOverlap(grades, minIdx, maxIdx);
    };

    const categories = this.selectedCategories();
    const kindMatches = (c: (typeof list)[number]) => {
      if (!categories.length) return true;
      const idxToKind: Record<number, string> = {
        0: ClimbingKinds.SPORT,
        1: ClimbingKinds.BOULDER,
        2: ClimbingKinds.MULTIPITCH,
      };
      const allowedKinds = categories.map((i) => idxToKind[i]).filter(Boolean);
      return c.climbing_kind?.some((k) => allowedKinds.includes(k));
    };

    const shadeKeys = this.selectedShade();
    const shadeMatches = (c: (typeof list)[number]) => {
      if (!shadeKeys.length) return true;
      return shadeKeys.some((key) => {
        switch (key) {
          case 'shade_morning':
            return c.shade_morning;
          case 'shade_afternoon':
            return c.shade_afternoon;
          case 'shade_all_day':
            return c.shade_all_day;
          case 'sun_all_day':
            return c.sun_all_day;
          default:
            return true;
        }
      });
    };

    return list.filter(
      (c) =>
        textMatches(c) && gradeMatches(c) && kindMatches(c) && shadeMatches(c),
    );
  });

  protected readonly crags = computed(() => this.filteredCrags());
  protected readonly cragsCount = computed(() => this.filteredCrags().length);
  protected readonly areaToposCount = computed(() =>
    this.crags().reduce((acc, c) => acc + (c.topos_count || 0), 0),
  );

  protected readonly areaAdminsResource = resource({
    params: () => this.outdoorData.selectedArea()?.id,
    loader: async ({ params: areaId }) => {
      if (!areaId) return [];
      await this.supabase.whenReady();

      const { data: mappings, error: mappingError } = await this.supabase.client
        .from('area_admins')
        .select('user_id')
        .eq('area_id', areaId);

      if (mappingError || !mappings?.length) {
        if (mappingError) {
          console.error(
            '[AreaComponent] Error fetching area admin mappings:',
            mappingError,
          );
        }
        return [];
      }

      const userIds = mappings.map((m) => m.user_id);
      const { data: profiles, error: profilesError } =
        await this.supabase.client
          .from('user_profiles')
          .select('id, name, avatar')
          .in('id', userIds);

      if (profilesError) {
        console.error(
          '[AreaComponent] Error fetching admin profiles:',
          profilesError,
        );
        return [];
      }

      return mappings.map((m) => ({
        user_id: m.user_id,
        user: profiles.find((p) => p.id === m.user_id) || {
          id: m.user_id,
          name: 'Unknown',
          avatar: null,
        },
      }));
    },
  });

  protected readonly areaAdmins = computed(
    () => this.areaAdminsResource.value() ?? [],
  );

  protected readonly foundUsersResource = resource({
    params: () => this.userSearchQuery().trim(),
    loader: async ({ params: query }) => {
      if (query.length < 2) return [];
      return await this.userProfiles.searchUsers(query);
    },
  });

  protected readonly foundUsers = computed(
    () => this.foundUsersResource.value() ?? [],
  );

  protected readonly areaCenterResource = resource({
    params: () => this.outdoorData.selectedArea()?.id,
    loader: async ({ params: areaId }) => {
      if (!areaId) return null;
      await this.supabase.whenReady();
      const { data } = await this.supabase.client
        .from('crags')
        .select('latitude, longitude')
        .eq('area_id', areaId)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);
      if (!data?.length) return null;
      const avgLat = data.reduce((s, c) => s + c.latitude!, 0) / data.length;
      const avgLng = data.reduce((s, c) => s + c.longitude!, 0) / data.length;
      return { latitude: avgLat, longitude: avgLng };
    },
  });

  protected readonly areaCenter = computed(() =>
    this.areaCenterResource.value(),
  );

  protected readonly stringifyUser = (u: UserProfileBasicDto) => u.name || '';

  constructor() {
    effect(() => {
      const slug = this.areaSlug();
      this.outdoorData.selectArea(slug);
      untracked(() => {
        this.ascentsPage.set(0);
        this.accumulatedAscents.set([]);
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
      if (!this.isBrowser) return;
      const loading = this.outdoorData.areasListResource.isLoading();
      const area = this.outdoorData.selectedArea();
      if (!loading && !area) {
        this.router.navigateByUrl('/page-not-found');
      }
    });

    effect(() => {
      const area = this.outdoorData.selectedArea();
      const slug = this.areaSlug();
      if (!area) return;
      const cragsCount = this.filteredCrags().length;
      const description = this.translate.instant('seo.description');
      this.seo.setPage({
        title: area.name,
        description: `${area.name} – ${cragsCount} ${this.translate.instant('crags').toLowerCase()}. ${description}`,
        canonicalUrl: `https://climbeast.com/area/${slug}`,
      });
    });
  }

  loadMoreAscents(): void {
    if (this.ascentsResource.isLoading()) return;
    if (!this.hasMoreAscents()) return;
    this.ascentsPage.update((p) => p + 1);
  }

  onQuery(v: string) {
    this.query.set(v);
  }

  openFilters(): void {
    this.filtersService.openFilters();
  }

  onToggleLike(): void {
    if (!this.isBrowser) return;
    const area = this.outdoorData.selectedArea();
    if (!area) return;
    void this.areas.toggleAreaLike(area.id);
  }

  async deleteArea(): Promise<void> {
    const area = this.outdoorData.selectedArea();
    if (!area) return;
    if (!this.isBrowser) return;

    const t = await firstValueFrom(
      this.translate.get(['areas.deleteTitle', 'areas.deleteConfirm'], {
        name: area.name,
      }),
    );
    const title = t['areas.deleteTitle'];
    const message = t['areas.deleteConfirm'];

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
      await this.areas.delete(area.id);
      await this.router.navigateByUrl('/area');
    } catch (error) {
      console.error('[AreaComponent] Error deleting area:', error);
      handleErrorToast(error, this.toast);
    }
  }

  openEditArea(): void {
    const area = this.outdoorData.selectedArea();
    if (!area) return;
    this.areas.openAreaForm({
      areaData: { id: area.id, name: area.name, slug: area.slug },
    });
  }

  openAccessManager(): void {
    const area = this.outdoorData.selectedArea();
    if (!area) return;
    this.areas.openAreaAccessManager(area.id, area.name);
  }

  openCreateCrag(): void {
    const current = this.outdoorData.selectedArea();
    if (!current) return;
    this.cragsService.openCragForm({ areaId: current.id });
  }

  async viewOnMap(): Promise<void> {
    const area = this.outdoorData.selectedArea();
    if (!area) return;

    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('crags')
      .select('latitude, longitude')
      .eq('area_id', area.id)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error || !data || data.length === 0) {
      void this.router.navigateByUrl('/explore');
      return;
    }

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    data.forEach((c) => {
      if (c.latitude! < minLat) minLat = c.latitude!;
      if (c.latitude! > maxLat) maxLat = c.latitude!;
      if (c.longitude! < minLng) minLng = c.longitude!;
      if (c.longitude! > maxLng) maxLng = c.longitude!;
    });

    this.mapData.mapBounds.set({
      south_west_latitude: minLat,
      south_west_longitude: minLng,
      north_east_latitude: maxLat,
      north_east_longitude: maxLng,
    });

    void this.router.navigateByUrl('/explore');
  }

  async requestAdmin(): Promise<void> {
    const area = this.outdoorData.selectedArea();
    if (!area) return;
    if (!this.isBrowser) return;

    const t = await firstValueFrom(
      this.translate.get([
        'adminRequests.confirmTitle',
        'adminRequests.confirmMessage',
      ]),
    );
    const title = t['adminRequests.confirmTitle'];
    const message = t['adminRequests.confirmMessage'];

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

    const success = await this.areas.requestAreaAdmin(area.id);
    if (success) {
      this.authState.pendingAdminRequestsResource.reload();
    }
  }

  async addAdmin(user: UserProfileBasicDto): Promise<void> {
    const areaId = this.outdoorData.selectedArea()?.id;
    if (!areaId) return;

    const { error } = await this.supabase.client
      .from('area_admins')
      .insert({ area_id: areaId, user_id: user.id });

    if (error) {
      if (error.code === '23505') {
        this.toast.info('adminRequests.alreadyRequested');
      } else {
        console.error('[AreaComponent] Error adding admin:', error);
        this.toast.error('errors.unexpected');
      }
      return;
    }

    this.toast.success('messages.toasts.adminAdded');
    this.areaAdminsResource.reload();
    if (user.id === this.supabase.authUserId()) {
      this.cache.remove(CACHE_KEYS.adminAreas(user.id));
      this.supabase.adminAreasResource.reload();
    }
    this.userSearchQuery.set('');
  }

  async removeAdmin(userId: string): Promise<void> {
    const areaId = this.outdoorData.selectedArea()?.id;
    if (!areaId) return;

    const { error } = await this.supabase.client
      .from('area_admins')
      .delete()
      .eq('area_id', areaId)
      .eq('user_id', userId);

    if (error) {
      console.error('[AreaComponent] Error removing admin:', error);
      this.toast.error('errors.unexpected');
      return;
    }

    this.toast.success('messages.toasts.adminRemoved');
    this.areaAdminsResource.reload();
    if (userId === this.supabase.authUserId()) {
      this.cache.remove(CACHE_KEYS.adminAreas(userId));
      this.supabase.adminAreasResource.reload();
    }
  }

  protected onAdminSelected(
    user: UserProfileBasicDto | null,
    inputEl?: HTMLInputElement,
  ): void {
    if (!user) return;
    void this.addAdmin(user);
    this.userSearchQuery.set('');
    this.selectedAdminUser.set(user);
    setTimeout(() => {
      this.selectedAdminUser.set(null);
      if (inputEl) {
        inputEl.value = '';
        inputEl.blur();
      }
    });
  }

  viewFirstTopo(): void {
    const topos = this.outdoorData.areaTopos();
    if (!topos || topos.length === 0) return;
    const area = this.outdoorData.selectedArea();
    if (!area) return;

    const firstTopo = topos[0];
    void this.router.navigate([
      '/area',
      area.slug,
      firstTopo.crag_slug,
      'topo',
      firstTopo.id,
    ]);
  }

  buyTopo(): void {
    const area = this.areaDetail();
    if (!area) return;

    this.donationsService.openDonationDialog(area.id, area.name, {
      areaPrice: area.price,
      isPurchased: !!area.purchased,
      toposCount: this.areaToposCount(),
      topos: this.outdoorData.areaTopos(),
      initialAmount: area.price,
    });
  }
}
