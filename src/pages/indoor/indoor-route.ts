import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  resource,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import {
  TuiButton,
  TuiIcon,
  TuiLoader,
  TuiHint,
  TuiAppearance,
  TuiDialogService,
  TuiScrollbar,
} from '@taiga-ui/core';
import {
  TuiBadge,
  TuiAvatar,
  TUI_CONFIRM,
  TuiConfirmData,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../../services/ascents.service';
import { AuthStateService } from '../../services/auth-state.service';
import { BreadcrumbsService } from '../../services/breadcrumbs.service';
import { IndoorCentersDataService } from '../../services/indoor-centers-data.service';
import { IndoorService } from '../../services/indoor.service';
import { ToastService } from '../../services/toast.service';

import { AscentCardComponent } from '../../components/ascent/ascent-card';

import { ChartAscentsByGradeComponent } from '../../components/charts/chart-ascents-by-grade';
import { ChartAscentsByStyleComponent } from '../../components/charts/chart-ascents-by-style';
import { GradeComponent } from '../../components/ui/avatar-grade';
import { EmptyStateComponent } from '../../components/ui/empty-state';
import {
  SectionHeaderAction,
  SectionHeaderComponent,
} from '../../components/ui/section-header';

import {
  CLIMBING_ICONS,
  GRADE_NUMBER_TO_LABEL,
  VERTICAL_LIFE_GRADES,
  INDOOR_ROUTE_COLORS,
  AscentType,
  ClimbingKind,
  RouteAscentWithExtras,
  IndoorAscentWithExtras,
  IndoorCenterDto,
} from '../../models';

import { inputValueOrUndefined } from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-indoor-route',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslatePipe,
    TuiAvatar,
    TuiButton,
    TuiIcon,
    TuiLoader,
    TuiBadge,
    TuiHint,
    TuiAppearance,
    TuiScrollbar,
    GradeComponent,
    EmptyStateComponent,
    SectionHeaderComponent,
    ChartAscentsByGradeComponent,
    ChartAscentsByStyleComponent,
    AscentCardComponent,
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
        @if (route(); as r) {
          <!-- Left Column -->
          <div
            class="flex flex-col w-full lg:flex-1 min-w-0 lg:h-full lg:min-h-0 lg:overflow-hidden"
          >
            <tui-scrollbar class="w-full h-full min-h-0">
              <div
                class="flex flex-col gap-4 w-full min-w-0 px-4 lg:px-0 lg:pr-4 pb-6"
              >
                <!-- Section Header -->
                <div>
                  <app-section-header
                    class="w-full"
                    [title]="r.name"
                    [liked]="false"
                    [showLike]="false"
                    [actions]="headerActions()"
                  >
                    <app-grade
                      [grade]="r.grade || 0"
                      [kind]="r.climbing_kind"
                      size="l"
                      titleInfo
                    />
                    @if (r.legacy) {
                      <span
                        tuiBadge
                        size="m"
                        appearance="neutral"
                        class="uppercase text-xs self-center"
                        titleInfo
                      >
                        {{ 'indoor.legacy' | translate }}
                      </span>
                    }
                  </app-section-header>
                </div>

                <!-- Chart and Stats Grid -->
                <div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <!-- Left: Charts -->
                  <div class="flex flex-col gap-6 items-center w-full">
                    <!-- Charts -->
                    <div
                      class="flex flex-col gap-4 items-center justify-center w-full"
                    >
                      <app-chart-ascents-by-grade
                        [ascents]="mappedAscents()"
                        [gradeLabel]="gradeLabel()"
                        class="w-full"
                      />
                      <app-chart-ascents-by-style
                        [ascents]="mappedAscents()"
                        class="w-full"
                      />
                    </div>
                  </div>

                  <!-- Right: Stats & Actions -->
                  <div class="flex flex-col gap-6 justify-center">
                    <div class="flex flex-wrap justify-around gap-6">
                      <!-- Climbing Kind -->
                      <div class="flex flex-col items-center">
                        <span
                          class="text-xs uppercase opacity-60 font-semibold tracking-wider mb-2"
                        >
                          {{ 'climbing_kind' | translate }}
                        </span>
                        <div class="flex items-center gap-2">
                          <span
                            [tuiAvatar]="
                              climbingIcons[r.climbing_kind ?? 'sport'] ||
                              '@tui.mountain'
                            "
                            size="s"
                            appearance="secondary"
                          ></span>
                          <span class="text-xl font-semibold capitalize">
                            {{ 'climbingKinds.' + r.climbing_kind | translate }}
                          </span>
                        </div>
                      </div>

                      <!-- Color -->
                      <div class="flex flex-col items-center">
                        <span
                          class="text-xs uppercase opacity-60 font-semibold tracking-wider mb-2"
                        >
                          {{ 'color' | translate }}
                        </span>
                        <div class="flex items-center gap-2">
                          @if (r.color) {
                            <span
                              class="w-5 h-5 rounded-full border border-(--tui-border-normal) block shrink-0"
                              [style.backgroundColor]="r.color"
                            ></span>
                            <span class="text-xl font-semibold">
                              {{ routeColorName() }}
                            </span>
                          } @else {
                            <span class="opacity-50 text-base">-</span>
                          }
                        </div>
                      </div>
                    </div>

                    <!-- Action Buttons -->
                    <div
                      class="flex flex-col gap-3 justify-center w-full max-w-sm mx-auto"
                    >
                      @if (!ownAscent()) {
                        <button
                          tuiButton
                          appearance="primary"
                          size="m"
                          iconStart="@tui.circle-plus"
                          class="w-full"
                          (click.zoneless)="onLogAscent()"
                        >
                          {{ 'ascent.new' | translate }}
                        </button>
                      } @else {
                        <div class="flex gap-2 w-full">
                          <button
                            tuiButton
                            [style.background]="ownAscentInfo()?.background"
                            class="group relative overflow-hidden text-(--tui-text-primary-on-accent-1)! grow transition-all duration-300"
                            size="m"
                            (click.zoneless)="
                              ownAscent() && onViewAscent(ownAscent()!)
                            "
                          >
                            <!-- Normal State -->
                            <span
                              class="flex items-center gap-2 transition-all duration-300 ease-out group-hover:opacity-0 group-hover:scale-90 group-hover:-translate-y-1"
                            >
                              <tui-icon [icon]="ownAscentInfo()?.icon || ''" />
                              {{
                                'ascentTypes.' + (ownAscent()?.type ?? '')
                                  | translate
                              }}
                            </span>

                            <!-- Hover State -->
                            <span
                              class="absolute inset-0 flex items-center justify-center gap-2 opacity-0 scale-90 translate-y-1 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 pointer-events-none"
                            >
                              <tui-icon icon="@tui.eye" />
                              {{ 'ascent.view' | translate }}
                            </span>
                          </button>
                          <button
                            tuiIconButton
                            appearance="secondary"
                            size="m"
                            iconStart="@tui.circle-plus"
                            class="rounded-full! shrink-0"
                            [tuiHint]="'ascent.new' | translate"
                            (click.zoneless)="onLogAscent()"
                          >
                            <span class="tui-sr-only">{{
                              'ascent.new' | translate
                            }}</span>
                          </button>
                        </div>
                      }
                    </div>

                    <!-- Equippers -->
                    @if (r.equippers && r.equippers.length > 0) {
                      <div class="flex flex-col items-center">
                        <span
                          class="text-xs uppercase opacity-60 font-semibold tracking-wider mb-1"
                        >
                          {{ 'equippers' | translate }}
                        </span>
                        <div class="flex flex-wrap gap-2 justify-center">
                          @for (e of r.equippers; track e.id) {
                            <a
                              tuiButton
                              appearance="secondary"
                              size="s"
                              class="min-w-fit!"
                              [routerLink]="['/equipper', e.id]"
                            >
                              {{ e.name }}
                            </a>
                          }
                        </div>
                      </div>
                    }

                    <!-- Topos (Croquis) -->
                    @if (r.topos && r.topos.length > 0) {
                      <div class="flex flex-col items-center">
                        <span
                          class="text-xs uppercase opacity-60 font-semibold tracking-wider mb-2"
                        >
                          {{
                            (r.topos.length === 1 ? 'topo' : 'topos')
                              | translate
                          }}
                        </span>
                        <div class="flex flex-wrap gap-2 justify-center">
                          @for (t of r.topos; track t.id) {
                            <a
                              tuiButton
                              appearance="secondary"
                              size="s"
                              class="min-w-fit!"
                              [routerLink]="[
                                '/indoor',
                                centerSlug(),
                                'topo',
                                t.id,
                              ]"
                            >
                              {{ t.name }}
                            </a>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- Ascents Section (Mobile only) -->
                <div class="lg:hidden mt-6">
                  <h2 class="text-2xl font-bold mb-4">
                    {{ ascents().length }}
                    {{
                      (ascents().length === 1 ? 'ascent' : 'ascents')
                        | translate
                        | lowercase
                    }}
                  </h2>
                  @if (ascents().length > 0) {
                    <div class="flex flex-col gap-4">
                      @for (ascent of mappedAscents(); track ascent.id) {
                        <app-ascent-card
                          [data]="ascent"
                          [showRoute]="false"
                          [showUser]="true"
                          [highlightOwn]="true"
                        />
                      }
                    </div>
                  } @else {
                    <app-empty-state
                      icon="/image/indoor-brush.svg"
                      iconSize="8rem"
                      message="indoor.noAscents"
                    />
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
                  <h2 class="text-2xl font-bold mb-4">
                    {{ ascents().length }}
                    {{
                      (ascents().length === 1 ? 'ascent' : 'ascents')
                        | translate
                        | lowercase
                    }}
                  </h2>
                  @if (ascents().length > 0) {
                    <div class="flex flex-col gap-4">
                      @for (ascent of mappedAscents(); track ascent.id) {
                        <app-ascent-card
                          [data]="ascent"
                          [showRoute]="false"
                          [showUser]="true"
                          [highlightOwn]="true"
                        />
                      }
                    </div>
                  } @else {
                    <app-empty-state
                      icon="/image/indoor-brush.svg"
                      iconSize="8rem"
                      message="indoor.noAscents"
                    />
                  }
                </div>
              </tui-scrollbar>
            </div>
          </div>
        } @else if (routeNotFound()) {
          <div
            class="w-full min-h-[50vh] flex flex-col items-center justify-center gap-3 text-center opacity-50"
          >
            <tui-icon icon="@tui.circle-alert" class="text-5xl" />
            <p class="text-lg font-bold">Route not found</p>
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
export class IndoorRouteComponent {
  centerSlug = input.required<string>();
  routeSlug = input.required<string>();

  protected readonly indoor = inject(IndoorService);
  protected readonly authState = inject(AuthStateService);
  protected readonly breadcrumbsService = inject(BreadcrumbsService);
  protected readonly indoorCentersData = inject(IndoorCentersDataService);
  protected readonly ascentsService = inject(AscentsService);
  protected readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly dialogs = inject(TuiDialogService);

  protected readonly climbingIcons = CLIMBING_ICONS;

  protected readonly route = computed(() => {
    // `value()` lanza ResourceValueError si la consulta ha fallado
    if (this.routeResource.status() === 'error') {
      return null;
    }
    return this.routeResource.value() ?? null;
  });

  /** Solo mostramos «no encontrado» cuando la consulta ya ha terminado. */
  protected readonly routeNotFound = computed(() => {
    // En SSR no hay navegador: `getRouteBySlug` devuelve null y el servidor
    // pintaría «Route not found» en el HTML. El servidor muestra el spinner.
    if (!this.isBrowser) {
      return false;
    }
    const status = this.routeResource.status();
    if (status === 'error') {
      return true;
    }
    // idle / loading / reloading sin valor previo → seguimos cargando
    if (!this.routeResource.hasValue()) {
      return false;
    }
    return !this.route();
  });

  protected readonly mappedAscents = computed(() => {
    const raw = this.ascents();
    const routeVal = this.route();
    if (!routeVal) return [];
    return raw.map((a) => {
      return {
        ...a,
        user: a.user_profile,
        comment: a.notes,
        grade: routeVal.grade,
        route: {
          id: routeVal.id,
          name: routeVal.name,
          climbing_kind: routeVal.climbing_kind,
          grade: routeVal.grade,
          center_name: routeVal.center_name,
          center_slug: routeVal.center_slug,
        },
      } as unknown as RouteAscentWithExtras;
    });
  });

  protected readonly ownAscentInfo = computed(() => {
    const own = this.ownAscent();
    if (!own) return null;
    const type = own.type || 'default';
    const info =
      this.ascentsService.ascentInfo()[type as AscentType | 'default'];
    return info || null;
  });

  readonly gradeLabel = computed(() => {
    const grade = this.route()?.grade;
    return grade !== undefined && grade !== null
      ? (GRADE_NUMBER_TO_LABEL[grade as VERTICAL_LIFE_GRADES] ?? '?')
      : '?';
  });

  protected readonly routeResource = resource({
    params: () => {
      // Si el router aún no ha enlazado los inputs devolvemos undefined → `idle`
      const centerSlug = inputValueOrUndefined(() => this.centerSlug());
      const routeSlug = inputValueOrUndefined(() => this.routeSlug());
      if (!centerSlug || !routeSlug) {
        return undefined;
      }
      return {
        centerSlug,
        routeSlug,
        reloadTick: this.indoorCentersData.indoorRoutesReloadTick(),
      };
    },
    loader: ({ params }) =>
      this.indoor.getRouteBySlug(params.centerSlug, params.routeSlug),
  });

  protected readonly ascents = computed(
    () => this.ascentsResource.value() || [],
  );

  protected readonly ascentsResource = resource({
    params: () => ({
      id: this.route()?.id,
      reloadTick: this.indoorCentersData.indoorRoutesReloadTick(),
    }),
    loader: ({ params }) =>
      params.id ? this.indoor.getRouteAscents(params.id) : Promise.resolve([]),
  });

  protected readonly ownAscent = computed(() => {
    const userId = this.authState.userProfile()?.id;
    if (!userId) return null;
    return this.ascents().find((a) => a.user_id === userId) || null;
  });

  protected readonly canEdit = computed(() => {
    const r = this.route();
    if (!r) return false;
    return r.center_id
      ? this.authState.indoorAdminPermissions()[r.center_id] || false
      : false;
  });

  protected readonly headerActions = computed<SectionHeaderAction[]>(() => {
    const r = this.route();
    if (!r) return [];

    const actions: SectionHeaderAction[] = [];
    const isAdmin = this.authState.isAdmin();
    const isCenterAdmin = r.center_id
      ? this.authState.isIndoorAdminOf(r.center_id)
      : false;
    const canEdit = isAdmin || isCenterAdmin;

    if (canEdit) {
      actions.push({
        label: 'edit',
        icon: '@tui.square-pen',
        appearance: 'neutral',
        action: () => this.openEditRoute(),
      });
      actions.push({
        label: 'delete',
        icon: '@tui.trash',
        appearance: 'negative',
        action: () => this.deleteRoute(),
      });
    }

    return actions;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.breadcrumbsService.selectedIndoorCenter.set(null);
      this.breadcrumbsService.selectedIndoorRoute.set(null);
    });

    effect(() => {
      const r = this.route();
      if (r) {
        this.breadcrumbsService.selectedIndoorCenter.set({
          id: r.center_id ?? '',
          name: r.center_name || '',
          slug: r.center_slug || '',
        } as IndoorCenterDto);
        this.breadcrumbsService.selectedIndoorRoute.set(r);
      } else {
        this.breadcrumbsService.selectedIndoorCenter.set(null);
        this.breadcrumbsService.selectedIndoorRoute.set(null);
      }
    });
  }

  async onLogAscent(): Promise<void> {
    const r = this.route();
    if (!r) return;
    const success = await firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: r.id,
        routeName: r.name,
        isIndoor: true,
        climbingKind: r.climbing_kind as ClimbingKind | undefined,
        grade: r.grade || undefined,
      }),
      { defaultValue: false },
    );
    if (success) {
      this.ascentsResource.reload();
    }
  }

  async onViewAscent(ascent: IndoorAscentWithExtras): Promise<void> {
    this.ascentsService.viewAscent(ascent.id);
  }

  async onDeleteAscent(ascentId: string): Promise<void> {
    if (!this.isBrowser) return;

    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('ascent.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('ascent.deleteConfirm'),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'primary-destructive',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then(async (confirmed) => {
      if (!confirmed) return;
      try {
        await this.indoor.deleteRouteAscent(ascentId);
      } catch (e) {
        console.error(e);
        this.toast.error('errors.unexpected');
      }
    });
  }

  protected readonly routeColorName = computed(() => {
    const color = this.route()?.color;
    if (!color) return '';
    const colorName = INDOOR_ROUTE_COLORS[color];
    return colorName ? this.translate.instant('colors.' + colorName) : color;
  });

  async openEditRoute(): Promise<void> {
    const r = this.route();
    if (!r) return;
    const success = await this.indoor.openIndoorRouteForm(r.center_id!, r);
    if (success) {
      this.routeResource.reload();
    }
  }

  async deleteRoute(): Promise<void> {
    const r = this.route();
    if (!r || !this.isBrowser) return;

    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('routes.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('routes.deleteConfirm', {
            name: r.name || this.translate.instant('route'),
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'primary-destructive',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then(async (confirmed) => {
      if (!confirmed) return;
      try {
        await this.indoor.deleteRoute(r.id);
        void this.router.navigate(['/indoor', r.center_slug]);
      } catch (e) {
        console.error(e);
        this.toast.error('errors.unexpected');
      }
    });
  }
}
