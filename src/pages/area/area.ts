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
import { EightAnuService } from '../../services/eight-anu.service';
import { FilterStateService } from '../../services/filter-state.service';
import { FiltersService } from '../../services/filters.service';
import { LayoutService } from '../../services/layout.service';
import { MapDataService } from '../../services/map-data.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { RoutesService } from '../../services/routes.service';
import { SeoService } from '../../services/seo.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { UserProfilesService } from '../../services/user-profiles.service';

import { AreaRevenuePanelComponent } from '../../components/area/area-revenue-panel';
import { AscentsFeedComponent } from '../../components/ascent/ascents-feed';
import { ChartRoutesByGradeComponent } from '../../components/charts/chart-routes-by-grade';
import { CragCardComponent } from '../../components/crag/crag-card';
import { PaywallComponent } from '../../components/paywall/paywall';
import { OutdoorRoutesTableComponent } from '../../components/route/outdoor-routes-table';
import { TopoCardComponent } from '../../components/topo/topo-card';
import { GradeComponent } from '../../components/ui/avatar-grade';
import { EmptyStateComponent } from '../../components/ui/empty-state';
import { MeteoButtonComponent } from '../../components/ui/meteo-button';
import { ParkingButtonComponent } from '../../components/ui/parking-button';
import {
  SectionHeaderAction,
  SectionHeaderComponent,
} from '../../components/ui/section-header';
import { UbicacionDropdownComponent } from '../../components/ui/ubicacion-dropdown';
import { UserInfoHintComponent } from '../../components/ui/user-info-hint';

import {
  AreaDetail,
  AscentTypes,
  ClimbingKind,
  ClimbingKinds,
  type FeedItem,
  isGradeRangeOverlap,
  normalizeRoutesByGrade,
  ORDERED_GRADE_VALUES,
  type ParkingDto,
  type RouteItem,
  type SearchRouteItem,
  type UserProfileBasicDto,
} from '../../models';

import { CACHE_KEYS } from '../../constants';
import { AvatarUrlPipe, IconSrcPipe, InitialsPipe } from '../../pipes';
import {
  filterRoutes,
  gradeToVerticalLife,
  handleErrorToast,
  mapRouteToExtras,
  matchesQuery,
  RawRouteData,
  slugify,
} from '../../utils';

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
    GradeComponent,
    FormsModule,
    IconSrcPipe,
    InitialsPipe,
    LowerCasePipe,
    OutdoorRoutesTableComponent,
    PaywallComponent,
    ReactiveFormsModule,
    RouterLink,
    SectionHeaderComponent,
    TopoCardComponent,
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
    ParkingButtonComponent,
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
          class="flex flex-col w-full lg:flex-1 min-w-0 lg:h-full lg:min-h-0 lg:overflow-hidden"
        >
          <tui-scrollbar class="w-full h-full min-h-0">
            <div
              class="flex flex-col gap-4 w-full min-w-0 px-4 lg:px-0 lg:pr-4 pb-6"
            >
              @let canEditAsAdmin = authState.canEditAsAdmin();
              @if (outdoorData.selectedArea(); as area) {
                @let canAreaAdmin = authState.areaAdminPermissions()[area.id];
                <div>
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

                <div class="flex items-center justify-between gap-2">
                  <div class="flex gap-2 flex-wrap min-w-0">
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
                      @if (areaParkings().length) {
                        <app-parking-button [parkings]="areaParkings()" />
                      }
                    } @else {
                      @if (areaParkings().length) {
                        <app-parking-button [parkings]="areaParkings()" />
                      }
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
                    <app-chart-routes-by-grade
                      class="ml-auto"
                      [grades]="area.grades"
                    />
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
                  class="block lg:hidden"
                />

                @let admins = areaAdmins();
                @if (admins.length > 0 || canEditAsAdmin) {
                  <div class="flex flex-col gap-3">
                    <span
                      class="text-xs uppercase opacity-60 font-semibold tracking-wider"
                    >
                      {{ 'admins' | translate }}
                    </span>
                    <div class="flex flex-wrap gap-4 items-center">
                      @for (admin of admins; track admin.user_id) {
                        <div
                          class="flex items-center gap-2 bg-(--tui-background-neutral-1) py-1 px-1 pr-3 rounded-full border border-(--tui-border-normal) group transition-all hover:bg-(--tui-background-neutral-1-hover) no-underline text-inherit"
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
                            } @else {
                              <span tuiAvatar size="s">
                                {{ admin.user.name | initials }}
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
                        <div class="w-44">
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

                <!-- Segmented: Routes / Crags / Topos / Ascents -->
                <tui-segmented
                  [activeItemIndex]="activeTabIndex()"
                  (activeItemIndexChange)="activeTabIndex.set($event)"
                >
                  @for (tabIdx of segmentedTabs(); track tabIdx) {
                    <button type="button">
                      @if (tabIdx === 0) {
                        {{ allRoutes().length }}
                        {{ 'routes' | translate | lowercase }}
                      } @else if (tabIdx === 1) {
                        {{ cragsCount() }}
                        {{
                          (cragsCount() === 1 ? 'crag' : 'crags')
                            | translate
                            | lowercase
                        }}
                      } @else if (tabIdx === 2) {
                        {{ areaToposCount() }}
                        {{ 'topos' | translate | lowercase }}
                      } @else {
                        {{ ascentsCount() }}
                        {{ 'ascents' | translate | lowercase }}
                      }
                    </button>
                  }
                </tui-segmented>

                @let currentTab = segmentedTabs()[activeTabIndex()];
                @if (loadedTabs().has(0)) {
                  <div
                    [hidden]="currentTab !== 0"
                    [class.hidden]="currentTab !== 0"
                  >
                    <div class="flex flex-col gap-4">
                      <!-- Search + Filters for Routes -->
                      @if (canCreateAreaRoute()) {
                        <div class="flex justify-end">
                          <button
                            tuiButton
                            appearance="textfield"
                            size="s"
                            iconStart="@tui.plus"
                            (click.zoneless)="openCreateRoute()"
                          >
                            {{ 'new' | translate }}
                          </button>
                        </div>
                      }
                      <div
                        class="sticky top-0 z-10 flex items-end gap-2 bg-(--tui-background-base)"
                      >
                        <tui-textfield
                          appearance="floating"
                          class="grow block"
                          tuiTextfieldSize="l"
                        >
                          <label tuiLabel for="routes-search">{{
                            'searchPlaceholder' | translate
                          }}</label>
                          <input
                            tuiInput
                            #routesSearch
                            id="routes-search"
                            autocomplete="off"
                            [value]="routeQuery()"
                            (input.zoneless)="
                              routeQuery.set(routesSearch.value)
                            "
                          />
                        </tui-textfield>
                        <tui-badged-content class="rounded-2xl">
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

                      @let routesList = filteredAreaRoutes();
                      @let isSearchingAnu = areaEightAnuResource.isLoading();
                      @let anuResults = mappedAreaAnuResults();

                      @if (routesList.length > 0) {
                        <app-outdoor-routes-table
                          [data]="routesList"
                          [showLocation]="true"
                          [showRowColors]="true"
                        />
                      }

                      @if (
                        routeQuery().length >= 2 && routesList.length === 0
                      ) {
                        @if (isSearchingAnu) {
                          <div class="flex items-center justify-center p-8">
                            <tui-loader size="m" />
                          </div>
                        } @else {
                          @if (anuResults.length > 0) {
                            <div class="flex flex-col gap-3">
                              <div class="flex items-center gap-2 opacity-70">
                                <tui-icon [icon]="'8anu' | iconSrc" />
                                <span class="font-medium">
                                  {{ 'eightAnuResults' | translate }}
                                </span>
                              </div>
                              @for (
                                item of anuResults.slice(0, 3);
                                track item.zlaggableId
                              ) {
                                <div
                                  tuiAppearance="flat"
                                  class="p-4 rounded-3xl flex items-center justify-between gap-4"
                                >
                                  <div class="flex flex-col gap-1 min-w-0">
                                    <div class="flex items-center gap-2">
                                      <app-grade
                                        [grade]="item._grade"
                                        [kind]="areaRouteCragKind()"
                                      />
                                      <span class="font-bold truncate">
                                        {{ item.zlaggableName }}
                                      </span>
                                    </div>
                                    <span class="text-xs opacity-60 truncate">
                                      {{ item.cragName }} ·
                                      {{ item.sectorName }}
                                    </span>
                                  </div>
                                  <button
                                    tuiButton
                                    appearance="textfield"
                                    size="s"
                                    type="button"
                                    iconStart="@tui.download"
                                    (click.zoneless)="importAreaRoute(item)"
                                  >
                                    {{ 'import' | translate }}
                                  </button>
                                </div>
                              }
                            </div>
                          }

                          <div
                            tuiAppearance="flat"
                            class="flex flex-col items-center justify-center p-8 gap-4 rounded-3xl"
                          >
                            @if (anuResults.length === 0) {
                              <tui-icon
                                icon="@tui.search-x"
                                class="text-4xl opacity-50"
                              />
                              <span class="text-sm opacity-60 text-center">
                                {{ 'crags.8anuNotFound' | translate }}
                              </span>
                            } @else {
                              <span class="text-sm opacity-60 text-center">
                                {{ 'crags.createLocalInstead' | translate }}
                              </span>
                            }
                            @if (canEditAsAdmin || canAreaAdmin) {
                              <button
                                tuiButton
                                appearance="primary"
                                size="m"
                                type="button"
                                iconStart="@tui.plus"
                                (click.zoneless)="
                                  openCreateAreaRoute(routeQuery())
                                "
                              >
                                {{ 'crags.createRouteAction' | translate }}
                              </button>
                            }
                          </div>
                        }
                      }

                      @if (routesList.length === 0 && routeQuery().length < 2) {
                        <app-empty-state icon="@tui.route" />
                      }
                    </div>
                  </div>
                }
                @if (loadedTabs().has(1)) {
                  <div
                    [hidden]="currentTab !== 1"
                    [class.hidden]="currentTab !== 1"
                  >
                    <div class="flex flex-col gap-4">
                      <!-- Search + Filters for Crags -->
                      @if (canCreateAreaRoute()) {
                        <div class="flex justify-end">
                          <button
                            tuiButton
                            appearance="textfield"
                            size="s"
                            iconStart="@tui.plus"
                            (click.zoneless)="openCreateCrag()"
                          >
                            {{ 'new' | translate }}
                          </button>
                        </div>
                      }
                      <div
                        class="sticky top-0 z-10 flex items-end gap-2 bg-(--tui-background-base)"
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

                      <div class="grid gap-2 grid-cols-1 xl:grid-cols-2">
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
                    </div>
                  </div>
                }
                @if (loadedTabs().has(2)) {
                  <div
                    [hidden]="currentTab !== 2"
                    [class.hidden]="currentTab !== 2"
                  >
                    @let details = areaDetail();
                    @let hasAccess =
                      canEditAsAdmin ||
                      canAreaAdmin ||
                      details?.is_public ||
                      details?.purchased;

                    @if (hasAccess) {
                      <div class="grid gap-2 grid-cols-1 xl:grid-cols-2">
                        @for (t of outdoorData.areaTopos(); track t.id) {
                          <app-topo-card
                            [topo]="t"
                            (selected)="navigateToTopo(t)"
                          />
                        } @empty {
                          <app-empty-state
                            class="col-span-full"
                            icon="@tui.image"
                          />
                        }
                      </div>
                    } @else {
                      @let isSecret =
                        details &&
                        !details.is_public &&
                        (details.price === null || details.price === 0);
                      @if (!isSecret) {
                        <app-paywall
                          [areaId]="area.id"
                          [price]="details?.price || 0"
                          [areaName]="area.name"
                          [toposCount]="area.topos_count || 0"
                        />
                      } @else {
                        <div
                          class="flex flex-col items-center justify-center p-8 text-center gap-2"
                        >
                          <tui-icon
                            icon="@tui.lock"
                            class="text-4xl opacity-50"
                          />
                          <p class="text-sm font-semibold opacity-70">
                            {{ 'topos.restricted' | translate }}
                          </p>
                          <p class="text-xs opacity-50">
                            {{ 'topos.restrictedMessage' | translate }}
                          </p>
                        </div>
                      }
                    }
                  </div>
                }
                @if (loadedTabs().has(3)) {
                  <div
                    [hidden]="currentTab !== 3"
                    [class.hidden]="currentTab !== 3"
                  >
                    @if (
                      accumulatedAscents().length === 0 && !ascentsLoading()
                    ) {
                      <app-empty-state icon="@tui.route" />
                    } @else {
                      <app-ascents-feed
                        [ascents]="accumulatedAscents()"
                        [isLoading]="ascentsLoading()"
                        [hasMore]="hasMoreAscents()"
                        [showRoute]="true"
                        [showArea]="false"
                        (loadMore)="loadMoreAscents()"
                      />
                    }
                  </div>
                }
              } @else {
                <div class="flex items-center justify-center py-16">
                  <tui-loader size="xxl" />
                </div>
              }
            </div>
          </tui-scrollbar>
        </div>

        <!-- Right Column: Ascents Sidebar (desktop only) -->
        <div
          class="hidden lg:flex lg:w-[420px] xl:w-[460px] 2xl:w-[500px] shrink-0 min-w-0 lg:h-full flex-col"
        >
          <div class="flex flex-col w-full lg:h-full min-w-0 lg:min-h-0">
            @if (outdoorData.selectedArea(); as area) {
              <app-area-revenue-panel
                [areaId]="area.id"
                [areaName]="area.name"
                [isPaywalled]="!isPublic()"
                [areaPrice]="areaDetail()?.price || 0"
                [isPurchased]="!!areaDetail()?.purchased"
                [toposCount]="area.topos_count || 0"
                class="mb-6 block"
              />
            }
            <tui-scrollbar class="w-full lg:flex-1 lg:min-h-0">
              <div class="w-full min-w-0 px-4 lg:px-0 lg:pr-4 pb-6">
                <app-ascents-feed
                  [ascents]="accumulatedAscents()"
                  [isLoading]="ascentsLoading()"
                  [hasMore]="hasMoreAscents()"
                  [showRoute]="true"
                  [showArea]="false"
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
  private readonly routesService = inject(RoutesService);
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
  private readonly eightAnuService = inject(EightAnuService);

  areaSlug: InputSignal<string> = input.required<string>();
  readonly query: WritableSignal<string> = signal('');
  protected readonly userSearchQuery = signal('');
  protected readonly selectedAdminUser = signal<UserProfileBasicDto | null>(
    null,
  );
  readonly selectedGradeRange = this.filterState.areaListGradeRange;
  readonly selectedCategories = this.filterState.areaListCategories;
  readonly selectedShade = this.filterState.areaListShade;

  protected readonly activeTabIndex = signal(0);
  protected readonly loadedTabs = signal<Set<number>>(new Set([0]));
  protected readonly hasAnyCrags = signal(false);

  protected readonly routeQuery = signal('');
  protected readonly areaRouteCragKind = signal<ClimbingKind>(
    ClimbingKinds.SPORT,
  );

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
            crag:crags!inner(id, slug, name, area_id, area:areas(slug, name))
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
        const cragArea = (
          cragData as { area?: { slug?: string; name?: string } } | null
        )?.area;
        const mappedRoute = route
          ? {
              ...route,
              crag_slug: cragData?.slug,
              crag_name: cragData?.name,
              area_slug: cragArea?.slug,
              area_name: cragArea?.name,
            }
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

  protected readonly canCreateAreaRoute = computed(() => {
    const area = this.outdoorData.selectedArea();
    return !!area;
  });

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
      actions.push({
        label: 'sectors.unifyTitle',
        icon: '@tui.blend',
        appearance: 'neutral',
        action: () => this.cragsService.openUnifyCrags(),
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
      const userId = this.supabase.authUser()?.id;
      const { data, error } = await this.supabase.client
        .from('routes')
        .select(
          `*,
          liked:route_likes(id, user_id),
          project:route_projects(id, user_id),
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
        const userOwnAscents = userId
          ? (r.own_ascent ?? []).filter((a) => a.user_id === userId)
          : [];
        const userLiked = userId
          ? (r.liked ?? []).filter((l) => l.user_id === userId)
          : [];
        const userProject = userId
          ? (r.project ?? []).filter((p) => p.user_id === userId)
          : [];

        return mapRouteToExtras(
          {
            ...r,
            own_ascent: userOwnAscents,
            liked: userLiked,
            project: userProject,
          } as RawRouteData,
          {
            areaIdSource: 'crag.area_id',
            includeEquippers: true,
            includeTopos: true,
          },
        );
      }) as RouteItem[];
    },
  });

  protected readonly allRoutes = computed(
    () => this.allRoutesResource.value() ?? [],
  );

  protected readonly hasActiveRouteFilters = computed(() => {
    const [lo, hi] = this.selectedGradeRange();
    const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
    return gradeActive || this.selectedCategories().length > 0;
  });

  protected readonly filteredAreaRoutes = computed(() => {
    const query = this.routeQuery();
    const gradeRange = this.selectedGradeRange();
    const categories = this.selectedCategories();
    const allList = this.allRoutes();

    return filterRoutes(allList, { query, gradeRange, categories });
  });

  protected readonly areaEightAnuResource = resource({
    params: () => {
      const q = this.routeQuery().trim();
      const allMatchesCount = this.filteredAreaRoutes().length;
      const area = this.outdoorData.selectedArea();

      if (q.length >= 2 && area && allMatchesCount === 0) {
        return { q, areaSlug: area.slug };
      }
      return null;
    },
    loader: async ({ params }): Promise<SearchRouteItem[]> => {
      if (!params) return [];
      const results = await this.eightAnuService.searchRoutes(params.q);

      const existingSlugs = new Set(
        this.allRoutes().flatMap((r) => r.eight_anu_route_slugs || []),
      );
      const existingLocalSlugs = new Set(this.allRoutes().map((r) => r.slug));

      return results.filter((item) => {
        const itemSlug = slugify(item.zlaggableName);
        return (
          !existingLocalSlugs.has(itemSlug) && !existingSlugs.has(itemSlug)
        );
      });
    },
  });

  protected readonly mappedAreaAnuResults = computed(() => {
    return (this.areaEightAnuResource.value() || []).map((item) => ({
      ...item,
      _grade: gradeToVerticalLife(item.difficulty),
    }));
  });

  protected readonly ascentsCountResource = resource({
    params: () => this.outdoorData.selectedArea()?.id,
    loader: async ({ params: areaId }) => {
      if (!areaId || !this.isBrowser) return 0;
      await this.supabase.whenReady();
      const { data: routes } = await this.supabase.client
        .from('routes')
        .select('id, crag:crags!inner(area_id)')
        .eq('crag.area_id', areaId);
      if (!routes?.length) return 0;
      const { count } = await this.supabase.client
        .from('route_ascents')
        .select('*', { count: 'exact', head: true })
        .in(
          'route_id',
          routes.map((r) => r.id),
        );
      return count ?? 0;
    },
  });

  protected readonly ascentsCount = computed(
    () => this.ascentsCountResource.value() ?? 0,
  );

  protected readonly segmentedTabs = computed(() => {
    const tabs: number[] = [0, 1];
    if (this.hasTopos()) tabs.push(2);
    if (this.layoutService.isNotDesktop()) {
      tabs.push(3);
    }
    return tabs;
  });

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
    this.outdoorData
      .cragsList()
      .reduce((acc, c) => acc + (c.topos_count || 0), 0),
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

  protected readonly areaParkingsResource = resource({
    params: () => this.outdoorData.cragsList(),
    loader: async ({ params: crags }) => {
      if (!crags?.length || !this.isBrowser) return [];
      await this.supabase.whenReady();
      const cragIds = crags.map((c) => c.id);
      const { data, error } = await this.supabase.client
        .from('crag_parkings')
        .select('parking:parkings(*)')
        .in('crag_id', cragIds);
      if (error || !data) return [];
      const unique = [
        ...new Map(data.map((cp) => [cp.parking.id, cp.parking])).values(),
      ];
      return unique as ParkingDto[];
    },
  });

  protected readonly areaParkings = computed(
    () => this.areaParkingsResource.value() ?? [],
  );

  protected readonly stringifyUser = (u: UserProfileBasicDto) => u.name || '';

  constructor() {
    effect(() => {
      const crags = this.outdoorData.cragsList();
      untracked(() => {
        this.hasAnyCrags.set(crags.length > 0);
      });
    });

    effect(() => {
      const slug = this.areaSlug();
      this.outdoorData.selectArea(slug);
      untracked(() => {
        this.ascentsPage.set(0);
        this.accumulatedAscents.set([]);
        const currentTab = this.segmentedTabs()[this.activeTabIndex()] ?? 0;
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

  protected openRouteFilters(): void {
    this.filtersService.openFilters({ showShade: false });
  }

  protected async importAreaRoute(item: SearchRouteItem): Promise<void> {
    try {
      const routeSlug = slugify(item.zlaggableName);

      const existingLocal = this.allRoutes().find((r) => r.slug === routeSlug);
      if (existingLocal) {
        return;
      }

      const existingAnuSlugs = new Set(
        this.allRoutes().flatMap((r) => r.eight_anu_route_slugs || []),
      );
      if (existingAnuSlugs.has(routeSlug)) {
        return;
      }

      const area = this.outdoorData.selectedArea();
      if (!area) return;

      const allCrags = this.crags();
      const firstCrag = allCrags.length > 0 ? allCrags[0] : null;
      const cragId = firstCrag?.id;

      if (!cragId) {
        this.toast.error('routes.noCrag');
        return;
      }

      const grade = gradeToVerticalLife(item.difficulty);

      await this.routesService.openRouteForm({
        cragId,
        routeData: {
          id: 0,
          crag_id: cragId,
          name: item.zlaggableName,
          slug: '',
          grade,
          climbing_kind: ClimbingKinds.SPORT,
          height: null,
          eight_anu_route_slugs: [routeSlug],
        },
      });
    } catch (e) {
      handleErrorToast(e, this.toast);
    }
  }

  protected async openCreateAreaRoute(searchQuery?: string): Promise<void> {
    const area = this.outdoorData.selectedArea();
    if (!area) return;

    const allCrags = this.crags();
    const firstCrag = allCrags.length > 0 ? allCrags[0] : null;

    await this.routesService.openRouteForm({
      cragId: firstCrag?.id,
      routeData: searchQuery
        ? {
            id: 0,
            crag_id: firstCrag?.id,
            name: searchQuery,
            slug: slugify(searchQuery),
            grade: 0,
            climbing_kind: ClimbingKinds.SPORT,
          }
        : undefined,
    });
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

  openCreateRoute(): void {
    const area = this.outdoorData.selectedArea();
    this.routesService.openRouteForm({ areaId: area?.id });
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

  navigateToTopo(topo: { id: number | string; crag_slug: string }): void {
    const area = this.outdoorData.selectedArea();
    if (!area) return;

    void this.router.navigate([
      '/area',
      area.slug,
      topo.crag_slug,
      'topo',
      topo.id,
    ]);
  }

  viewFirstTopo(): void {
    const topos = this.outdoorData.areaTopos();
    if (!topos || topos.length === 0) return;
    const area = this.outdoorData.selectedArea();
    if (!area) return;

    const firstTopo = topos[0];
    this.navigateToTopo(firstTopo);
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
