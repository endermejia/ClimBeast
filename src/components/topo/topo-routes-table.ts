import {
  ChangeDetectionStrategy,
  Component,
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
  TuiHint,
  TuiIcon,
  TuiLink,
  TuiScrollbar,
} from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../../services/ascents.service';
import { RoutesService } from '../../services/routes.service';

import { type TopoRouteWithRoute } from '../../models';

import { AscentInfoPipe, TableSorterPipe } from '../../pipes';

import { ButtonAscentTypeComponent } from '../ascent/button-ascent-type';
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
    ButtonAscentTypeComponent,
    EmptyStateComponent,
    GradeComponent,
    PaywallComponent,
    RouterLink,
    AscentInfoPipe,
    TableSorterPipe,
    TranslatePipe,
    TuiButton,
    TuiDataList,
    TuiDropdown,
    TuiHint,
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
                      [class.sticky-col-right]="col === 'actions'"
                      class="text-center"
                    >
                      <div
                        class="flex items-center justify-center w-full h-full min-w-0"
                      >
                        @switch (col) {
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
                    class="group cursor-pointer"
                    (mouseenter)="hoveredRouteIdChange.emit(item._ref.route_id)"
                    (mouseleave)="hoveredRouteIdChange.emit(null)"
                    (click)="selectRoute(item._ref.route_id)"
                  >
                    @for (col of columns(); track col) {
                      <td
                        *tuiCell="col"
                        tuiTd
                        [class.sticky-col-right]="col === 'actions'"
                        class="overflow-hidden text-center"
                      >
                        @switch (col) {
                          @case ('index') {
                            <div
                              class="flex items-center justify-center w-full h-full min-w-0"
                            >
                              {{ item.index + 1 }}
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
                                  class="text-left truncate max-w-full w-fit block"
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
                                @if (isIndoor()) {
                                  <button
                                    tuiIconButton
                                    type="button"
                                    [size]="isMobile() ? 's' : 'm'"
                                    appearance="neutral"
                                    iconStart="@tui.circle-plus"
                                    class="rounded-full!"
                                    [tuiHint]="'ascent.new' | translate"
                                    (click.zoneless)="
                                      onLogAscent(item._ref);
                                      $event.stopPropagation()
                                    "
                                  >
                                    {{ 'ascent.new' | translate }}
                                  </button>
                                } @else {
                                  <button
                                    tuiIconButton
                                    type="button"
                                    [size]="isMobile() ? 's' : 'm'"
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
                                    tuiDropdownAlign="end"
                                    [tuiDropdownMinHeight]="140"
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
                                    <tui-data-list size="m">
                                      <button
                                        tuiOption
                                        appearance="positive"
                                        class="whitespace-nowrap"
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
                                      @if (item.project) {
                                        <button
                                          tuiOption
                                          appearance="negative"
                                          class="whitespace-nowrap"
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
                                          class="whitespace-nowrap"
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
                                    </tui-data-list>
                                  </ng-template>
                                }
                              } @else if (
                                item._ref.route.own_ascent;
                                as ascentToEdit
                              ) {
                                <app-button-ascent-type
                                  [size]="isMobile() ? 's' : 'm'"
                                  [type]="ascentToEdit.type"
                                  [active]="true"
                                  class="cursor-pointer"
                                  [tuiHint]="'ascent.view' | translate"
                                  (click.zoneless)="
                                    onViewAscent(ascentToEdit);
                                    $event.stopPropagation()
                                  "
                                />
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

  protected readonly openActionId = signal<string | number | null>(null);

  selectedRouteIdChange = output<string | number | null>();
  hoveredRouteIdChange = output<string | number | null>();
  sortChange = output<TuiTableSortChange<TopoRouteRow>>();

  /** Fixed pixel widths per column. Name is absent → TuiTh uses auto sizing. */
  protected readonly COL_MIN_PX: Record<string, number> = {
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
