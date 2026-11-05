import {
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
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
  TuiScrollbar,
} from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../../services/ascents.service';
import { RoutesService } from '../../services/routes.service';

import { type TopoRouteWithRoute } from '../../models';

import { TableSorterPipe } from '../../pipes';

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
    TableSorterPipe,
    TranslatePipe,
    TuiButton,
    TuiDataList,
    TuiDropdown,
    TuiHint,
    TuiIcon,
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
      <tui-scrollbar
        #scrollbar
        class="grow min-h-0 w-full overflow-x-auto no-scrollbar"
        (scroll.zoneless)="onScroll($event)"
      >
        @if (hasAccess()) {
          @let sortedData = sortedTableData();
          @if (sortedData.length > 0) {
            <table
              #table
              tuiTable
              [size]="isMobile() ? 's' : 'm'"
              class="w-full min-w-max"
              [class.table-stuck-right]="isStuckRight()"
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
                      [class.sticky-col-right]="col === 'actions'"
                      [class.w-16!]="col === 'height' || col === 'moves'"
                      [class.min-w-36!]="col === 'name'"
                      [class.w-min!]="
                        col === 'index' || col === 'grade' || col === 'actions'
                      "
                      class="text-center whitespace-nowrap"
                    >
                      <div
                        class="flex items-center justify-center w-full h-full min-w-0"
                      >
                        @switch (col) {
                          @case ('index') {
                            #
                          }
                          @case ('name') {
                            {{ 'routes.name' | translate }}
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
              <tbody tuiTbody>
                @for (
                  item of sortedData;
                  track item._ref.topo_id + '-' + item._ref.route_id;
                  let i = $index
                ) {
                  @let bgSubtle =
                    ascentInfo()[item._ref.route.own_ascent?.type || 'default']
                      ?.backgroundSubtle;
                  @let rowBg =
                    item.climbed
                      ? bgSubtle && bgSubtle !== 'transparent'
                        ? bgSubtle
                        : 'var(--tui-status-positive-pale)'
                      : item.project
                        ? 'var(--tui-status-info-pale)'
                        : '';
                  @let isSelected = item._ref.route_id === selectedRouteId();
                  <tr
                    #routeRow
                    tuiTr
                    [id]="
                      'route-row-' +
                      item._ref.topo_id +
                      '-' +
                      item._ref.route_id
                    "
                    [class.outline-2]="isSelected"
                    [class.outline-[var(--tui-border-focus)]]="isSelected"
                    [class.-outline-offset-1]="isSelected"
                    [class.selected-row]="isSelected"
                    [style.background]="rowBg"
                    [style.--row-bg]="rowBg || null"
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
                        [class.selected-actions-col]="
                          isSelected && col === 'actions'
                        "
                        [class.w-min!]="
                          col === 'index' ||
                          col === 'grade' ||
                          col === 'actions'
                        "
                        class="text-center whitespace-nowrap"
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
                              class="flex items-center justify-between gap-1.5 h-full w-full"
                            >
                              <div class="flex items-center gap-1">
                                <span
                                  class="text-left whitespace-nowrap font-medium"
                                >
                                  {{ item.name }}
                                </span>
                                @if (isSelected) {
                                  <a
                                    tuiIconButton
                                    [routerLink]="item.link"
                                    iconStart="@tui.arrow-up-right"
                                    appearance="flat-grayscale"
                                    size="xs"
                                    class="rounded-full! shrink-0 opacity-70 hover:opacity-100! focus-visible:opacity-100! transition-opacity"
                                    [tuiHint]="'view' | translate"
                                    (click.zoneless)="$event.stopPropagation()"
                                  >
                                    {{ 'view' | translate }}
                                  </a>
                                }
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
                              class="flex items-center justify-center gap-1 shrink-0 whitespace-nowrap w-full h-full"
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
                }
              </tbody>
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
})
export class TopoRoutesTableComponent {
  private readonly ascentsService = inject(AscentsService);
  private readonly routesService = inject(RoutesService);

  protected readonly ascentInfo = this.ascentsService.ascentInfo;

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
  protected readonly isStuckRight = signal(false);

  private readonly scrollbar = viewChild('scrollbar', {
    read: ElementRef<HTMLElement>,
  });
  private readonly table = viewChild('table', {
    read: ElementRef<HTMLElement>,
  });

  selectedRouteIdChange = output<string | number | null>();
  hoveredRouteIdChange = output<string | number | null>();
  sortChange = output<TuiTableSortChange<TopoRouteRow>>();

  constructor() {
    effect(() => {
      const routeId = this.selectedRouteId();
      if (!routeId) return;
      queueMicrotask(() => {
        const row = document.getElementById(
          `route-row-${this.topoId()}-${routeId}`,
        );
        if (!row) return;
        const scrollbarEl = this.scrollbar()?.nativeElement;
        if (scrollbarEl) {
          const rowRect = row.getBoundingClientRect();
          const containerRect = scrollbarEl.getBoundingClientRect();
          const targetTop =
            scrollbarEl.scrollTop +
            (rowRect.top - containerRect.top) -
            containerRect.height / 2 +
            rowRect.height / 2;
          scrollbarEl.scrollTo?.({ top: targetTop, behavior: 'smooth' });
        } else {
          row.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      });
    });

    effect((onCleanup) => {
      const scrollbarEl = this.scrollbar()?.nativeElement;
      const tableEl = this.table()?.nativeElement;
      let animationFrame: number | undefined;
      const scheduleUpdate = () => {
        if (typeof requestAnimationFrame === 'undefined') {
          this.updateFromHost();
          return;
        }
        animationFrame = requestAnimationFrame(() => this.updateFromHost());
      };

      if (typeof ResizeObserver === 'undefined') {
        if (scrollbarEl || tableEl) {
          scheduleUpdate();
        }
        onCleanup(() => {
          if (
            animationFrame !== undefined &&
            typeof cancelAnimationFrame !== 'undefined'
          ) {
            cancelAnimationFrame(animationFrame);
          }
        });
        return;
      }
      const ro = new ResizeObserver(() => this.updateFromHost());
      if (scrollbarEl) ro.observe(scrollbarEl);
      if (tableEl) ro.observe(tableEl);
      scheduleUpdate();
      onCleanup(() => {
        ro.disconnect();
        if (
          animationFrame !== undefined &&
          typeof cancelAnimationFrame !== 'undefined'
        ) {
          cancelAnimationFrame(animationFrame);
        }
      });
    });
  }

  protected onScroll(event: Event): void {
    this.updateStuck(event.target as HTMLElement);
  }

  private updateFromHost(): void {
    const el = this.scrollbar()?.nativeElement;
    if (el) this.updateStuck(el);
  }

  private updateStuck(el: HTMLElement): void {
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;

    if (maxScroll <= 1) {
      if (this.isStuckRight()) this.isStuckRight.set(false);
      return;
    }

    const stuckRight = maxScroll - scrollLeft > 2;

    if (this.isStuckRight() !== stuckRight) {
      this.isStuckRight.set(stuckRight);
    }
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
