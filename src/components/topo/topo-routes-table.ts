import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  TuiSortDirection,
  TuiTable,
  TuiTableTbody,
  TuiTableThGroup,
  TuiTableTh,
  TuiTableTr,
  TuiTableTd,
  TuiTableHead,
  TuiTableCell,
} from '@taiga-ui/addon-table';
import type { TuiTableSortChange } from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import {
  TuiButton,
  TuiDataList,
  TuiDropdown,
  TuiIcon,
  TuiLink,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../../services/ascents.service';
import { RoutesService } from '../../services/routes.service';

import { type TopoRouteWithRoute } from '../../models';

import {
  AscentInfoPipe,
  TableSorterPipe,
  TopoIsRouteVisiblePipe,
  TopoRouteVisibilityStatePipe,
} from '../../pipes';

import { PaywallComponent } from '../paywall/paywall';
import { GradeComponent } from '../ui/avatar-grade';
import { EmptyStateComponent } from '../ui/empty-state';
import type { TopoRouteRow } from './topo.types';

@Component({
  selector: 'app-topo-routes-table',
  standalone: true,
  host: {
    class: 'block w-full h-full min-w-0 min-h-0 overflow-hidden',
  },
  imports: [
    EmptyStateComponent,
    GradeComponent,
    PaywallComponent,
    RouterLink,
    AscentInfoPipe,
    TableSorterPipe,
    TopoIsRouteVisiblePipe,
    TopoRouteVisibilityStatePipe,
    TranslatePipe,
    TuiAvatar,
    TuiButton,
    TuiDataList,
    TuiDropdown,
    TuiIcon,
    TuiLink,
    TuiScrollbar,
    TuiTable,
    TuiTableTbody,
    TuiTableThGroup,
    TuiTableTh,
    TuiTableTr,
    TuiTableTd,
    TuiTableHead,
    TuiTableCell,
  ],
  template: `
    <div
      class="w-full h-full min-w-0 min-h-0 overflow-hidden px-1 sm:px-4 md:px-0 focus:outline-none"
      tabindex="0"
      (keydown)="onTableKeyDown($event)"
    >
      <tui-scrollbar class="w-full h-full overflow-x-hidden!">
        @if (hasAccess()) {
          @let sortedData = sortedTableData();
          @if (sortedData.length > 0) {
            <table
              tuiTable
              [size]="isMobile() ? 's' : 'm'"
              class="w-full"
              [columns]="columns()"
              [direction]="direction()"
              [sorter]="sorter()"
              (sortChange)="onSortChange($event)"
            >
              <thead tuiThead>
                <tr tuiThGroup>
                  @for (col of columns(); track col) {
                    <th
                      *tuiHead="col"
                      tuiTh
                      [sorter]="col | tableSorter"
                      [style.min-width.px]="isMobile() ? null : COL_MIN_PX[col]"
                      [style.max-width.px]="isMobile() ? null : COL_MIN_PX[col]"
                      class="text-center"
                      [class.p-0!]="col === 'visibility'"
                    >
                      <div
                        class="flex items-center justify-center w-full h-full min-w-0"
                      >
                        @switch (col) {
                          @case ('visibility') {
                            <button
                              tuiIconButton
                              type="button"
                              size="xs"
                              class="rounded-full! shrink-0"
                              [appearance]="
                                isAllRoutesHidden() ? 'flat-grayscale' : 'flat'
                              "
                              [iconStart]="
                                isAllRoutesHidden()
                                  ? '@tui.eye-off'
                                  : '@tui.eye'
                              "
                              [title]="
                                (!isAllRoutesVisible() ? 'showAll' : 'hideAll')
                                  | translate
                              "
                              (click.zoneless)="
                                onToggleAllRoutesVisibility($event)
                              "
                            >
                              {{
                                (!isAllRoutesVisible() ? 'showAll' : 'hideAll')
                                  | translate
                              }}
                            </button>
                          }
                          @case ('index') {
                            #
                          }
                          @case ('name') {
                            <span class="truncate">
                              {{ 'routes.name' | translate }}
                            </span>
                          }
                          @case ('grade') {
                            {{ 'gradeShort' | translate }}
                          }
                          @case ('height') {
                            {{ 'routes.height' | translate }}
                          }
                          @case ('moves') {
                            {{ 'movesShort' | translate }}
                          }
                        }
                      </div>
                    </th>
                  }
                </tr>
              </thead>
              @for (
                item of sortedTableData();
                track item._ref.topo_id + '-' + item._ref.route_id;
                let i = $index
              ) {
                <tbody tuiTbody>
                  <tr
                    #routeRow
                    tuiTr
                    [id]="
                      'route-row-' +
                      item._ref.topo_id +
                      '-' +
                      item._ref.route_id
                    "
                    [class.outline-2]="item._ref.route_id === selectedRouteId()"
                    [class.outline-[var(--tui-border-focus)]]="
                      item._ref.route_id === selectedRouteId()
                    "
                    [class.-outline-offset-1]="
                      item._ref.route_id === selectedRouteId()
                    "
                    [style.background]="
                      item.climbed
                        ? (item._ref.route.own_ascent?.type | ascentInfo)
                            .backgroundSubtle
                        : item.project
                          ? 'var(--tui-status-info-pale)'
                          : ''
                    "
                    [class.opacity-50]="
                      isIndoor() &&
                      !(
                        item._ref.route_id
                        | topoIsRouteVisible: hiddenRouteIds()
                      )
                    "
                    class="group cursor-pointer"
                    (mouseenter)="hoveredRouteIdChange.emit(item._ref.route_id)"
                    (mouseleave)="hoveredRouteIdChange.emit(null)"
                    (click)="selectRoute(item._ref.route_id)"
                  >
                    @for (col of columns(); track col) {
                      <td
                        *tuiCell="col"
                        tuiTd
                        class="overflow-hidden text-center"
                        [class.p-0!]="col === 'visibility'"
                      >
                        @switch (col) {
                          @case ('index') {
                            <div
                              class="flex items-center justify-center w-full h-full min-w-0"
                            >
                              {{ item.index + 1 }}
                            </div>
                          }
                          @case ('visibility') {
                            <div
                              class="flex items-center justify-center w-full h-full min-w-0"
                            >
                              @let visState =
                                item._ref.route_id
                                  | topoRouteVisibilityState
                                    : hiddenRouteIds()
                                    : sortedTableData().length;
                              <button
                                tuiIconButton
                                type="button"
                                size="xs"
                                class="rounded-full! shrink-0"
                                [appearance]="
                                  visState === 'solo'
                                    ? 'accent'
                                    : visState === 'hidden'
                                      ? 'flat-grayscale'
                                      : 'flat'
                                "
                                [iconStart]="
                                  visState === 'hidden'
                                    ? '@tui.eye-off'
                                    : visState === 'solo'
                                      ? '@tui.scan-eye'
                                      : '@tui.eye'
                                "
                                [title]="
                                  (visState === 'visible'
                                    ? 'showOnly'
                                    : visState === 'solo'
                                      ? 'hide'
                                      : 'show'
                                  ) | translate
                                "
                                (click.zoneless)="
                                  onToggleRouteVisibility(
                                    item._ref.route_id,
                                    $event
                                  );
                                  $event.stopPropagation()
                                "
                              >
                                {{
                                  (visState === 'visible'
                                    ? 'showOnly'
                                    : visState === 'solo'
                                      ? 'hide'
                                      : 'show'
                                  ) | translate
                                }}
                              </button>
                            </div>
                          }
                          @case ('name') {
                            <div
                              class="flex items-center justify-between gap-1.5 h-full min-w-0 w-full"
                            >
                              <div
                                class="flex items-center gap-1.5 min-w-0 flex-1"
                              >
                                <a
                                  tuiLink
                                  [routerLink]="item.link"
                                  class="text-left truncate block w-full"
                                >
                                  {{ item.name }}
                                </a>
                              </div>
                              @if (
                                isIndoor() &&
                                !columns().includes('moves') &&
                                item.moves !== undefined
                              ) {
                                <span
                                  class="text-xs opacity-60 shrink-0 font-medium"
                                >
                                  {{ item.moves }} {{ 'moves' | translate }}
                                </span>
                              }
                            </div>
                          }
                          @case ('grade') {
                            <div
                              class="flex items-center justify-center w-full h-full min-w-0"
                            >
                              <app-grade
                                [grade]="item.grade"
                                [kind]="item._ref.route.climbing_kind"
                                [size]="isMobile() ? 's' : 'l'"
                              />
                            </div>
                          }
                          @case ('height') {
                            <div
                              class="flex items-center justify-center w-full h-full min-w-0"
                            >
                              {{ item.height ? item.height + 'm' : '-' }}
                            </div>
                          }
                          @case ('moves') {
                            <div
                              class="flex items-center justify-center w-full h-full min-w-0"
                            >
                              {{ item.moves ?? '-' }}
                            </div>
                          }
                          @case ('actions') {
                            <div
                              class="flex items-center justify-center gap-1 w-full h-full min-w-0"
                            >
                              @if (!item.climbed) {
                                <button
                                  tuiIconButton
                                  [size]="isMobile() ? 'xs' : 'm'"
                                  [appearance]="
                                    item.project ? 'info' : 'neutral'
                                  "
                                  [iconStart]="
                                    item.project
                                      ? '@tui.bookmark'
                                      : '@tui.circle-plus'
                                  "
                                  class="rounded-full!"
                                  [tuiDropdown]="actionMenu"
                                  [tuiDropdownOpen]="
                                    openActionId() === item._ref.route_id
                                  "
                                  (tuiDropdownOpenChange)="
                                    openActionId.set(
                                      $event ? item._ref.route_id : null
                                    )
                                  "
                                  (click.zoneless)="$event.stopPropagation()"
                                >
                                  {{
                                    item.project
                                      ? ('project' | translate)
                                      : ('ascent.new' | translate)
                                  }}
                                </button>
                                <ng-template #actionMenu>
                                  <tui-data-list>
                                    <button
                                      tuiOption
                                      appearance="positive"
                                      (click)="
                                        onLogAscent(item._ref);
                                        openActionId.set(null)
                                      "
                                    >
                                      <tui-icon
                                        icon="@tui.square-check"
                                        class="mr-2"
                                      />
                                      {{ 'ascent.new' | translate }}
                                    </button>
                                    @if (!isIndoor()) {
                                      @if (item.project) {
                                        <button
                                          tuiOption
                                          appearance="negative"
                                          (click)="
                                            onToggleProject(item);
                                            openActionId.set(null)
                                          "
                                        >
                                          <tui-icon
                                            icon="@tui.bookmark"
                                            class="mr-2"
                                          />
                                          {{ 'project.remove' | translate }}
                                        </button>
                                      } @else {
                                        <button
                                          tuiOption
                                          appearance="info"
                                          (click)="
                                            onToggleProject(item);
                                            openActionId.set(null)
                                          "
                                        >
                                          <tui-icon
                                            icon="@tui.bookmark"
                                            class="mr-2"
                                          />
                                          {{ 'project.add' | translate }}
                                        </button>
                                      }
                                    }
                                  </tui-data-list>
                                </ng-template>
                              } @else if (
                                item._ref.route.own_ascent;
                                as ascentToEdit
                              ) {
                                <span
                                  tuiAvatar
                                  class="cursor-pointer text-(--tui-text-primary-on-accent-1)!"
                                  [style.background]="
                                    (ascentToEdit?.type | ascentInfo).background
                                  "
                                  tabindex="0"
                                  (click.zoneless)="
                                    onViewAscent(ascentToEdit);
                                    $event.stopPropagation()
                                  "
                                  (keydown.enter)="
                                    onViewAscent(ascentToEdit);
                                    $event.stopPropagation()
                                  "
                                >
                                  <tui-icon
                                    [icon]="
                                      (ascentToEdit?.type | ascentInfo).icon
                                    "
                                  />
                                </span>
                              }
                            </div>
                          }
                        }
                      </td>
                    }
                  </tr>
                </tbody>
              }
            </table>
          } @else {
            <app-empty-state icon="@tui.route" />
          }
        } @else {
          <div class="flex h-full items-center justify-center p-4">
            <app-paywall
              [areaId]="areaId()"
              [price]="areaPrice()"
              [hideTitle]="true"
            />
          </div>
        }
      </tui-scrollbar>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopoRoutesTableComponent {
  private readonly ascentsService = inject(AscentsService);
  private readonly routesService = inject(RoutesService);

  sortedTableData = input.required<TopoRouteRow[]>();
  columns = input.required<string[]>();
  isMobile = input(false);
  selectedRouteId = input<string | number | null>(null);
  hasAccess = input(false);
  isIndoor = input(false);
  direction = input<TuiSortDirection>(TuiSortDirection.Asc);
  sorter = input.required<TuiComparator<TopoRouteRow>>();
  topoId = input.required<string | number>();
  areaId = input(0);
  areaPrice = input(0);
  hiddenRouteIds = input<Set<string | number>>(new Set());

  protected readonly openActionId = signal<string | number | null>(null);

  selectedRouteIdChange = output<string | number | null>();
  hoveredRouteIdChange = output<string | number | null>();
  sortChange = output<TuiTableSortChange<TopoRouteRow>>();
  toggleRouteVisibility = output<{
    routeId: string | number;
    isAlt?: boolean;
  }>();
  toggleAllRoutesVisibility = output<void>();

  protected readonly isAllRoutesHidden = computed(() => {
    const data = this.sortedTableData();
    if (data.length === 0) return false;
    const hidden = this.hiddenRouteIds();
    if (!hidden) return false;
    if (hidden instanceof Set) {
      return data.every((r) => hidden.has(r._ref.route_id));
    }
    return data.every((r) =>
      (hidden as (string | number)[]).includes(r._ref.route_id),
    );
  });

  protected readonly isAllRoutesVisible = computed(() => {
    const hidden = this.hiddenRouteIds();
    return (
      !hidden ||
      (hidden instanceof Set
        ? hidden.size === 0
        : (hidden as (string | number)[]).length === 0)
    );
  });

  /** Fixed pixel widths per column. Name is absent → TuiTh uses auto sizing. */
  protected readonly COL_MIN_PX: Record<string, number> = {
    visibility: 40,
    index: 44,
    grade: 68,
    moves: 60,
    height: 68,
    actions: 44,
  };

  constructor() {
    effect(() => {
      const routeId = this.selectedRouteId();
      if (!routeId) return;
      queueMicrotask(() => {
        const row = document.getElementById(
          `route-row-${this.topoId()}-${routeId}`,
        );
        if (!row) return;
        row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    });
  }

  protected selectRoute(routeId: string | number): void {
    this.selectedRouteIdChange.emit(
      this.selectedRouteId() === routeId ? null : routeId,
    );
  }

  protected onSortChange(event: TuiTableSortChange<TopoRouteRow>): void {
    this.sortChange.emit(event);
  }

  protected onToggleRouteVisibility(
    routeId: string | number,
    event: Event,
  ): void {
    const isAlt = event instanceof MouseEvent ? event.altKey : false;
    this.toggleRouteVisibility.emit({ routeId, isAlt });
  }

  protected onToggleAllRoutesVisibility(event: Event): void {
    event.stopPropagation();
    this.toggleAllRoutesVisibility.emit();
  }

  protected onLogAscent(tr: TopoRouteWithRoute): void {
    void firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: tr.route.id,
        routeName: tr.route.name,
        grade: tr.route.grade,
        climbingKind: tr.route.climbing_kind,
        isIndoor: this.isIndoor(),
      }),
      { defaultValue: undefined },
    );
  }

  protected onViewAscent(
    ascent: NonNullable<TopoRouteRow['_ref']['route']['own_ascent']>,
  ): void {
    this.ascentsService.viewAscent(ascent.id);
  }

  protected async onToggleProject(item: TopoRouteRow): Promise<void> {
    const routeToSync = {
      ...item._ref.route,
      id: item._ref.route.id as number,
      project: !!item._ref.route.project,
    };
    await this.routesService.toggleRouteProject(
      item._ref.route_id as number,
      routeToSync,
    );
  }

  protected onTableKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    )
      return;
    if (['ArrowUp', 'ArrowDown'].includes(event.key)) {
      const data = this.sortedTableData();
      if (data.length === 0) return;
      const step = event.key === 'ArrowUp' ? -1 : 1;
      const currentId = this.selectedRouteId();
      let nextIndex = 0;
      if (currentId) {
        const currentIndex = data.findIndex(
          (item) => item?._ref?.route_id === currentId,
        );
        if (currentIndex !== -1) {
          nextIndex = (currentIndex + step + data.length) % data.length;
        }
      }
      const nextItem = data[nextIndex];
      if (nextItem?._ref) {
        this.selectedRouteIdChange.emit(nextItem._ref.route_id);
        event.preventDefault();
      }
    }
  }
}
