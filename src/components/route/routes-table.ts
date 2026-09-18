import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  TuiTableSortChange,
  TuiTableSortPipe,
} from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import {
  TuiButton,
  TuiDataList,
  TuiDropdown,
  TuiGroup,
  TuiHint,
  TuiIcon,
  TuiLink,
  TuiScrollbar,
  TuiCell,
  TuiInput,
} from '@taiga-ui/core';
import { TuiBadge, TuiInputNumber, TuiPin, TuiRating } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { ButtonAscentTypeComponent } from '../ascent/button-ascent-type';
import { GradeComponent } from '../ui/avatar-grade';
import { EmptyStateComponent } from '../ui/empty-state';

import {
  AscentType,
  INDOOR_ROUTE_COLORS,
  RoutesTableKey,
  RoutesTableRow,
} from '../../models';

import { IncludesIdPipe } from '../../pipes';
import { ROUTE_TABLE_SORTERS } from '../../utils';

@Component({
  selector: 'app-routes-table',
  standalone: true,
  imports: [
    ButtonAscentTypeComponent,
    EmptyStateComponent,
    FormsModule,
    GradeComponent,
    IncludesIdPipe,
    RouterLink,
    TranslatePipe,
    TuiBadge,
    TuiButton,
    TuiCell,
    TuiDataList,
    TuiDropdown,
    TuiGroup,
    TuiHint,
    TuiIcon,
    TuiInput,
    TuiInputNumber,
    TuiLink,
    TuiPin,
    TuiRating,
    TuiScrollbar,
    TuiTable,
    TuiTableTbody,
    TuiTableThGroup,
    TuiTableTh,
    TuiTableTr,
    TuiTableTd,
    TuiTableHead,
    TuiTableCell,
    TuiTableSortPipe,
    NgTemplateOutlet,
  ],
  template: `
    @if (data(); as d) {
      @if (d.length > 0) {
        @let isMobile = this.isMobile();
        <tui-scrollbar
          #scrollbar
          class="grow min-h-0 w-full overflow-x-auto no-scrollbar"
          (scroll.zoneless)="onScroll($event)"
        >
          <table
            #table
            tuiTable
            [size]="isMobile ? 's' : 'm'"
            class="w-full min-w-max"
            [class.table-stuck-left]="isStuckLeft()"
            [class.table-stuck-right]="isStuckRight()"
            [columns]="visibleColumns()"
            [direction]="currentDirection"
            [sorter]="currentSorter"
            (sortChange)="onSortChange($event)"
          >
            <thead tuiThead>
              <tr tuiThGroup>
                @for (col of visibleColumns(); track col) {
                  <th
                    *tuiHead="col"
                    tuiTh
                    [sorter]="sorters[col]"
                    [class.text-center]="col === 'actions'"
                    [class.sticky-col-left]="col === 'grade'"
                    [class.sticky-col-right]="col === 'actions'"
                    [class.w-16!]="col === 'height'"
                    [class.w-20!]="col === 'ascents'"
                    [class.w-24!]="col === 'rating' || col === 'color'"
                    [class.w-64!]="col === 'equippers'"
                    [class.min-w-36!]="col === 'route'"
                    [class.min-w-28!]="col === 'topo'"
                    [class.w-min!]="col === 'grade' || col === 'actions'"
                    class="whitespace-nowrap"
                  >
                    <div
                      class="flex items-center gap-1 w-full"
                      [class.justify-center]="col === 'actions'"
                    >
                      @if (col === 'actions') {
                        @if (canEditAny()) {
                          <button
                            appearance="action-grayscale"
                            size="xs"
                            tuiIconButton
                            type="button"
                            class="rounded-full!"
                            [iconStart]="
                              isEditing() ? '@tui.pencil-off' : '@tui.pencil'
                            "
                            [tuiHint]="
                              (isEditing() ? 'stopEditing' : 'edit') | translate
                            "
                            (click.zoneless)="isEditing.update((v) => !v)"
                          >
                            {{
                              (isEditing() ? 'stopEditing' : 'edit') | translate
                            }}
                          </button>
                        }
                      } @else if (col === 'grade') {
                        {{ 'gradeShort' | translate }}
                      } @else {
                        {{ col | translate }}
                      }
                    </div>
                  </th>
                }
              </tr>
            </thead>
            @let sortedData = d | tuiTableSort;
            <tbody tuiTbody>
              @for (item of sortedData; track item.key) {
                @let canEditRoute = item.canEdit;
                @let rowBg =
                  showRowColors()
                    ? item.climbed
                      ? (ascentInfo()[item.own_ascent?.type || 'default']
                          ?.backgroundSubtle ?? '')
                      : item.project
                        ? 'var(--tui-status-info-pale)'
                        : ''
                    : '';
                <tr
                  tuiTr
                  [style.background]="rowBg"
                  [style.--row-bg]="rowBg || null"
                >
                  @for (col of visibleColumns(); track col) {
                    <td
                      *tuiCell="col"
                      tuiTd
                      [class.text-right]="col === 'actions'"
                      [class.sticky-col-left]="col === 'grade'"
                      [class.sticky-col-right]="col === 'actions'"
                      [class.w-min!]="col === 'grade' || col === 'actions'"
                    >
                      @switch (col) {
                        @case ('grade') {
                          <div tuiCell size="m">
                            <app-grade
                              [grade]="item.gradeValue"
                              [kind]="item.climbing_kind"
                            />
                          </div>
                        }
                        @case ('route') {
                          <div tuiCell size="m">
                            <div class="flex flex-col min-w-0">
                              <div
                                class="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0"
                              >
                                <a
                                  tuiLink
                                  [routerLink]="item.link"
                                  [style.color]="
                                    item.liked
                                      ? 'var(--tui-status-negative)'
                                      : ''
                                  "
                                  class="self-start font-bold text-base truncate max-w-full w-fit block"
                                >
                                  {{ item.route || ('route' | translate) }}
                                </a>
                                @if (item.legacy) {
                                  <span
                                    tuiBadge
                                    size="s"
                                    appearance="neutral"
                                    class="uppercase text-[10px] shrink-0"
                                  >
                                    {{ 'indoor.legacy' | translate }}
                                  </span>
                                }
                              </div>
                              @if (
                                showLocation() && !isMobile && !item.isIndoor
                              ) {
                                <div
                                  class="text-xs opacity-70 flex gap-1 items-center whitespace-nowrap"
                                >
                                  <a
                                    tuiLink
                                    [routerLink]="['/area', item.area_slug]"
                                  >
                                    {{ item.area_name }}
                                  </a>
                                  <span>/</span>
                                  <a
                                    tuiLink
                                    [routerLink]="[
                                      '/area',
                                      item.area_slug,
                                      item.crag_slug || 'general',
                                    ]"
                                  >
                                    {{ item.crag_name }}
                                  </a>
                                </div>
                              }
                            </div>
                          </div>
                        }
                        @case ('height') {
                          <div tuiCell size="m" class="justify-center h-full">
                            @if (isEditing() && canEditRoute) {
                              <tui-textfield
                                [tuiTextfieldCleaner]="false"
                                tuiTextfieldSize="s"
                                [class.w-16!]="!isMobile"
                                [class.w-12!]="isMobile"
                                class="h-8! items-center"
                              >
                                <input
                                  tuiInputNumber
                                  class="text-center h-full! border-none! p-0! route-height-input"
                                  [ngModel]="item.height"
                                  (blur.zoneless)="onBlurHeight(item, $event)"
                                  (keydown.enter)="onEnterHeight(item, $event)"
                                  autocomplete="off"
                                />
                                <span
                                  class="tui-textfield__suffix flex items-center self-center"
                                  >m</span
                                >
                              </tui-textfield>
                            } @else {
                              {{ item.height ? item.height + 'm' : '-' }}
                            }
                          </div>
                        }
                        @case ('color') {
                          <div tuiCell size="m">
                            <div class="flex items-center gap-2 min-w-0">
                              @if (item.color) {
                                <div
                                  tuiPin
                                  [style.backgroundColor]="item.color"
                                  style="position: static; transform: scale(0.75); margin: 0;"
                                  class="shrink-0"
                                ></div>
                                <span class="text-sm truncate">
                                  @let colorName =
                                    item.color
                                      ? indoorRouteColors[item.color] || ''
                                      : '';
                                  @if (colorName) {
                                    {{ 'colors.' + colorName | translate }}
                                  } @else {
                                    {{ item.color }}
                                  }
                                </span>
                              } @else {
                                <span class="opacity-50 text-xs">-</span>
                              }
                            </div>
                          </div>
                        }
                        @case ('rating') {
                          <div tuiCell size="m">
                            <tui-rating
                              [max]="5"
                              [ngModel]="item.rating"
                              [readOnly]="true"
                              [style.font-size.rem]="1"
                            />
                          </div>
                        }
                        @case ('ascents') {
                          <div tuiCell size="m">
                            <span>{{ item.ascents }}</span>
                          </div>
                        }
                        @case ('topo') {
                          <div tuiCell size="m">
                            <div class="flex flex-wrap gap-1 min-w-0">
                              <div class="flex flex-wrap gap-x-1 gap-y-0">
                                @let toposCount = item.topos.length;
                                @let canAddTopo =
                                  isEditing() &&
                                  item.canAddTopo &&
                                  showAddRouteToTopo() &&
                                  availableTopos().length > 0;
                                @if (toposCount > 0) {
                                  <div tuiGroup [collapsed]="true">
                                    @for (t of item.topos; track t.id) {
                                      <a
                                        tuiButton
                                        appearance="secondary"
                                        class="min-w-fit!"
                                        size="xs"
                                        [routerLink]="t.link"
                                      >
                                        {{ t.name }}
                                      </a>
                                    }
                                    @if (canAddTopo) {
                                      <button
                                        appearance="secondary"
                                        size="xs"
                                        tuiIconButton
                                        type="button"
                                        iconStart="@tui.chevron-down"
                                        [tuiDropdown]="toposMenu"
                                        [tuiDropdownOpen]="
                                          openDropdownId() === item.key
                                        "
                                        (tuiDropdownOpenChange)="
                                          openDropdownId.set(
                                            $event ? item.key : null
                                          )
                                        "
                                      >
                                        {{ 'addRouteToTopo' | translate }}
                                      </button>
                                    }
                                  </div>
                                } @else if (canAddTopo) {
                                  <button
                                    appearance="flat-grayscale"
                                    size="xs"
                                    tuiButton
                                    type="button"
                                    class="rounded-full!"
                                    iconStart="@tui.plus"
                                    [tuiDropdown]="toposMenu"
                                    [tuiDropdownOpen]="
                                      openDropdownId() === item.key
                                    "
                                    (tuiDropdownOpenChange)="
                                      openDropdownId.set(
                                        $event ? item.key : null
                                      )
                                    "
                                  >
                                    {{ 'addRouteToTopo' | translate }}
                                  </button>
                                } @else {
                                  <span class="opacity-50 text-xs">-</span>
                                }
                                <ng-template #toposMenu>
                                  <tui-data-list>
                                    @for (
                                      topo of availableTopos();
                                      track topo.id
                                    ) {
                                      @let isAttached =
                                        item.topos | includesId: topo.id;

                                      <button
                                        tuiOption
                                        new
                                        (click)="
                                          toggleRouteOnTopo.emit({
                                            topoId: topo.id,
                                            routeId: item.id,
                                            isAttached: isAttached,
                                          });
                                          openDropdownId.set(null)
                                        "
                                      >
                                        <tui-icon
                                          [icon]="
                                            isAttached
                                              ? '@tui.check'
                                              : '@tui.image'
                                          "
                                          class="mr-2"
                                        />
                                        {{ topo.name }}
                                      </button>
                                    }
                                  </tui-data-list>
                                </ng-template>
                              </div>
                            </div>
                          </div>
                        }
                        @case ('equippers') {
                          <div
                            tuiCell
                            size="m"
                            class="h-full py-0 grow min-w-0"
                          >
                            @if (equippersTemplate(); as tpl) {
                              <ng-container
                                *ngTemplateOutlet="
                                  tpl;
                                  context: {
                                    $implicit: item,
                                    isEditing: isEditing() && canEditRoute,
                                  }
                                "
                              />
                            } @else {
                              <div class="flex flex-wrap gap-1 items-center">
                                @for (e of item.equippers; track e.id) {
                                  <a
                                    tuiLink
                                    class="text-xs bg-(--tui-background-neutral-1) hover:bg-(--tui-background-neutral-1-hover) text-(--tui-text-primary) px-2 py-0.5 rounded-md transition-colors truncate max-w-full font-medium"
                                    [routerLink]="['/equipper', e.id]"
                                  >
                                    {{ e.name }}
                                  </a>
                                } @empty {
                                  <span class="opacity-50 text-xs">-</span>
                                }
                              </div>
                            }
                          </div>
                        }
                        @case ('actions') {
                          <div
                            tuiCell
                            size="m"
                            class="flex items-center justify-end gap-1 shrink-0 whitespace-nowrap"
                          >
                            @if (item.own_ascent; as ascent) {
                              <app-button-ascent-type
                                [size]="isMobile ? 's' : 'm'"
                                [type]="ascent.type"
                                [active]="true"
                                class="cursor-pointer"
                                [tuiHint]="'ascent.view' | translate"
                                (click.zoneless)="
                                  viewAscent.emit({ row: item, ascent: ascent })
                                "
                              />
                            } @else {
                              <button
                                [size]="isMobile ? 's' : 'm'"
                                [appearance]="item.project ? 'info' : 'neutral'"
                                [iconStart]="
                                  item.project
                                    ? '@tui.bookmark'
                                    : '@tui.circle-plus'
                                "
                                tuiIconButton
                                type="button"
                                class="rounded-full!"
                                [tuiDropdown]="actionMenu"
                                tuiDropdownAlign="end"
                                [tuiDropdownMinHeight]="140"
                                [tuiDropdownOpen]="openActionId() === item.key"
                                (tuiDropdownOpenChange)="
                                  openActionId.set($event ? item.key : null)
                                "
                                (click.zoneless)="$event.stopPropagation()"
                              >
                                {{
                                  item.project
                                    ? ('project' | translate)
                                    : ('ascent.new' | translate)
                                }}
                              </button>
                            }
                            <ng-template #actionMenu>
                              <tui-data-list size="m">
                                <button
                                  tuiOption
                                  appearance="positive"
                                  class="whitespace-nowrap"
                                  (click)="
                                    logAscent.emit(item); openActionId.set(null)
                                  "
                                >
                                  <tui-icon
                                    icon="@tui.square-check"
                                    class="mr-2"
                                  />
                                  {{ 'ascent.new' | translate }}
                                </button>
                                @if (!item.isIndoor && !item.climbed) {
                                  @if (item.project) {
                                    <button
                                      tuiOption
                                      appearance="negative"
                                      class="whitespace-nowrap"
                                      (click)="
                                        toggleProject.emit(item);
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
                                        toggleProject.emit(item);
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
                          </div>
                        }
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </tui-scrollbar>
      } @else {
        <app-empty-state icon="@tui.list" />
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col min-h-0 min-w-0' },
})
export class RoutesTableComponent {
  // Inputs
  data = input<RoutesTableRow[]>([]);
  columns = input<string[]>([]);
  direction = input<TuiSortDirection>(TuiSortDirection.Desc);
  activeCol = input<RoutesTableKey>('ascents');
  showRowColors = input(true);
  showAddRouteToTopo = input(false);
  showLocation = input(false);
  isMobile = input(false);
  availableTopos = input<{ id: number | string; name: string }[]>([]);
  ascentInfo = input<Record<string, { backgroundSubtle?: string }>>({});

  // Templates
  equippersTemplate = input<TemplateRef<{
    $implicit: RoutesTableRow;
    isEditing?: boolean;
  }> | null>(null);

  // Outputs
  sortChange = output<{ key: RoutesTableKey; direction: TuiSortDirection }>();
  updateRouteHeight = output<{
    row: RoutesTableRow;
    height: number | string | null;
  }>();
  toggleRouteOnTopo = output<{
    topoId: number | string;
    routeId: number | string;
    isAttached: boolean;
  }>();
  logAscent = output<RoutesTableRow>();
  viewAscent = output<{
    row: RoutesTableRow;
    ascent: { id: number | string; type: AscentType | null };
  }>();
  toggleProject = output<RoutesTableRow>();

  readonly isEditing = signal(false);

  protected readonly canEditAny = computed(() =>
    this.data().some((item) => !!item.canEdit),
  );

  protected readonly sorters = ROUTE_TABLE_SORTERS;

  // Internal state for sorting
  protected currentSorter: TuiComparator<RoutesTableRow> =
    this.sorters[this.activeCol()];
  protected currentDirection: TuiSortDirection = this.direction();

  protected readonly openDropdownId = signal<string | null>(null);
  protected readonly openActionId = signal<string | null>(null);

  protected readonly visibleColumns = computed(() => {
    return this.columns();
  });

  protected onBlurHeight(item: RoutesTableRow, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateRouteHeight.emit({ row: item, height: input.value });
  }

  protected onEnterHeight(item: RoutesTableRow, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateRouteHeight.emit({ row: item, height: input.value });
  }

  private readonly scrollbar = viewChild('scrollbar', {
    read: ElementRef<HTMLElement>,
  });
  private readonly table = viewChild('table', {
    read: ElementRef<HTMLElement>,
  });
  private readonly destroyRef = inject(DestroyRef);
  protected readonly isStuckLeft = signal(false);
  protected readonly isStuckRight = signal(false);

  constructor() {
    effect(() => {
      this.currentDirection = this.direction();
      this.currentSorter = this.sorters[this.activeCol()];
    });

    effect(() => {
      this.data();
      this.visibleColumns();
      requestAnimationFrame(() => this.updateFromHost());
    });

    effect(() => {
      const scrollbarEl = this.scrollbar()?.nativeElement;
      const tableEl = this.table()?.nativeElement;
      if (typeof ResizeObserver === 'undefined') {
        if (scrollbarEl || tableEl) {
          requestAnimationFrame(() => this.updateFromHost());
        }
        return;
      }
      const ro = new ResizeObserver(() => this.updateFromHost());
      if (scrollbarEl) ro.observe(scrollbarEl);
      if (tableEl) ro.observe(tableEl);
      requestAnimationFrame(() => this.updateFromHost());
      this.destroyRef.onDestroy(() => ro.disconnect());
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
      if (this.isStuckLeft()) this.isStuckLeft.set(false);
      if (this.isStuckRight()) this.isStuckRight.set(false);
      return;
    }

    const stuckLeft = scrollLeft > 2;
    const stuckRight = maxScroll - scrollLeft > 2;

    if (this.isStuckLeft() !== stuckLeft) {
      this.isStuckLeft.set(stuckLeft);
    }
    if (this.isStuckRight() !== stuckRight) {
      this.isStuckRight.set(stuckRight);
    }
  }

  protected readonly indoorRouteColors = INDOOR_ROUTE_COLORS;

  protected onSortChange(sort: TuiTableSortChange<RoutesTableRow>): void {
    if (!sort) return;
    this.currentSorter = sort.sortComparator || (() => 0);
    this.currentDirection = sort.sortDirection;
    // Emitting sortChange is helpful for parent wrappers to track active col / direction
    this.sortChange.emit({
      key: this.activeCol(), // wrapper can use activeCol or computed col
      direction: sort.sortDirection,
    });
  }
}
