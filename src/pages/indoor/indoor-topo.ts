import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TuiSortDirection } from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import {
  type TuiKeySteps,
  TuiAppearance,
  TuiButton,
  TuiDataList,
  TuiLoader,
} from '@taiga-ui/core';
import {
  TUI_CONFIRM,
  TuiBadge,
  type TuiConfirmData,
  TuiRange,
} from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AuthStateService } from '../../services/auth-state.service';
import { FilterStateService } from '../../services/filter-state.service';
import { IndoorDataService } from '../../services/indoor-data.service';
import { IndoorService } from '../../services/indoor.service';
import { LayoutService } from '../../services/layout.service';

import { TopoRoutesTableComponent } from '../../components/topo/topo-routes-table';
import { TopoViewerComponent } from '../../components/topo/topo-viewer';
import type { TopoRouteRow } from '../../components/topo/topo.types';
import {
  SectionHeaderAction,
  SectionHeaderComponent,
} from '../../components/ui/section-header';

import {
  GRADE_NUMBER_TO_LABEL,
  type IndoorTopoDto,
  ORDERED_GRADE_VALUES,
  PROJECT_GRADE_LABEL,
  type TopoDetail,
  type TopoRouteWithRoute,
  type VERTICAL_LIFE_GRADES,
} from '../../models';

import { TOPO_ROUTE_SORTERS } from '../../pipes';
import { calculateRouteMoves, clamp } from '../../utils';

import { TopoPageBase } from '../area/topo-page-base';

@Component({
  selector: 'app-indoor-topo',
  standalone: true,
  imports: [
    FormsModule,
    SectionHeaderComponent,
    TopoRoutesTableComponent,
    TopoViewerComponent,
    TranslatePipe,
    TuiAppearance,
    TuiBadge,
    TuiButton,
    TuiDataList,
    TuiLoader,
    TuiRange,
  ],
  template: `
    <div class="h-full w-full">
      <section class="flex flex-col w-full h-full md:p-4">
        @let isMobile = layoutService.isMobile();
        @if (topo(); as t) {
          <div class="px-4 pt-4 pb-1.5 md:p-0 md:mb-4 shrink-0">
            <app-section-header
              [title]="t.name"
              [showLike]="false"
              [titleDropdown]="topoDropdown"
              [itemCount]="sortedAreaTopos().length"
              [actions]="headerActions()"
            >
              <ng-container titleInfo>
                @if (t.legacy) {
                  <span
                    tuiBadge
                    size="s"
                    appearance="neutral"
                    class="uppercase text-[10px] shrink-0"
                  >
                    {{ 'indoor.legacy' | translate }}
                  </span>
                }
              </ng-container>

              <ng-template #topoDropdown>
                <tui-data-list>
                  @for (item of sortedAreaTopos(); track item.id) {
                    <button
                      tuiOption
                      new
                      type="button"
                      [disabled]="item.id === t.id"
                      (click.zoneless)="navigateToTopo(item)"
                    >
                      {{ item.name }}
                    </button>
                  }
                </tui-data-list>
              </ng-template>
            </app-section-header>
          </div>

          <div
            class="grid grid-cols-1 grid-rows-[minmax(0,3fr)_minmax(0,2fr)] lg:grid-cols-3 lg:grid-rows-1 w-full flex-1 min-h-0 gap-0 lg:gap-4 overflow-hidden"
          >
            <app-topo-viewer
              class="relative w-full h-full lg:col-span-2"
              [topoImage]="topoImageResource.value()"
              [topoName]="t.name"
              [renderedRoutes]="filteredRenderedTopoRoutes()"
              [hideUnselected]="true"
              [hasAccess]="true"
              [selectedRouteId]="selectedRouteId()"
              [hoveredRouteId]="hoveredRouteId()"
              (selectedRouteIdChange)="selectedRouteId.set($event)"
              (hoveredRouteIdChange)="hoveredRouteId.set($event)"
              (imageRatioChange)="imageRatio.set($event)"
            />

            <div class="flex flex-col h-full min-h-0 min-w-0 lg:col-span-1">
              <!-- Route Sliders Filters -->
              <div
                class="px-3 md:px-4 py-2 md:py-2.5 flex flex-row lg:flex-col gap-3 lg:gap-2 shrink-0 border-b border-(--tui-border-normal)"
              >
                <!-- Grade Slider -->
                <div class="flex flex-col gap-1 flex-1 min-w-0">
                  <div
                    class="flex items-center justify-between text-xs font-semibold h-5 gap-1 min-w-0"
                  >
                    <span class="truncate">{{ 'grade' | translate }}</span>
                    <div class="flex items-center gap-1.5 font-medium shrink-0">
                      @if (hasActiveGradeFilter()) {
                        <button
                          tuiIconButton
                          type="button"
                          size="xs"
                          appearance="flat-grayscale"
                          iconStart="@tui.rotate-ccw"
                          class="rounded-full!"
                          [style.--t-size.rem]="1.25"
                          [title]="'clear' | translate"
                          (click.zoneless)="resetGradeFilter()"
                        >
                          {{ 'clear' | translate }}
                        </button>
                      }
                      <div class="flex items-center gap-1 opacity-80 shrink-0">
                        <span>{{ selectedMinGradeLabel() }}</span>
                        <span>-</span>
                        <span>{{ selectedMaxGradeLabel() }}</span>
                      </div>
                    </div>
                  </div>
                  <tui-range
                    [style.--tui-thumb-size.rem]="0.75"
                    [min]="minGradeIndex"
                    [max]="maxGradeIndex"
                    [step]="1"
                    [segments]="gradeSegments"
                    [keySteps]="gradeKeySteps"
                    [attr.aria-label]="'grade' | translate"
                    [ngModel]="currentGradeRange()"
                    (ngModelChange)="onGradeRangeChange($event)"
                  />
                </div>

                <!-- Moves Slider -->
                @if (hasMovesData()) {
                  <div class="flex flex-col gap-1 flex-1 min-w-0">
                    <div
                      class="flex items-center justify-between text-xs font-semibold h-5 gap-1 min-w-0"
                    >
                      <span class="truncate">{{ 'moves' | translate }}</span>
                      <div
                        class="flex items-center gap-1.5 font-medium shrink-0"
                      >
                        @if (hasActiveMovesFilter()) {
                          <button
                            tuiIconButton
                            type="button"
                            size="xs"
                            appearance="flat-grayscale"
                            iconStart="@tui.rotate-ccw"
                            class="rounded-full!"
                            [style.--t-size.rem]="1.25"
                            [title]="'clear' | translate"
                            (click.zoneless)="resetMovesFilter()"
                          >
                            {{ 'clear' | translate }}
                          </button>
                        }
                        <div
                          class="flex items-center gap-1 opacity-80 shrink-0"
                        >
                          <span>{{ currentMovesRange()[0] }}</span>
                          <span>-</span>
                          <span>{{ currentMovesRange()[1] }}</span>
                        </div>
                      </div>
                    </div>
                    <tui-range
                      [style.--tui-thumb-size.rem]="0.75"
                      [min]="0"
                      [max]="maxPossibleMoves()"
                      [step]="1"
                      [segments]="movesSegments()"
                      [attr.aria-label]="'moves' | translate"
                      [ngModel]="currentMovesRange()"
                      (ngModelChange)="onMovesRangeChange($event)"
                    />
                  </div>
                }
              </div>

              <!-- Routes Table -->
              <app-topo-routes-table
                class="flex-1 min-h-0 min-w-0 overflow-hidden"
                [sortedTableData]="sortedTableData()"
                [columns]="columns()"
                [isMobile]="isMobile"
                [selectedRouteId]="selectedRouteId()"
                [hasAccess]="true"
                [isIndoor]="true"
                [direction]="direction()"
                [sorter]="sorter()"
                [topoId]="t.id"
                (selectedRouteIdChange)="selectedRouteId.set($event)"
                (hoveredRouteIdChange)="hoveredRouteId.set($event)"
                (sortChange)="onSortChange($event)"
              />
            </div>
          </div>
        } @else {
          <div class="flex items-center justify-center h-full">
            <tui-loader size="xxl" />
          </div>
        }
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex grow h-full overflow-hidden',
    style: 'touch-action: auto',
  },
})
export class IndoorTopoComponent extends TopoPageBase {
  protected readonly authState = inject(AuthStateService);
  protected readonly filterState = inject(FilterStateService);
  protected override readonly indoorData = inject(IndoorDataService);
  protected readonly layoutService = inject(LayoutService);
  protected readonly indoorService = inject(IndoorService);

  override isIndoor = computed(() => true);

  protected readonly topoImageResource = resource({
    params: () => {
      const t = this.topo();
      if (!t?.photo) return null;
      return { path: t.photo };
    },
    loader: async ({ params }) => {
      if (!params) return null;
      return this.supabase.getPublicUrl('indoor-assets', params.path);
    },
  });

  protected readonly canEdit = computed(() => {
    const t = this.topo();
    if (!t) return false;
    return this.authState.canEditIndoorTopo(t.indoor_center, t);
  });

  protected readonly canDraw = computed(() => {
    const t = this.topo();
    if (!t) return false;
    return this.authState.canCreateIndoorLine(t.indoor_center);
  });

  protected readonly headerActions = computed<SectionHeaderAction[]>(() => {
    const t = this.topo();
    if (!t) return [];

    const actions: SectionHeaderAction[] = [];
    const centerId = t.center_id ?? '';
    const isAdmin = this.authState.isAdmin();
    const isCenterAdmin = this.authState.isIndoorAdminOf(centerId);
    const canDelete = isAdmin || isCenterAdmin;

    if (this.canDraw()) {
      actions.push({
        label: 'draw',
        icon: '/image/topo.svg',
        appearance: 'neutral',
        action: () => this.openDrawTopo(t),
      });
    }
    if (this.canEdit()) {
      actions.push({
        label: 'edit',
        icon: '@tui.square-pen',
        appearance: 'neutral',
        action: () => this.openEditTopo(t),
      });
      if (canDelete) {
        actions.push({
          label: 'delete',
          icon: '@tui.trash',
          appearance: 'negative',
          action: () => this.deleteTopo(t),
        });
      }
    }

    return actions;
  });

  protected readonly columns = computed(() => {
    const hasMoves = this.hasMovesData();
    return ['grade', 'name', ...(hasMoves ? ['moves'] : []), 'actions'];
  });

  protected override readonly direction = signal<TuiSortDirection>(
    TuiSortDirection.Asc,
  );
  protected override readonly sorter = signal<TuiComparator<TopoRouteRow>>(
    TOPO_ROUTE_SORTERS['moves'],
  );

  protected readonly minGradeIndex = 0;
  protected readonly maxGradeIndex = ORDERED_GRADE_VALUES.length - 2;
  protected readonly gradeSegments = 8;

  protected readonly maxPossibleMoves = computed(() => {
    const routes = this.topo()?.topo_routes ?? [];
    let max = 0;
    for (const tr of routes) {
      const m = calculateRouteMoves(tr.path);
      if (m > max) max = m;
    }
    return max;
  });

  /** True if at least one route in this topo has a drawn path with moves */
  protected readonly hasMovesData = computed(() => this.maxPossibleMoves() > 0);

  protected readonly gradeKeySteps: TuiKeySteps = [
    [0, 0],
    ...Array.from({ length: this.gradeSegments - 1 }, (_, i) => {
      const percent = (100 / this.gradeSegments) * (i + 1);
      const idx = Math.round(this.maxGradeIndex * (percent / 100));
      return [percent, idx] satisfies [number, number];
    }),
    [100, this.maxGradeIndex],
  ];

  protected readonly movesSegments = computed(() => {
    const max = this.maxPossibleMoves();
    return Math.min(Math.max(max, 1), 10);
  });

  protected readonly currentGradeRange = computed<[number, number]>(() => {
    const stored = this.filterState.indoorTopoGradeRange();
    const lo = clamp(stored[0], 0, this.maxGradeIndex);
    const hi = clamp(stored[1], 0, this.maxGradeIndex);
    return [Math.min(lo, hi), Math.max(lo, hi)];
  });

  protected readonly currentMovesRange = computed<[number, number]>(() => {
    const stored = this.filterState.indoorTopoMovesRange();
    const maxMoves = this.maxPossibleMoves();
    const lo = clamp(stored[0], 0, maxMoves);
    const hi = stored[1] >= 100 ? maxMoves : clamp(stored[1], 0, maxMoves);
    return [Math.min(lo, hi), Math.max(lo, hi)];
  });

  protected readonly selectedMinGradeLabel = computed(() => {
    const [lo] = this.currentGradeRange();
    return ORDERED_GRADE_VALUES[lo] ?? '';
  });

  protected readonly selectedMaxGradeLabel = computed(() => {
    const [, hi] = this.currentGradeRange();
    return ORDERED_GRADE_VALUES[hi] ?? '';
  });

  protected readonly hasActiveGradeFilter = computed(() => {
    const gr = this.currentGradeRange();
    return gr[0] > 0 || gr[1] < this.maxGradeIndex;
  });

  protected readonly hasActiveMovesFilter = computed(() => {
    const mr = this.currentMovesRange();
    const maxMoves = this.maxPossibleMoves();
    return mr[0] > 0 || mr[1] < maxMoves;
  });

  protected onGradeRangeChange(range: [number, number]): void {
    if (!range || range.length !== 2) return;
    const lo = clamp(Math.round(range[0]), 0, this.maxGradeIndex);
    const hi = clamp(Math.round(range[1]), 0, this.maxGradeIndex);
    this.filterState.indoorTopoGradeRange.set([
      Math.min(lo, hi),
      Math.max(lo, hi),
    ]);
  }

  protected onMovesRangeChange(range: [number, number]): void {
    if (!range || range.length !== 2) return;
    const maxMoves = this.maxPossibleMoves();
    const lo = clamp(Math.round(range[0]), 0, maxMoves);
    const hi = clamp(Math.round(range[1]), 0, maxMoves);
    const savedHi = hi >= maxMoves ? 100 : hi;
    this.filterState.indoorTopoMovesRange.set([Math.min(lo, hi), savedHi]);
  }

  protected resetGradeFilter(): void {
    this.filterState.resetIndoorTopoGradeRange();
  }

  protected resetMovesFilter(): void {
    this.filterState.resetIndoorTopoMovesRange();
  }

  protected readonly tableData = computed(() => {
    const topo = this.topo();
    if (!topo) return [];
    return topo.topo_routes.map((tr) => {
      const r = tr.route;
      const climbed = !!r.own_ascent && r.own_ascent.type !== 'attempt';
      const project = !!r.project;
      const moves = calculateRouteMoves(tr.path);
      return {
        index: tr.number ?? 0,
        name: r.name,
        grade: r.grade,
        height: r.height || null,
        slug: r.slug,
        link: ['/indoor', this.centerSlug()!, 'route', r.slug],
        climbed,
        project,
        moves,
        _ref: tr,
      } as TopoRouteRow;
    });
  });

  protected readonly filteredTableData = computed(() => {
    const data = this.tableData();
    const gr = this.currentGradeRange();
    const mr = this.currentMovesRange();
    const maxMoves = this.maxPossibleMoves();

    return data.filter((item) => {
      if (mr && (mr[0] > 0 || mr[1] < maxMoves)) {
        const moves = item.moves ?? 0;
        if (moves < mr[0] || moves > mr[1]) return false;
      }
      if (gr && (gr[0] > 0 || gr[1] < this.maxGradeIndex)) {
        const gradeNum = item._ref.route?.grade;
        const gradeLabel =
          GRADE_NUMBER_TO_LABEL[gradeNum as VERTICAL_LIFE_GRADES];
        if (gradeLabel && gradeLabel !== PROJECT_GRADE_LABEL) {
          const idx = ORDERED_GRADE_VALUES.indexOf(gradeLabel);
          if (idx !== -1 && (idx < gr[0] || idx > gr[1])) {
            return false;
          }
        }
      }
      return true;
    });
  });

  protected readonly sortedTableData = computed(() => {
    const data = this.filteredTableData();
    const sorter = this.sorter();
    const direction = this.direction();
    if (!sorter) return data;
    return [...data].sort((a, b) => {
      const result = sorter(a, b);
      return direction === 1 ? result : -result;
    });
  });

  protected readonly filteredRenderedTopoRoutes = computed(() => {
    const all = this.renderedTopoRoutes();
    const gr = this.currentGradeRange();
    const mr = this.currentMovesRange();
    const maxMoves = this.maxPossibleMoves();

    return all.filter((tr) => {
      if (mr && (mr[0] > 0 || mr[1] < maxMoves)) {
        const moves = calculateRouteMoves(tr.path);
        if (moves < mr[0] || moves > mr[1]) return false;
      }

      if (gr && (gr[0] > 0 || gr[1] < this.maxGradeIndex)) {
        const gradeNum = tr.route?.grade;
        const gradeLabel =
          GRADE_NUMBER_TO_LABEL[gradeNum as VERTICAL_LIFE_GRADES];
        if (gradeLabel && gradeLabel !== PROJECT_GRADE_LABEL) {
          const idx = ORDERED_GRADE_VALUES.indexOf(gradeLabel);
          if (idx !== -1 && (idx < gr[0] || idx > gr[1])) {
            return false;
          }
        }
      }

      return true;
    });
  });

  protected async openDrawTopo(topo: TopoDetail): Promise<void> {
    if (!this.isBrowser) return;
    const photoPath = topo.photo;
    if (!photoPath) return;
    const imageUrl =
      this.topoImageResource.value() ||
      this.supabase.getPublicUrl('indoor-assets', photoPath);
    if (!imageUrl) return;

    const routes = (topo.topo_routes || []).map((tr, i) => ({
      topo_id: topo.id,
      route_id: tr.route_id,
      number: tr.number ?? i,
      route: tr.route,
      path: tr.path,
      user_creator_id: tr.user_creator_id,
    }));

    const result = await this.toposService.openTopoPathEditor({
      imageUrl,
      topoRoutes: routes as TopoRouteWithRoute[],
      topoName: topo.name,
      topoId: topo.id,
      standalone: true,
      isIndoor: true,
      centerId: topo.center_id ? String(topo.center_id) : undefined,
      center: topo.indoor_center ?? undefined,
    });

    if (result) {
      this.indoorData.topoDetailResource.reload();
      this.indoorService.reloadCenterRoutes();
    }
  }

  protected openEditTopo(topo: TopoDetail): void {
    if (!this.isBrowser) return;
    const centerId = topo.center_id as string;
    const topoId = this.id();
    if (!topoId || !centerId) return;
    this.indoorService
      .openIndoorTopoForm(centerId, {
        id: topoId,
        name: topo.name,
        image_url: topo.photo ?? '',
        climbing_kind: null,
        legacy: topo.legacy ?? false,
        center_id: centerId,
        created_at: '',
        end_date: null,
        start_date: null,
      } as IndoorTopoDto)
      .then((success: boolean) => {
        if (success) this.indoorData.topoDetailResource.reload();
      });
  }

  protected deleteTopo(topo: TopoDetail): void {
    if (!this.isBrowser) return;
    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('topos.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('topos.deleteConfirm', {
            name: topo.name,
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'primary-destructive',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then((confirmed) => {
      if (!confirmed) return;
      this.indoorService
        .deleteTopo(String(this.id()))
        .then(() => {
          this.toast.success('messages.toasts.topoDeleted');
          this.router.navigate(['/indoor', this.centerSlug()]);
        })
        .catch(() => {
          // noop
        });
    });
  }
}
