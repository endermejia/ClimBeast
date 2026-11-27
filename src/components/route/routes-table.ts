import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
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
  TuiHint,
  TuiIcon,
  TuiInput,
  TuiLink,
} from '@taiga-ui/core';
import {
  TuiBadge,
  TuiChevron,
  TuiDataListWrapper,
  TuiInputChip,
  TuiInputNumber,
  TuiMultiSelect,
  TuiPin,
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
import { RouteAscentActionMenuComponent } from './route-ascent-action-menu';
import {
  blurActiveTableElement,
  findFirstEditableRow,
  findStickySiblingAbove,
  findVerticalScrollAncestor,
  focusTableCell,
  getVisuallyOrderedRows,
  resolveNextEditableCell,
  resolveTableKeyDownAction,
  TableNavigationDirection,
} from './routes-table-navigation.utils';

@Component({
  selector: 'app-routes-table',
  imports: [
    AscentCountDirective,
    ButtonAscentTypeComponent,
    DecimalPipe,
    EmptyStateComponent,
    FormsModule,
    GradeComponent,
    NgTemplateOutlet,
    RouteAscentActionMenuComponent,
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
    TuiHint,
    TuiIcon,
    TuiInput,
    TuiInputChip,
    TuiInputNumber,
    TuiLink,
    TuiMultiSelect,
    TuiPin,
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
  ],
  template: `
    @if (data(); as d) {
      @if (d.length > 0) {
        @let isMobile = this.isMobile();
        <div class="w-full min-w-0 max-w-full overflow-x-clip">
          <table
            #table
            tuiTable
            [size]="isMobile ? 's' : 'm'"
            class="w-full table-fixed"
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
                    [style.top.px]="stickyTopOffset()"
                    [class.text-center]="col === 'actions' || col === 'ascents'"
                    [class.w-12!]="isMobile && col === 'actions'"
                    [class.w-14!]="
                      isMobile && (col === 'grade' || col === 'ascents')
                    "
                    [class.w-16!]="!isMobile && col === 'ascents'"
                    [class.w-18!]="
                      !isMobile && (col === 'grade' || col === 'actions')
                    "
                    [class.w-22!]="col === 'height'"
                    [class.w-28!]="col === 'color'"
                  >
                    <div
                      class="flex items-center gap-1 min-w-0 max-w-full"
                      [class.justify-center]="
                        col === 'actions' || col === 'ascents'
                      "
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
                        <span class="truncate">{{
                          'gradeShort' | translate
                        }}</span>
                      } @else if (col === 'ascents') {
                        <tui-icon
                          icon="@tui.circle-check"
                          class="w-4! h-4! shrink-0"
                          [style.font-size.rem]="1"
                          [tuiHint]="'ascents' | translate"
                          [attr.aria-label]="'ascents' | translate"
                        />
                      } @else {
                        <span class="truncate">{{ col | translate }}</span>
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
                          <div tuiCell size="m" class="h-full min-w-0 w-full">
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
                              @let showMobileCrag =
                                isMobile &&
                                showLocation() &&
                                !!item.crag_name &&
                                !item.isIndoor;
                              <div class="flex flex-col min-w-0 w-full flex-1">
                                <div
                                  class="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0 max-w-full"
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
                                    class="self-start font-bold! text-base min-w-0 max-w-full block"
                                    [class.truncate]="isMobile"
                                    [class.break-words]="!isMobile"
                                  >
                                    {{ item.route || ('route' | translate) }}
                                  </a>
                                  @if (showMobileCrag) {
                                    <a
                                      tuiLink
                                      class="truncate max-w-full min-w-0 text-xs! opacity-75 font-normal!"
                                      [routerLink]="
                                        isEditing()
                                          ? null
                                          : [
                                              '/area',
                                              item.area_slug,
                                              item.crag_slug || 'general',
                                            ]
                                      "
                                    >
                                      ({{ item.crag_name }})
                                    </a>
                                  }
                                  @if (item.legacy) {
                                    <span
                                      tuiBadge
                                      size="s"
                                      appearance="neutral"
                                      class="uppercase text-[10px] shrink-0 self-center"
                                    >
                                      {{ 'indoor.legacy' | translate }}
                                    </span>
                                  }
                                </div>
                                @if (item.rating > 0 || isMobile) {
                                  @let showMobileColor =
                                    isMobile && !!item.isIndoor && !!item.color;
                                  @let showMobileHeight =
                                    isMobile && !!item.height;
                                  @if (
                                    showMobileColor ||
                                    showMobileHeight ||
                                    item.rating > 0
                                  ) {
                                    <div
                                      class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs opacity-75 mt-0.5 min-w-0"
                                    >
                                      @if (showMobileColor) {
                                        <span
                                          class="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                          [style.backgroundColor]="item.color"
                                        ></span>
                                      }
                                      @if (showMobileHeight) {
                                        @if (showMobileColor) {
                                          <span class="opacity-50">·</span>
                                        }
                                        <span>{{ item.height }}m</span>
                                      }
                                      @if (item.rating > 0) {
                                        @if (
                                          showMobileColor || showMobileHeight
                                        ) {
                                          <span class="opacity-50">·</span>
                                        }
                                        <span
                                          class="inline-flex items-center gap-0.5 font-medium"
                                        >
                                          <span>{{
                                            item.rating | number: '1.0-1'
                                          }}</span>
                                          <tui-icon
                                            icon="@tui.star"
                                            class="w-3! h-3! text-amber-500"
                                            [style.font-size.rem]="0.75"
                                          />
                                        </span>
                                      }
                                    </div>
                                  }
                                  @if (
                                    isMobile &&
                                    (item.topos.length > 0 ||
                                      item.equippers.length > 0)
                                  ) {
                                    <div
                                      class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs mt-1 min-w-0"
                                    >
                                      @if (item.topos.length > 0) {
                                        <span
                                          class="inline-flex flex-wrap items-center gap-1 min-w-0 max-w-full"
                                        >
                                          @for (t of item.topos; track t.id) {
                                            @let missingPath =
                                              t.has_path === false;
                                            @if (isEditing() || !t.link) {
                                              <span
                                                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] leading-[1.2] min-w-0 max-w-full"
                                                [class]="
                                                  missingPath
                                                    ? 'bg-(--tui-status-warning-pale) text-(--tui-status-warning)'
                                                    : 'bg-(--tui-status-info-pale) text-(--tui-status-info)'
                                                "
                                              >
                                                <tui-icon
                                                  icon="/image/topo.svg"
                                                  class="block! w-3! h-3! shrink-0 opacity-80"
                                                  [style.font-size.rem]="0.75"
                                                  aria-hidden="true"
                                                />
                                                <span
                                                  class="truncate leading-[1.2]"
                                                  >{{ t.name }}</span
                                                >
                                              </span>
                                            } @else {
                                              <a
                                                [routerLink]="t.link"
                                                [queryParams]="{
                                                  route: item.id,
                                                }"
                                                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] leading-[1.2] min-w-0 max-w-full no-underline"
                                                [class]="
                                                  missingPath
                                                    ? 'bg-(--tui-status-warning-pale) hover:bg-(--tui-status-warning-pale-hover) text-(--tui-status-warning)'
                                                    : 'bg-(--tui-status-info-pale) hover:bg-(--tui-status-info-pale-hover) text-(--tui-status-info)'
                                                "
                                              >
                                                <tui-icon
                                                  icon="/image/topo.svg"
                                                  class="block! w-3! h-3! shrink-0 opacity-80"
                                                  [style.font-size.rem]="0.75"
                                                  aria-hidden="true"
                                                />
                                                <span
                                                  class="truncate leading-[1.2]"
                                                  >{{ t.name }}</span
                                                >
                                              </a>
                                            }
                                          }
                                        </span>
                                      }
                                      @if (
                                        item.topos.length > 0 &&
                                        item.equippers.length > 0
                                      ) {
                                        <span class="opacity-40">·</span>
                                      }
                                      @if (item.equippers.length > 0) {
                                        <span
                                          class="inline-flex flex-wrap items-center gap-x-1 min-w-0 max-w-full opacity-70"
                                        >
                                          <tui-icon
                                            icon="@tui.hammer"
                                            class="w-3! h-3! shrink-0 opacity-75"
                                            [style.font-size.rem]="0.75"
                                            aria-hidden="true"
                                          />
                                          @for (
                                            e of item.equippers;
                                            track e.id;
                                            let last = $last
                                          ) {
                                            <span
                                              class="inline-flex items-center min-w-0 max-w-full"
                                            >
                                              <a
                                                tuiLink
                                                class="truncate max-w-full min-w-0"
                                                [routerLink]="
                                                  isEditing()
                                                    ? null
                                                    : ['/equipper', e.id]
                                                "
                                              >
                                                {{ e.name }}
                                              </a>
                                              @if (!last) {
                                                <span>,</span>
                                              }
                                            </span>
                                          }
                                        </span>
                                      }
                                    </div>
                                  }
                                }
                              </div>
                            }
                          </div>
                        }
                        @case ('crag') {
                          <div tuiCell size="m" class="h-full min-w-0 w-full">
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
                                  class="text-sm min-w-0 max-w-full break-words"
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
                          <div
                            tuiCell
                            size="m"
                            class="justify-center h-full min-w-0 w-full"
                          >
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
                          <div tuiCell size="m" class="min-w-0 w-full">
                            <div
                              class="flex items-center gap-2 min-w-0 w-full max-w-full"
                            >
                              @if (item.color) {
                                <div
                                  tuiPin
                                  [style.backgroundColor]="item.color"
                                  style="position: static; transform: scale(0.75); margin: 0;"
                                  class="shrink-0"
                                ></div>
                                <span class="text-sm truncate min-w-0">
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
                        @case ('ascents') {
                          <div
                            tuiCell
                            size="m"
                            class="justify-center min-w-0 w-full"
                          >
                            <span [appAscentCount]="item.ascents"></span>
                          </div>
                        }
                        @case ('topo') {
                          <div tuiCell size="m" class="h-full min-w-0 w-full">
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
                              @let displayTopos =
                                isEditing()
                                  ? selectedToposMap[item.key] || item.topos
                                  : item.topos;
                              <div
                                class="flex flex-wrap gap-1 min-w-0 w-full max-w-full"
                              >
                                @if (displayTopos.length > 0) {
                                  @for (t of displayTopos; track t.id) {
                                    @let topoAppearance =
                                      t.has_path === false ? 'warning' : 'info';
                                    @if (isEditing() || !t.link) {
                                      <button
                                        type="button"
                                        tuiButton
                                        [appearance]="topoAppearance"
                                        class="max-w-full min-w-0 pointer-events-none"
                                        size="xs"
                                        tabindex="-1"
                                        [title]="t.name"
                                      >
                                        <span class="truncate">{{
                                          t.name
                                        }}</span>
                                      </button>
                                    } @else {
                                      <a
                                        tuiButton
                                        [appearance]="topoAppearance"
                                        class="max-w-full min-w-0"
                                        size="xs"
                                        [routerLink]="t.link"
                                        [queryParams]="{ route: item.id }"
                                        [title]="t.name"
                                      >
                                        <span class="truncate">{{
                                          t.name
                                        }}</span>
                                      </a>
                                    }
                                  }
                                } @else {
                                  <span class="opacity-50 text-xs">-</span>
                                }
                              </div>
                            }
                          </div>
                        }
                        @case ('equippers') {
                          <div
                            tuiCell
                            size="m"
                            class="h-full py-0 grow min-w-0 w-full"
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
                              <div
                                class="flex flex-wrap gap-x-1 gap-y-0.5 items-center min-w-0 w-full max-w-full"
                              >
                                @for (
                                  e of item.equippers;
                                  track e.id;
                                  let last = $last
                                ) {
                                  <span
                                    class="inline-flex items-center min-w-0 max-w-full"
                                  >
                                    <a
                                      tuiLink
                                      class="text-xs bg-(--tui-background-neutral-1) hover:bg-(--tui-background-neutral-1-hover) text-(--tui-text-primary) px-2 py-0.5 rounded-md transition-colors truncate max-w-full font-medium"
                                      [routerLink]="
                                        isEditing() ? null : ['/equipper', e.id]
                                      "
                                    >
                                      {{ e.name }}
                                    </a>
                                    @if (!last) {
                                      <span class="text-xs opacity-60">,</span>
                                    }
                                  </span>
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
                                <app-route-ascent-action-menu
                                  [size]="isMobile ? 's' : 'm'"
                                  [isAttemptProject]="!!isAttemptProject"
                                  [isProject]="!!item.project"
                                  [hasOwnAscent]="!!item.own_ascent"
                                  [canToggleProject]="
                                    !item.isIndoor && !item.climbed
                                  "
                                  [open]="openActionId() === item.key"
                                  (openChange)="
                                    openActionId.set($event ? item.key : null)
                                  "
                                  (viewAscent)="
                                    viewAscent.emit({
                                      row: item,
                                      ascent: item.own_ascent!,
                                    })
                                  "
                                  (logAscent)="logAscent.emit(item)"
                                  (toggleProject)="toggleProject.emit(item)"
                                />
                              }
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
        </div>
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
    thead[tuiThead] th {
      position: sticky;
      z-index: 30;
      background: var(--tui-background-base);
    }
    thead[tuiThead] th ::ng-deep .t-sort {
      max-width: 100%;
      min-width: 0;
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
    Record<
      string,
      {
        id: number | string;
        name: string;
        link?: string[];
        has_path?: boolean;
      }[]
    >
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
    return getVisuallyOrderedRows(
      this.data(),
      this.table()?.nativeElement,
      this.currentSorter,
      this.currentDirection,
    );
  }

  protected getFirstEditableColumn(): string {
    const editCols = this.getEditableColumns();
    return editCols[0] || 'route';
  }

  protected getFirstEditableRow(): RoutesTableRow | undefined {
    return findFirstEditableRow(this.getSortedData());
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
      {
        id: number | string;
        name: string;
        link?: string[];
        has_path?: boolean;
      }[]
    > = {};
    for (const item of this.data()) {
      if (overrides[item.key]) {
        map[item.key] = overrides[item.key];
      } else {
        map[item.key] = (item.topos || []).map((t) => ({
          id: t.id,
          name: t.name,
          link: t.link,
          has_path: t.has_path,
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
    newTopos: readonly {
      id: number | string;
      name: string;
      link?: string[];
      has_path?: boolean;
    }[],
  ): void {
    const currentTopos = this.selectedToposByRowKey()[item.key] ?? [];
    const currentById = new Map(currentTopos.map((t) => [String(t.id), t]));
    const currentIds = new Set(currentById.keys());
    const nextIds = new Set(newTopos.map((t) => String(t.id)));

    const normalizedTopos = newTopos.map((t) => {
      const existing = currentById.get(String(t.id));
      if (existing) return existing;
      return { ...t, has_path: t.has_path ?? false };
    });

    this.topoOverrides.update((prev) => ({
      ...prev,
      [item.key]: normalizedTopos,
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
      this.blurActiveCellElement();
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
    this.blurActiveCellElement();
    this.openDropdownId.set(null);
    this.selectedCell.set({ rowKey: item.key, col });
    this.focusSelectedCell();
  }

  private blurActiveCellElement(): void {
    blurActiveTableElement(this.table()?.nativeElement);
  }

  protected focusSelectedCell(): void {
    const attemptFocus = (): boolean =>
      focusTableCell(this.table()?.nativeElement, this.selectedCell());

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
    const cols = this.columns();
    if (!this.isMobile()) {
      return cols;
    }
    const mobileCols = new Set(['grade', 'route', 'ascents', 'actions']);
    return cols.filter((c) => mobileCols.has(c));
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

  private readonly table = viewChild('table', {
    read: ElementRef<HTMLElement>,
  });
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private destroyed = false;
  protected readonly stickyTopOffset = signal(0);

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

    effect((onCleanup) => {
      const tableEl = this.table()?.nativeElement;
      if (!tableEl || typeof window === 'undefined') return;

      // Re-run when mobile/desktop layout changes so scrollContainer/stickySibling updates
      this.isMobile();

      const scrollContainer = findVerticalScrollAncestor(
        this.hostEl.nativeElement.parentElement,
      );
      const stickySibling = findStickySiblingAbove(
        this.hostEl.nativeElement,
        scrollContainer,
      );

      const updateOffset = () => {
        if (this.destroyed) return;
        this.stickyTopOffset.set(
          stickySibling ? stickySibling.getBoundingClientRect().height : 0,
        );
      };

      const ro =
        typeof ResizeObserver !== 'undefined' && stickySibling
          ? new ResizeObserver(updateOffset)
          : null;
      if (stickySibling) {
        ro?.observe(stickySibling);
      }
      window.addEventListener('resize', updateOffset, { passive: true });
      updateOffset();

      onCleanup(() => {
        ro?.disconnect();
        window.removeEventListener('resize', updateOffset);
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
    direction: TableNavigationDirection,
  ): void {
    const nextTarget = resolveNextEditableCell(
      this.getSortedData(),
      this.getEditableColumns(),
      currentRowKey,
      currentCol,
      direction,
    );

    if (nextTarget) {
      this.blurActiveCellElement();
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

    const sel = this.selectedCell();
    const tableEl = this.table()?.nativeElement;
    if (!sel || !tableEl) return;

    const action = resolveTableKeyDownAction(event, {
      tableEl,
      selectedCell: sel,
      isHandlingBackspace: this.isHandlingBackspace,
    });

    if (action.type === 'ignore') return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    switch (action.type) {
      case 'open-select':
        action.target.click();
        break;
      case 'escape':
        this.openDropdownId.set(null);
        this.selectedCell.set(null);
        break;
      case 'navigate':
        this.navigateCell(sel.rowKey, sel.col, action.direction);
        break;
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
