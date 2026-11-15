import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectorRef,
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
import { TuiIdentityMatcher, tuiIsString } from '@taiga-ui/cdk';
import {
  TuiButton,
  TuiCell,
  TuiDataList,
  TuiDropdown,
  TuiFilterByInputPipe,
  TuiGroup,
  TuiHint,
  TuiIcon,
  TuiInput,
  TuiLink,
  TuiScrollbar,
} from '@taiga-ui/core';
import {
  TuiBadge,
  TuiChevron,
  TuiDataListWrapper,
  TuiInputChip,
  TuiInputNumber,
  TuiMultiSelect,
  TuiPin,
  TuiRating,
  TuiSelect,
} from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import {
  AscentType,
  INDOOR_ROUTE_COLORS,
  RoutesTableKey,
  RoutesTableRow,
} from '../../models';

import { matchesQuery, normalizeName, ROUTE_TABLE_SORTERS } from '../../utils';

import { AscentCountDirective } from '../../directives/ascent-count.directive';

import { ButtonAscentTypeComponent } from '../ascent/button-ascent-type';
import { GradeComponent } from '../ui/avatar-grade';

import { EmptyStateComponent } from '../ui/empty-state';

@Component({
  selector: 'app-routes-table',
  standalone: true,
  imports: [
    AscentCountDirective,
    ButtonAscentTypeComponent,
    EmptyStateComponent,
    FormsModule,
    GradeComponent,
    RouterLink,
    TranslatePipe,
    TuiBadge,
    TuiButton,
    TuiCell,
    TuiChevron,
    TuiDataList,
    TuiDataListWrapper,
    TuiDropdown,
    TuiFilterByInputPipe,
    TuiGroup,
    TuiHint,
    TuiIcon,
    TuiInput,
    TuiInputChip,
    TuiInputNumber,
    TuiLink,
    TuiMultiSelect,
    TuiPin,
    TuiRating,
    TuiScrollbar,
    TuiSelect,
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
                    [attr.data-col]="col"
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
                            (click.zoneless)="toggleEditing()"
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
            @let sel = selectedCell();
            @let editColsMap = editableColumnsMap();
            @let cragIdsMap = cragIdByRowKey();
            @let toposByRow = availableToposByRowKey();
            @let selectedToposMap = selectedToposByRowKey();
            <tbody tuiTbody>
              @for (item of sortedData; track item.key) {
                @let canEditRoute = item.canEdit;
                @let isRowSelected = isEditing() && sel?.rowKey === item.key;
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
                    @let isCellActive = isRowSelected && sel?.col === col;
                    <td
                      *tuiCell="col"
                      tuiTd
                      [attr.data-col]="col"
                      [attr.data-row-key]="item.key"
                      [attr.tabindex]="isCellActive ? -1 : null"
                      [class.text-right]="col === 'actions'"
                      [class.sticky-col-left]="col === 'grade'"
                      [class.sticky-col-right]="col === 'actions'"
                      [class.w-min!]="col === 'grade' || col === 'actions'"
                      [class.cell-selected]="isCellActive"
                      [class.cursor-pointer]="
                        isEditing() &&
                        editColsMap[col] &&
                        canEditRoute &&
                        !isCellActive
                      "
                      (click.zoneless)="onCellClick(item, col, $event)"
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
                          <div tuiCell size="m" class="h-full">
                            @if (isCellActive && canEditRoute) {
                              <tui-textfield
                                [tuiTextfieldCleaner]="false"
                                tuiTextfieldSize="s"
                                class="h-full! w-full! items-center"
                              >
                                <input
                                  tuiInput
                                  class="h-full! border-none! px-3! py-0! text-sm font-bold route-name-input"
                                  [ngModel]="item.route"
                                  (blur)="onBlurRouteName(item, $event)"
                                  (keydown.enter)="
                                    onEnterRouteName(item, $event)
                                  "
                                  autocomplete="off"
                                />
                              </tui-textfield>
                            } @else {
                              <div class="flex flex-col min-w-0">
                                <div
                                  class="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0"
                                >
                                  <a
                                    tuiLink
                                    [routerLink]="
                                      isEditing() ? null : item.link
                                    "
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
                                      [routerLink]="
                                        isEditing()
                                          ? null
                                          : ['/area', item.area_slug]
                                      "
                                    >
                                      {{ item.area_name }}
                                    </a>
                                  </div>
                                }
                              </div>
                            }
                          </div>
                        }
                        @case ('crag') {
                          <div tuiCell size="m" class="h-full">
                            @if (
                              isCellActive &&
                              canEditRoute &&
                              availableCrags().length > 0
                            ) {
                              <tui-textfield
                                tuiChevron
                                [tuiTextfieldCleaner]="false"
                                [stringify]="cragStringify"
                                tuiTextfieldSize="s"
                                class="h-full! w-full! items-center"
                              >
                                <input
                                  tuiSelect
                                  class="h-full! border-none! crag-select text-sm"
                                  [ngModel]="cragIdsMap[item.key]"
                                  (ngModelChange)="onSelectCrag(item, $event)"
                                  autocomplete="off"
                                />
                                <tui-data-list-wrapper
                                  *tuiDropdown
                                  new
                                  [items]="availableCragIds()"
                                />
                              </tui-textfield>
                            } @else {
                              @if (item.crag_name) {
                                <a
                                  tuiLink
                                  [routerLink]="
                                    isEditing()
                                      ? null
                                      : [
                                          '/area',
                                          item.area_slug,
                                          item.crag_slug || 'general',
                                        ]
                                  "
                                  class="text-sm truncate max-w-full"
                                >
                                  {{ item.crag_name }}
                                </a>
                              } @else {
                                <span class="opacity-50 text-xs">-</span>
                              }
                            }
                          </div>
                        }
                        @case ('height') {
                          <div tuiCell size="m" class="justify-center h-full">
                            @if (isCellActive && canEditRoute) {
                              <tui-textfield
                                [tuiTextfieldCleaner]="false"
                                tuiTextfieldSize="s"
                                class="h-full! w-full! items-center"
                              >
                                <input
                                  tuiInputNumber
                                  class="text-center h-full! border-none! p-0! route-height-input"
                                  [ngModel]="item.height"
                                  (blur)="onBlurHeight(item, $event)"
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
                            <span [appAscentCount]="item.ascents"></span>
                          </div>
                        }
                        @case ('topo') {
                          <div tuiCell size="m" class="h-full">
                            @let toposForCrag = toposByRow[item.key] || [];
                            @if (isCellActive && canEditRoute) {
                              <tui-textfield
                                multi
                                tuiChevron
                                tuiTextfieldSize="s"
                                [tuiTextfieldCleaner]="false"
                                [stringify]="topoStringify"
                                [disabledItemHandler]="strings"
                                [identityMatcher]="topoIdentityMatcher"
                                class="h-full! w-full! items-center border-none! bg-transparent!"
                              >
                                <input
                                  #tuiDropdownHost
                                  tuiInputChip
                                  class="topo-multiselect"
                                  [ngModel]="selectedToposMap[item.key]"
                                  (ngModelChange)="onToposChange(item, $event)"
                                  (keydown.enter)="
                                    onEnterTopoInput(item, $event)
                                  "
                                  [placeholder]="'select' | translate"
                                  autocomplete="off"
                                />
                                <tui-input-chip *tuiItem />
                                <tui-data-list *tuiDropdown tuiMultiSelectGroup>
                                  @for (
                                    topo of toposForCrag
                                      | tuiFilterByInput: topoFilter;
                                    track topo.id
                                  ) {
                                    <button
                                      type="button"
                                      tuiOption
                                      new
                                      [value]="topo"
                                    >
                                      {{ topo.name }}
                                    </button>
                                  }
                                </tui-data-list>
                              </tui-textfield>
                            } @else {
                              <div class="flex flex-wrap gap-1 min-w-0">
                                <div class="flex flex-wrap gap-x-1 gap-y-0">
                                  @let displayTopos =
                                    isEditing()
                                      ? selectedToposMap[item.key] || item.topos
                                      : item.topos;
                                  @if (displayTopos.length > 0) {
                                    <div tuiGroup [collapsed]="true">
                                      @for (t of displayTopos; track t.id) {
                                        @if (isEditing() || !t.link) {
                                          <span
                                            tuiButton
                                            appearance="secondary"
                                            class="min-w-fit!"
                                            size="xs"
                                          >
                                            {{ t.name }}
                                          </span>
                                        } @else {
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
                                      }
                                    </div>
                                  } @else {
                                    <span class="opacity-50 text-xs">-</span>
                                  }
                                </div>
                              </div>
                            }
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
                                    isEditing: isCellActive && canEditRoute,
                                  }
                                "
                              />
                            } @else {
                              <div class="flex flex-wrap gap-1 items-center">
                                @for (e of item.equippers; track e.id) {
                                  <a
                                    tuiLink
                                    class="text-xs bg-(--tui-background-neutral-1) hover:bg-(--tui-background-neutral-1-hover) text-(--tui-text-primary) px-2 py-0.5 rounded-md transition-colors truncate max-w-full font-medium"
                                    [routerLink]="
                                      isEditing() ? null : ['/equipper', e.id]
                                    "
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
                            @if (isEditing()) {
                              @let hasAscents =
                                item.hasAscents ??
                                (item.ascents > 0 || !!item.own_ascent);
                              @if (
                                (item.canDelete ?? item.canEdit) && !hasAscents
                              ) {
                                <button
                                  [size]="isMobile ? 's' : 'm'"
                                  appearance="negative"
                                  iconStart="@tui.trash"
                                  tuiIconButton
                                  type="button"
                                  class="rounded-full!"
                                  [tuiHint]="'delete' | translate"
                                  (click)="
                                    deleteRoute.emit(item);
                                    $event.stopPropagation()
                                  "
                                >
                                  {{ 'delete' | translate }}
                                </button>
                              }
                            } @else {
                              @let isAttemptProject =
                                item.own_ascent?.type === 'attempt' &&
                                item.project;
                              @let showAscentBtn =
                                item.own_ascent && !isAttemptProject;
                              @if (showAscentBtn) {
                                <app-button-ascent-type
                                  [size]="isMobile ? 's' : 'm'"
                                  [type]="item.own_ascent!.type"
                                  [active]="true"
                                  class="cursor-pointer"
                                  [tuiHint]="'ascent.view' | translate"
                                  (click.zoneless)="
                                    viewAscent.emit({
                                      row: item,
                                      ascent: item.own_ascent!,
                                    })
                                  "
                                />
                              } @else {
                                <button
                                  [size]="isMobile ? 's' : 'm'"
                                  [appearance]="
                                    isAttemptProject
                                      ? 'none'
                                      : item.project
                                        ? 'info'
                                        : 'neutral'
                                  "
                                  [iconStart]="
                                    isAttemptProject
                                      ? '@tui.circle-dashed'
                                      : item.project
                                        ? '@tui.bookmark'
                                        : '@tui.circle-plus'
                                  "
                                  [style.background]="
                                    isAttemptProject
                                      ? 'var(--tui-status-neutral)'
                                      : null
                                  "
                                  [class.text-(--tui-text-primary-on-accent-1)!]="
                                    isAttemptProject
                                  "
                                  [class.transition-transform]="
                                    isAttemptProject
                                  "
                                  [class.active:scale-95]="isAttemptProject"
                                  tuiIconButton
                                  type="button"
                                  class="rounded-full!"
                                  [tuiDropdown]="actionMenu"
                                  tuiDropdownAlign="end"
                                  [tuiDropdownMinHeight]="140"
                                  [tuiDropdownOpen]="
                                    openActionId() === item.key
                                  "
                                  (tuiDropdownOpenChange)="
                                    openActionId.set($event ? item.key : null)
                                  "
                                  (click.zoneless)="$event.stopPropagation()"
                                >
                                  {{
                                    isAttemptProject
                                      ? ('ascentTypes.attempt' | translate)
                                      : item.project
                                        ? ('project' | translate)
                                        : ('ascent.new' | translate)
                                  }}
                                </button>
                              }
                              <ng-template #actionMenu>
                                <tui-data-list size="m">
                                  @if (item.own_ascent; as ascent) {
                                    <button
                                      tuiOption
                                      class="whitespace-nowrap"
                                      (click)="
                                        viewAscent.emit({
                                          row: item,
                                          ascent: ascent,
                                        });
                                        openActionId.set(null)
                                      "
                                    >
                                      <tui-icon icon="@tui.eye" class="mr-2" />
                                      {{ 'ascent.view' | translate }}
                                    </button>
                                  }
                                  <button
                                    tuiOption
                                    appearance="positive"
                                    class="whitespace-nowrap"
                                    (click)="
                                      logAscent.emit(item);
                                      openActionId.set(null)
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
        </tui-scrollbar>
      } @else {
        <app-empty-state icon="@tui.list" />
      }
    }
  `,
  host: { class: 'flex flex-col min-h-0 min-w-0' },
  styles: `
    :host {
      isolation: isolate;
      z-index: 0;
    }
    td.cell-selected {
      padding: 0 !important;
      vertical-align: middle;
      outline: 2px solid var(--tui-theme-primary);
      outline-offset: -2px;
      position: relative;
      z-index: 2;
    }
    td.cell-selected > [tuiCell] {
      padding: 0 !important;
      min-block-size: 100% !important;
      height: 100% !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    td.cell-selected ::ng-deep tui-textfield {
      min-block-size: 100% !important;
      height: 100% !important;
      width: 100% !important;
      border-radius: 0 !important;
      margin: 0 !important;
      align-items: center !important;
      align-content: center !important;
    }
    td.cell-selected ::ng-deep tui-textfield::after,
    td.cell-selected ::ng-deep tui-textfield > .t-content {
      align-self: center !important;
    }
    td.cell-selected ::ng-deep tui-textfield[multi] > .t-items {
      min-block-size: 100% !important;
      align-content: center !important;
    }
    td.cell-selected ::ng-deep tui-textfield:not([multi]) [tuiInput] {
      inset-block: 0 !important;
      margin-block: auto !important;
    }
  `,
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
  toposByCrag = input<
    Record<string | number, { id: number | string; name: string }[]>
  >({});
  availableCrags = input<{ id: number; name: string; slug?: string }[]>([]);
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
  updateRouteName = output<{
    row: RoutesTableRow;
    name: string;
  }>();
  updateRouteCrag = output<{
    row: RoutesTableRow;
    cragId: number;
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
  deleteRoute = output<RoutesTableRow>();

  readonly isEditing = signal(false);
  readonly selectedCell = signal<{ rowKey: string; col: string } | null>(null);
  private readonly cragIdOverrides = signal<Record<string, number>>({});
  private readonly topoOverrides = signal<
    Record<string, { id: number | string; name: string; link?: string[] }[]>
  >({});
  protected readonly strings = tuiIsString;

  protected isCellSelected(rowKey: string, col: string): boolean {
    const sel = this.selectedCell();
    return sel !== null && sel.rowKey === rowKey && sel.col === col;
  }

  protected readonly editableColumnsMap = computed(() => {
    const hasCrags = this.availableCrags().length > 0;
    const hasEquippers = !!this.equippersTemplate();
    return {
      route: true,
      height: true,
      crag: hasCrags,
      topo: true,
      equippers: hasEquippers,
    } as Record<string, boolean>;
  });

  protected isColumnEditable(col: string): boolean {
    return !!this.editableColumnsMap()[col];
  }

  protected getEditableColumns(): string[] {
    return this.visibleColumns().filter((c) => this.isColumnEditable(c));
  }

  protected getSortedData(): RoutesTableRow[] {
    const items = this.data();
    const tableEl = this.table()?.nativeElement;
    if (tableEl) {
      const byKey = new Map<string, RoutesTableRow>();
      for (const item of items) {
        byKey.set(item.key, item);
      }
      const ordered: RoutesTableRow[] = [];
      const seen = new Set<string>();
      const cells = Array.from<Element>(
        tableEl.querySelectorAll('tbody td[data-row-key]'),
      );
      for (const cell of cells) {
        const key = cell.getAttribute('data-row-key');
        if (key && !seen.has(key)) {
          seen.add(key);
          const row = byKey.get(key);
          if (row) {
            ordered.push(row);
          }
        }
      }
      if (ordered.length === items.length && ordered.length > 0) {
        return ordered;
      }
    }

    const copy = [...items];
    const sorter = this.currentSorter;
    if (sorter) {
      const dir = this.currentDirection;
      copy.sort((a, b) => dir * sorter(a, b));
    }
    return copy;
  }

  protected getFirstEditableColumn(): string {
    const editCols = this.getEditableColumns();
    return editCols[0] || 'route';
  }

  protected getFirstEditableRow(): RoutesTableRow | undefined {
    const sorted = this.getSortedData();
    return sorted.find((r) => !!r.canEdit) || sorted[0];
  }

  protected readonly cragIdByRowKey = computed(() => {
    const overrides = this.cragIdOverrides();
    const crags = this.availableCrags();
    const map: Record<string, number | null> = {};
    for (const item of this.data()) {
      if (overrides[item.key] != null) {
        map[item.key] = overrides[item.key];
      } else if (item.crag_id != null) {
        map[item.key] = item.crag_id;
      } else {
        const ref = item._ref as { crag_id?: number } | undefined;
        if (ref && ref.crag_id != null) {
          map[item.key] = ref.crag_id;
        } else if (item.crag_name) {
          const match = crags.find((c) => c.name === item.crag_name);
          map[item.key] = match ? match.id : null;
        } else {
          map[item.key] = null;
        }
      }
    }
    return map;
  });

  protected readonly availableToposByRowKey = computed(() => {
    const cragIds = this.cragIdByRowKey();
    const byCrag = this.toposByCrag();
    const fallback = this.availableTopos();
    const map: Record<string, { id: number | string; name: string }[]> = {};
    for (const item of this.data()) {
      const cragId = cragIds[item.key];
      if (cragId != null && byCrag[cragId]) {
        map[item.key] = byCrag[cragId];
      } else {
        map[item.key] = fallback;
      }
    }
    return map;
  });

  protected readonly selectedToposByRowKey = computed(() => {
    const overrides = this.topoOverrides();
    const map: Record<
      string,
      { id: number | string; name: string; link?: string[] }[]
    > = {};
    for (const item of this.data()) {
      if (overrides[item.key]) {
        map[item.key] = overrides[item.key];
      } else {
        map[item.key] = (item.topos || []).map((t) => ({
          id: t.id,
          name: t.name,
          link: t.link,
        }));
      }
    }
    return map;
  });

  protected readonly topoStringify = (
    item: { id: number | string; name: string } | string,
  ): string => (typeof item === 'string' ? item : item.name);

  protected readonly topoIdentityMatcher: TuiIdentityMatcher<
    { id: number | string; name: string } | string
  > = (a, b) => {
    if (a === b) return true;
    if (typeof a === 'string' || typeof b === 'string') return a === b;
    return String(a.id) === String(b.id);
  };

  protected readonly topoFilter = (
    items: readonly { id: number | string; name: string }[],
    search: string,
    stringify: (item: { id: number | string; name: string }) => string,
  ): { id: number | string; name: string }[] => {
    const trimmed = search.trim();
    if (!trimmed) return [...items];

    const matchedAll = items.filter((item) =>
      matchesQuery(stringify(item), trimmed),
    );
    if (matchedAll.length > 0) {
      return matchedAll;
    }

    const words = normalizeName(trimmed).split(' ').filter(Boolean);
    if (words.length > 1) {
      const lastWord = words[words.length - 1];
      return items.filter((item) => matchesQuery(stringify(item), lastWord));
    }

    return [];
  };

  protected onEnterTopoInput(item: RoutesTableRow, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const raw = input?.value.trim() ?? '';
    if (!raw) return;

    const available = this.getAvailableToposForRow(item);
    const matches = this.topoFilter(available, raw, this.topoStringify);
    if (matches.length === 0) return;

    const targetTopo = matches[0];
    const current = this.selectedToposByRowKey()[item.key] ?? [];
    const exists = current.some((t) => this.topoIdentityMatcher(t, targetTopo));
    const nextTopos = exists
      ? current.filter((t) => !this.topoIdentityMatcher(t, targetTopo))
      : [...current, targetTopo];

    if (input) {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    this.onToposChange(item, nextTopos);
  }

  protected onToposChange(
    item: RoutesTableRow,
    newTopos: readonly { id: number | string; name: string; link?: string[] }[],
  ): void {
    const currentTopos = this.selectedToposByRowKey()[item.key] ?? [];
    const currentIds = new Set(currentTopos.map((t) => String(t.id)));
    const nextIds = new Set(newTopos.map((t) => String(t.id)));

    this.topoOverrides.update((prev) => ({
      ...prev,
      [item.key]: [...newTopos],
    }));

    for (const t of newTopos) {
      if (!currentIds.has(String(t.id))) {
        this.toggleRouteOnTopo.emit({
          topoId: t.id,
          routeId: item.id,
          isAttached: false,
        });
      }
    }

    for (const t of currentTopos) {
      if (!nextIds.has(String(t.id))) {
        this.toggleRouteOnTopo.emit({
          topoId: t.id,
          routeId: item.id,
          isAttached: true,
        });
      }
    }

    const tableEl = this.table()?.nativeElement;
    if (tableEl) {
      const input = tableEl.querySelector(
        `td[data-row-key="${item.key}"][data-col="topo"] input.topo-multiselect`,
      ) as HTMLInputElement | null;
      if (input) {
        if (input.value) {
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        input.focus({ preventScroll: true });
      }
    }
  }

  protected getAvailableToposForRow(
    item: RoutesTableRow,
  ): { id: number | string; name: string }[] {
    return this.availableToposByRowKey()[item.key] || [];
  }

  protected getCragId(item: RoutesTableRow): number | null {
    return this.cragIdByRowKey()[item.key] ?? null;
  }

  protected readonly availableCragIds = computed(() =>
    this.availableCrags().map((c) => c.id),
  );

  protected readonly cragStringify = (id: number): string =>
    this.availableCrags().find((c) => c.id === id)?.name ?? '';

  toggleEditing(): void {
    this.openActionId.set(null);
    this.openDropdownId.set(null);
    if (this.isEditing()) {
      this.isEditing.set(false);
      this.selectedCell.set(null);
    } else {
      this.isEditing.set(true);
      const firstRow = this.getFirstEditableRow();
      const firstCol = this.getFirstEditableColumn();
      if (firstRow) {
        this.selectedCell.set({ rowKey: firstRow.key, col: firstCol });
        this.focusSelectedCell();
      }
    }
  }

  protected onCellClick(item: RoutesTableRow, col: string, event: Event): void {
    if (!this.isEditing()) return;
    if (!this.isColumnEditable(col) || !item.canEdit) return;
    if (this.isCellSelected(item.key, col)) return;

    event.preventDefault();
    event.stopPropagation();
    this.openDropdownId.set(null);
    this.selectedCell.set({ rowKey: item.key, col });
    this.focusSelectedCell();
  }

  protected focusSelectedCell(): void {
    const attemptFocus = (): boolean => {
      const sel = this.selectedCell();
      const tableEl = this.table()?.nativeElement;
      if (!sel || !tableEl) return false;

      const cellEl = tableEl.querySelector(
        `td[data-row-key="${sel.rowKey}"][data-col="${sel.col}"]`,
      ) as HTMLElement | null;
      if (!cellEl) return false;

      const input = cellEl.querySelector(
        'input:not([disabled]):not([type="hidden"]):not([tuiChip]):not(.t-filler), select:not([disabled])',
      ) as HTMLInputElement | HTMLSelectElement | null;
      if (input) {
        input.focus({ preventScroll: true });
        input.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        if (
          input instanceof HTMLInputElement &&
          !input.readOnly &&
          !input.hasAttribute('tuiSelectLike') &&
          input.type !== 'checkbox' &&
          input.type !== 'radio' &&
          input.type !== 'file'
        ) {
          input.select?.();
        }
        return true;
      }

      const btn = cellEl.querySelector(
        'button:not([disabled])',
      ) as HTMLButtonElement | null;
      if (btn) {
        btn.focus({ preventScroll: true });
        btn.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        return true;
      }

      cellEl.focus({ preventScroll: true });
      cellEl.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      return false;
    };

    queueMicrotask(() => {
      if (!this.destroyed) {
        this.cdr.detectChanges();
      }
      if (!attemptFocus()) {
        setTimeout(() => {
          if (!this.destroyed) {
            this.cdr.detectChanges();
            attemptFocus();
          }
        }, 0);
      }
    });
  }

  protected onBlurRouteName(item: RoutesTableRow, event: Event): void {
    const input = event.target as HTMLInputElement;
    const trimmed = input.value.trim();
    if (trimmed && trimmed !== item.route) {
      item.route = trimmed;
      this.updateRouteName.emit({ row: item, name: trimmed });
    }
  }

  protected onEnterRouteName(item: RoutesTableRow, event: Event): void {
    const input = event.target as HTMLInputElement;
    const trimmed = input.value.trim();
    if (trimmed && trimmed !== item.route) {
      item.route = trimmed;
      this.updateRouteName.emit({ row: item, name: trimmed });
    }
    this.navigateCell(item.key, 'route', 'down');
  }

  protected onSelectCrag(
    item: RoutesTableRow,
    cragId: number | string | null,
  ): void {
    if (cragId == null) return;
    const numId = typeof cragId === 'string' ? parseInt(cragId, 10) : cragId;
    if (!Number.isNaN(numId) && numId !== this.getCragId(item)) {
      item.crag_id = numId;
      item.topos = [];
      this.cragIdOverrides.update((prev) => ({
        ...prev,
        [item.key]: numId,
      }));
      this.topoOverrides.update((prev) => ({
        ...prev,
        [item.key]: [],
      }));
      const foundCrag = this.availableCrags().find((c) => c.id === numId);
      if (foundCrag) {
        item.crag_name = foundCrag.name;
        item.crag_slug = foundCrag.slug;
      }
      this.updateRouteCrag.emit({ row: item, cragId: numId });
    }
    this.focusSelectedCell();
  }

  protected readonly canEditAny = computed(() =>
    this.data().some((item) => !!item.canEdit),
  );

  protected readonly attachedTopoIdsMap = computed(() => {
    const map = new Map<string | number, Set<string | number>>();
    for (const row of this.data()) {
      map.set(row.id, new Set(row.topos?.map((t) => t.id) ?? []));
    }
    return map;
  });

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
    const raw = input.value.trim();
    const parsed = raw === '' ? null : parseInt(raw, 10);
    if (parsed !== null && Number.isNaN(parsed)) return;
    if ((parsed ?? null) !== (item.height ?? null)) {
      item.height = parsed;
      this.updateRouteHeight.emit({ row: item, height: parsed });
    }
  }

  protected onEnterHeight(item: RoutesTableRow, event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.trim();
    const parsed = raw === '' ? null : parseInt(raw, 10);
    if (
      (parsed === null || !Number.isNaN(parsed)) &&
      (parsed ?? null) !== (item.height ?? null)
    ) {
      item.height = parsed;
      this.updateRouteHeight.emit({ row: item, height: parsed });
    }
    this.navigateCell(item.key, 'height', 'down');
  }

  private isHandlingBackspace = false;

  private readonly scrollbar = viewChild('scrollbar', {
    read: ElementRef<HTMLElement>,
  });
  private readonly table = viewChild('table', {
    read: ElementRef<HTMLElement>,
  });
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private destroyed = false;
  protected readonly isStuckLeft = signal(false);
  protected readonly isStuckRight = signal(false);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
    });

    effect(() => {
      this.currentDirection = this.direction();
      this.currentSorter = this.sorters[this.activeCol()];
    });

    effect(() => {
      this.data();
      this.visibleColumns();
      requestAnimationFrame(() => {
        this.updateFromHost();
        if (this.isEditing() && this.selectedCell()) {
          const tableEl = this.table()?.nativeElement;
          if (
            tableEl &&
            typeof document !== 'undefined' &&
            (!document.activeElement ||
              document.activeElement === document.body)
          ) {
            this.focusSelectedCell();
          }
        }
      });
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

    effect((onCleanup) => {
      const tableEl = this.table()?.nativeElement;
      if (!tableEl || typeof window === 'undefined') return;

      const theadEl = tableEl.querySelector(
        'thead',
      ) as HTMLTableSectionElement | null;
      if (!theadEl) return;

      const resetThead = () => {
        theadEl.style.position = '';
        theadEl.style.zIndex = '';
        theadEl.style.transform = '';
      };

      // Re-run when mobile/desktop layout changes so scrollContainer updates across breakpoints
      this.isMobile();

      const scrollContainer = this.findVerticalScrollAncestor(
        this.hostEl.nativeElement.parentElement,
      );

      let rafId = 0;
      const updateStickyHeader = () => {
        rafId = 0;
        const containerTop = scrollContainer
          ? scrollContainer.getBoundingClientRect().top
          : 0;
        let effectiveTop = containerTop;

        const stickySibling = this.findStickySiblingAbove(scrollContainer);
        if (stickySibling) {
          const sibRect = stickySibling.getBoundingClientRect();
          if (
            sibRect.top <= containerTop + 1 &&
            sibRect.bottom > containerTop
          ) {
            effectiveTop = Math.max(effectiveTop, sibRect.bottom);
          }
        }

        const tableRect = tableEl.getBoundingClientRect();
        const theadRect = theadEl.getBoundingClientRect();
        const maxOffset = Math.max(0, tableRect.height - theadRect.height);
        const offset = Math.max(
          0,
          Math.min(effectiveTop - tableRect.top, maxOffset),
        );

        if (offset > 0.5) {
          theadEl.style.position = 'relative';
          theadEl.style.zIndex = '30';
          theadEl.style.transform = `translate3d(0, ${offset}px, 0)`;
        } else {
          resetThead();
        }
      };

      const scheduleUpdate = () => {
        if (!rafId) {
          rafId = requestAnimationFrame(updateStickyHeader);
        }
      };

      const scrollTarget: EventTarget = scrollContainer ?? window;
      scrollTarget.addEventListener('scroll', scheduleUpdate, {
        passive: true,
      });
      window.addEventListener('resize', scheduleUpdate, { passive: true });

      const ro =
        typeof ResizeObserver !== 'undefined'
          ? new ResizeObserver(scheduleUpdate)
          : null;
      ro?.observe(tableEl);
      if (scrollContainer) {
        ro?.observe(scrollContainer);
      }

      scheduleUpdate();

      onCleanup(() => {
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
        scrollTarget.removeEventListener('scroll', scheduleUpdate);
        window.removeEventListener('resize', scheduleUpdate);
        ro?.disconnect();
        resetThead();
      });
    });

    effect((onCleanup) => {
      const tableEl = this.table()?.nativeElement;
      if (!tableEl || typeof document === 'undefined') return;

      const onKeyDown = (event: KeyboardEvent) => this.onTableKeyDown(event);
      document.addEventListener('keydown', onKeyDown, { capture: true });

      onCleanup(() => {
        document.removeEventListener('keydown', onKeyDown, { capture: true });
      });
    });
  }

  protected navigateCell(
    currentRowKey: string,
    currentCol: string,
    direction: 'up' | 'down' | 'left' | 'right',
  ): void {
    const sorted = this.getSortedData();
    const rowIndex = sorted.findIndex((r) => r.key === currentRowKey);
    if (rowIndex === -1) return;

    const editCols = this.getEditableColumns();
    const colIndex = editCols.indexOf(currentCol);

    let nextTarget: { rowKey: string; col: string } | null = null;

    if (direction === 'down') {
      const nextRow = sorted.slice(rowIndex + 1).find((r) => !!r.canEdit);
      if (nextRow) {
        nextTarget = { rowKey: nextRow.key, col: currentCol };
      }
    } else if (direction === 'up') {
      const prevRow = [...sorted.slice(0, rowIndex)]
        .reverse()
        .find((r) => !!r.canEdit);
      if (prevRow) {
        nextTarget = { rowKey: prevRow.key, col: currentCol };
      }
    } else if (direction === 'right') {
      if (colIndex !== -1 && colIndex < editCols.length - 1) {
        nextTarget = {
          rowKey: currentRowKey,
          col: editCols[colIndex + 1],
        };
      } else {
        const nextRow = sorted.slice(rowIndex + 1).find((r) => !!r.canEdit);
        if (nextRow && editCols.length > 0) {
          nextTarget = { rowKey: nextRow.key, col: editCols[0] };
        }
      }
    } else if (direction === 'left') {
      if (colIndex > 0) {
        nextTarget = {
          rowKey: currentRowKey,
          col: editCols[colIndex - 1],
        };
      } else {
        const prevRow = [...sorted.slice(0, rowIndex)]
          .reverse()
          .find((r) => !!r.canEdit);
        if (prevRow && editCols.length > 0) {
          nextTarget = {
            rowKey: prevRow.key,
            col: editCols[editCols.length - 1],
          };
        }
      }
    }

    if (nextTarget) {
      if (
        typeof document !== 'undefined' &&
        document.activeElement instanceof HTMLElement
      ) {
        const tableEl = this.table()?.nativeElement;
        if (
          tableEl?.contains(document.activeElement) ||
          document.activeElement.closest('tui-dropdown, [role="listbox"]')
        ) {
          document.activeElement.blur();
        }
      }
      this.openDropdownId.set(null);
      this.selectedCell.set(nextTarget);
      this.focusSelectedCell();
    }
  }

  private onTableKeyDown(event: KeyboardEvent): void {
    if (!this.isEditing()) return;

    if (event.key === 'Backspace') {
      this.isHandlingBackspace = true;
      queueMicrotask(() => {
        this.isHandlingBackspace = false;
      });
      return;
    }

    const isDown = event.key === 'ArrowDown';
    const isUp = event.key === 'ArrowUp';
    const isLeft = event.key === 'ArrowLeft';
    const isRight = event.key === 'ArrowRight';
    const isTab = event.key === 'Tab';
    const isEsc = event.key === 'Escape';
    const isEnterOrSpace = event.key === 'Enter' || event.key === ' ';

    if (
      !isDown &&
      !isUp &&
      !isLeft &&
      !isRight &&
      !isTab &&
      !isEsc &&
      !isEnterOrSpace
    ) {
      return;
    }

    if (isLeft && this.isHandlingBackspace) {
      return;
    }

    const sel = this.selectedCell();
    const tableEl = this.table()?.nativeElement;
    if (!sel || !tableEl) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    const isInsideTable = tableEl.contains(target);
    const isInsideDropdown = !!target.closest('tui-dropdown, [role="listbox"]');
    const isDocumentRoot =
      typeof document !== 'undefined' &&
      (target === document.body || target === document.documentElement);

    if (!isInsideTable && !isInsideDropdown && !isDocumentRoot) {
      return;
    }

    const currentCell =
      target.closest('td') ??
      (tableEl.querySelector(
        `td[data-row-key="${sel.rowKey}"][data-col="${sel.col}"]`,
      ) as HTMLElement | null);

    if (
      (isUp || isDown || isEnterOrSpace || isEsc) &&
      this.hasOpenDropdownOptions(target, currentCell)
    ) {
      return;
    }

    if (isEnterOrSpace) {
      if (sel.col === 'crag' && target.hasAttribute('tuiSelectLike')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        target.click();
      }
      return;
    }

    if (isEsc) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      this.openDropdownId.set(null);
      this.selectedCell.set(null);
      return;
    }

    if (isTab) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      this.navigateCell(sel.rowKey, sel.col, event.shiftKey ? 'left' : 'right');
      return;
    }

    if (isRight) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      this.navigateCell(sel.rowKey, sel.col, 'right');
      return;
    }

    if (isLeft) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      this.navigateCell(sel.rowKey, sel.col, 'left');
      return;
    }

    if (isDown) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      this.navigateCell(sel.rowKey, sel.col, 'down');
      return;
    }

    if (isUp) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      this.navigateCell(sel.rowKey, sel.col, 'up');
      return;
    }
  }

  private hasOpenDropdownOptions(
    target: HTMLElement,
    cell: HTMLElement | null,
  ): boolean {
    if (target.closest('tui-dropdown, [role="listbox"]')) {
      return true;
    }

    const openHost =
      target.closest('.tui-dropdown-open, [aria-expanded="true"]') ||
      cell?.querySelector('.tui-dropdown-open, [aria-expanded="true"]');

    if (!openHost) {
      return false;
    }

    const controlsId = openHost.getAttribute('aria-controls');
    const openDropdown =
      (controlsId ? document.getElementById(controlsId) : null) ||
      document.querySelector('tui-dropdown, [role="listbox"]');

    if (openDropdown) {
      const options = openDropdown.querySelectorAll(
        '[role="option"]:not(.t-empty), [tuiOption]:not(.t-empty), button[tuiOption], a[tuiOption]',
      );
      if (options.length > 0) {
        return true;
      }
    }

    if (cell) {
      const cellOptions = cell.querySelectorAll(
        '[role="option"]:not(.t-empty), [tuiOption]:not(.t-empty), button[tuiOption], a[tuiOption]',
      );
      return cellOptions.length > 0;
    }

    return false;
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

  private findVerticalScrollAncestor(
    start: HTMLElement | null,
  ): HTMLElement | null {
    let el = start;
    while (el && el !== document.documentElement && el !== document.body) {
      const overflowY = getComputedStyle(el).overflowY;
      if (
        overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflowY === 'overlay'
      ) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  private findStickySiblingAbove(
    scrollContainer: HTMLElement | null,
  ): HTMLElement | null {
    let cur: HTMLElement | null = this.hostEl.nativeElement;
    while (cur && cur !== scrollContainer && cur !== document.body) {
      let sib = cur.previousElementSibling as HTMLElement | null;
      while (sib) {
        if (getComputedStyle(sib).position === 'sticky') {
          return sib;
        }
        sib = sib.previousElementSibling as HTMLElement | null;
      }
      cur = cur.parentElement;
    }
    return null;
  }
}
