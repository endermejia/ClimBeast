import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  TemplateRef,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  TuiSortDirection,
  TuiTable,
  TuiTableSortChange,
} from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { tuiDefaultSort, TuiIdentityMatcher, tuiIsString } from '@taiga-ui/cdk';
import {
  TuiAppearance,
  TuiButton,
  TuiCell,
  TuiDataList,
  type TuiDialogContext,
  TuiDialogService,
  TuiFilterByInputPipe,
  TuiIcon,
  TuiInput,
  TuiLabel,
  TuiLink,
  TuiOptGroup,
  TuiScrollControls,
  TuiScrollRef,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import {
  TUI_CONFIRM,
  type TuiConfirmData,
  TuiAvatar,
  TuiBadge,
  TuiBadgeNotification,
  TuiBadgedContentComponent,
  TuiBadgedContentDirective,
  TuiChevron,
  TuiComboBox,
  TuiDataListWrapper,
  TuiInputChip,
  TuiMultiSelect,
  TuiSkeleton,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom, type Observer } from 'rxjs';

import { CacheService } from '../../services/cache.service';
import { IndoorService } from '../../services/indoor.service';
import { LayoutService } from '../../services/layout.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

import { EmptyStateComponent } from '../../components/ui/empty-state';

import { AreaListItem, IndoorCenterDto } from '../../models';

import { CACHE_KEYS } from '../../constants';
import { AvatarUrlPipe } from '../../pipes';
import { matchesQuery, waitForResource } from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

interface UserWithRole {
  id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  is_admin: boolean;
  canDelete: boolean;
  assignedAreas: AreaListItem[];
  assignedCenters: IndoorCenterDto[];
  routesetterCenters: IndoorCenterDto[];
  expandedAreas?: boolean;
  expandedCenters?: boolean;
  expandedRoutesetters?: boolean;
}

@Component({
  selector: 'app-users-list-admin',
  standalone: true,
  imports: [
    AvatarUrlPipe,
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    CdkVirtualScrollViewport,
    EmptyStateComponent,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadge,
    TuiBadgedContentComponent,
    TuiBadgedContentDirective,
    TuiBadgeNotification,
    TuiButton,
    TuiCell,
    TuiChevron,
    TuiComboBox,
    TuiDataList,
    TuiDataListWrapper,
    TuiFilterByInputPipe,
    TuiIcon,
    TuiInput,
    TuiInputChip,
    TuiLabel,
    TuiLink,
    TuiMultiSelect,
    TuiOptGroup,
    TuiScrollControls,
    TuiScrollRef,
    TuiSkeleton,
    TuiTable,
    TuiTextfield,
    TuiTitle,
  ],
  template: `
    <section class="flex flex-col w-full max-w-7xl mx-auto p-4 grow min-h-0">
      <header class="mb-4 flex items-center justify-between gap-2 shrink-0">
        <h1 class="text-2xl font-bold">
          <a
            routerLink="/admin"
            class="no-underline text-inherit flex items-center gap-2"
          >
            <tui-icon icon="@tui.arrow-left" />
            <tui-badged-content [style.--tui-radius.%]="50">
              @if (users().length; as usersCount) {
                <ng-container tuiSlot="top">
                  <tui-badge-notification tuiAppearance="accent" size="s">
                    {{ usersCount }}
                  </tui-badge-notification>
                </ng-container>
              }
              <div
                class="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0"
              >
                <tui-icon icon="@tui.users" />
              </div>
            </tui-badged-content>
            {{ 'admin.users.title' | translate }}
          </a>
        </h1>
      </header>

      <p class="mb-6 text-tui-text-secondary opacity-60 shrink-0">
        {{ 'admin.users.description' | translate }}
      </p>

      <div class="mb-6 flex flex-col sm:flex-row gap-3 shrink-0">
        <tui-textfield class="grow" [tuiTextfieldCleaner]="true">
          <label tuiLabel for="user-search">{{ 'search' | translate }}</label>
          <input
            id="user-search"
            tuiInput
            type="text"
            autocomplete="off"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            [placeholder]="'user' | translate"
          />
        </tui-textfield>
        <tui-textfield
          class="grow"
          [tuiTextfieldCleaner]="true"
          [stringify]="stringifyAreaFilter"
        >
          <label tuiLabel for="area-filter">{{ 'areas' | translate }}</label>
          <input
            id="area-filter"
            tuiComboBox
            [ngModel]="filterArea()"
            (ngModelChange)="filterArea.set($event)"
            autocomplete="off"
          />
          <tui-data-list-wrapper
            *tuiDropdown
            new
            [items]="areaFilterOptions() | tuiFilterByInput"
          />
        </tui-textfield>
        <tui-textfield
          class="grow"
          [tuiTextfieldCleaner]="true"
          [stringify]="stringifyCenterFilter"
        >
          <label tuiLabel for="center-filter">{{
            'indoor.title' | translate
          }}</label>
          <input
            id="center-filter"
            tuiComboBox
            [ngModel]="filterCenter()"
            (ngModelChange)="filterCenter.set($event)"
            autocomplete="off"
          />
          <tui-data-list-wrapper
            *tuiDropdown
            new
            [items]="centerFilterOptions() | tuiFilterByInput"
          />
        </tui-textfield>
      </div>

      @if (loading()) {
        <table
          [size]="layout.isMobile() ? 's' : 'l'"
          tuiTable
          class="w-full"
          [columns]="columns"
        >
          <thead tuiThead>
            <tr tuiThGroup>
              <th *tuiHead="'user'" tuiTh class="user-column min-w-[200px]">
                {{ 'user' | translate }}
              </th>
              <th *tuiHead="'email'" tuiTh class="email-column min-w-[180px]">
                {{ 'email' | translate }}
              </th>
              <th *tuiHead="'role'" tuiTh class="role-column min-w-[120px]">
                {{ 'role' | translate }}
              </th>
              <th *tuiHead="'areas'" tuiTh class="areas-column min-w-[180px]">
                {{ 'admin.users.adminInArea' | translate }}
              </th>
              <th
                *tuiHead="'centers'"
                tuiTh
                class="centers-column min-w-[180px]"
              >
                {{ 'admin.users.adminInCenter' | translate }}
              </th>
              <th
                *tuiHead="'routesetters'"
                tuiTh
                class="routesetters-column min-w-[180px]"
              >
                {{ 'admin.users.routesetterIn' | translate }}
              </th>
              <th
                *tuiHead="'actions'"
                tuiTh
                class="actions-column w-24 min-w-[90px] text-right"
              >
                {{ 'actions' | translate }}
              </th>
            </tr>
          </thead>
          <tbody tuiTbody>
            @for (_item of skeletons; track $index) {
              <tr tuiTr>
                <td *tuiCell="'user'" tuiTd class="user-cell">
                  <div class="flex items-center gap-3">
                    <div
                      [tuiSkeleton]="true"
                      class="w-10 h-10 rounded-full shrink-0"
                    ></div>
                    <div [tuiSkeleton]="true" class="w-32 h-4"></div>
                  </div>
                </td>
                <td *tuiCell="'email'" tuiTd class="email-column">
                  <div [tuiSkeleton]="true" class="w-32 h-4"></div>
                </td>
                <td *tuiCell="'role'" tuiTd class="role-cell">
                  <div [tuiSkeleton]="true" class="w-20 h-7 rounded-xl"></div>
                </td>
                <td *tuiCell="'areas'" tuiTd class="areas-column">
                  <div [tuiSkeleton]="true" class="w-24 h-6 rounded-md"></div>
                </td>
                <td *tuiCell="'centers'" tuiTd class="centers-column">
                  <div [tuiSkeleton]="true" class="w-24 h-6 rounded-md"></div>
                </td>
                <td *tuiCell="'routesetters'" tuiTd class="routesetters-column">
                  <div [tuiSkeleton]="true" class="w-24 h-6 rounded-md"></div>
                </td>
                <td
                  *tuiCell="'actions'"
                  tuiTd
                  class="actions-column text-right"
                >
                  <div
                    [tuiSkeleton]="true"
                    class="w-8 h-8 rounded-full ml-auto"
                  ></div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      } @else if (filteredUsers().length > 0) {
        <cdk-virtual-scroll-viewport
          #viewport
          appendOnly
          tuiScrollRef
          class="viewport grow min-h-0 w-full"
          [itemSize]="rowHeight"
          [maxBufferPx]="500"
          [minBufferPx]="400"
        >
          <tui-scroll-controls />
          <table
            [size]="layout.isMobile() ? 's' : 'l'"
            tuiTable
            class="w-full"
            [columns]="columns"
            [direction]="direction()"
            [sorter]="sorter()"
            (sortChange)="onSortChange($event)"
          >
            @let sortedUsersList = filteredUsers() | tuiTableSort;
            <thead tuiThead>
              <tr
                tuiThGroup
                [style.inset-block-start.px]="
                  -(viewport.getOffsetToRenderedContentStart() || 0)
                "
              >
                <th
                  *tuiHead="'user'"
                  tuiTh
                  class="user-column min-w-[200px]"
                  [sorter]="userSorter"
                  [sticky]="true"
                >
                  {{ 'user' | translate }}
                </th>
                <th
                  *tuiHead="'email'"
                  tuiTh
                  class="email-column min-w-[180px]"
                  [sorter]="emailSorter"
                  [sticky]="true"
                >
                  {{ 'email' | translate }}
                </th>
                <th
                  *tuiHead="'role'"
                  tuiTh
                  class="role-column min-w-[120px]"
                  [sorter]="roleSorter"
                  [sticky]="true"
                >
                  {{ 'role' | translate }}
                </th>
                <th
                  *tuiHead="'areas'"
                  tuiTh
                  class="areas-column min-w-[180px]"
                  [sorter]="areasSorter"
                  [sticky]="true"
                >
                  {{ 'admin.users.adminInArea' | translate }}
                </th>
                <th
                  *tuiHead="'centers'"
                  tuiTh
                  class="centers-column min-w-[180px]"
                  [sorter]="centersSorter"
                  [sticky]="true"
                >
                  {{ 'admin.users.adminInCenter' | translate }}
                </th>
                <th
                  *tuiHead="'routesetters'"
                  tuiTh
                  class="routesetters-column min-w-[180px]"
                  [sorter]="routesettersSorter"
                  [sticky]="true"
                >
                  {{ 'admin.users.routesetterIn' | translate }}
                </th>
              </tr>
            </thead>

            <tbody tuiTbody [data]="sortedUsersList">
              <tr
                tuiTr
                *cdkVirtualFor="let user of sortedUsersList; trackBy: trackById"
                [class.is-current]="user.id === currentUserId()"
              >
                <td *tuiCell="'user'" tuiTd class="user-cell">
                  <div class="flex items-center gap-3 min-w-0">
                    <a [routerLink]="['/profile', user.id]" class="shrink-0">
                      <span tuiAvatar size="m">
                        @if (user.avatar; as avatar) {
                          <img [src]="avatar | avatarUrl" alt="avatar" />
                        } @else {
                          <tui-icon icon="@tui.user" />
                        }
                      </span>
                    </a>
                    <div class="flex items-center gap-2 min-w-0">
                      <a
                        tuiLink
                        [routerLink]="['/profile', user.id]"
                        class="font-medium truncate"
                      >
                        {{ user.name || ('anonymous' | translate) }}
                      </a>
                      @if (user.id === currentUserId()) {
                        <span class="text-xs opacity-60 shrink-0">
                          ({{ 'you' | translate }})
                        </span>
                      }
                      @if (user.canDelete) {
                        <button
                          size="s"
                          appearance="negative"
                          iconStart="@tui.trash"
                          tuiIconButton
                          type="button"
                          class="rounded-full! shrink-0"
                          [title]="'admin.users.delete' | translate"
                          (click.zoneless)="deleteUser(user)"
                        >
                          {{ 'admin.users.delete' | translate }}
                        </button>
                      }
                    </div>
                  </div>
                </td>
                <td *tuiCell="'email'" tuiTd class="email-column">
                  <span
                    class="text-sm truncate text-neutral-600 dark:text-neutral-400 font-mono"
                  >
                    {{ user.email || '-' }}
                  </span>
                </td>
                <td *tuiCell="'role'" tuiTd class="role-cell">
                  <button
                    tuiButton
                    size="s"
                    [appearance]="user.is_admin ? 'primary' : 'flat'"
                    [disabled]="user.id === currentUserId()"
                    (click.zoneless)="toggleAdminStatus(user)"
                    [title]="
                      user.id === currentUserId()
                        ? ('admin.users.cannotRemoveSelf' | translate)
                        : user.is_admin
                          ? ('admin.users.revokeAdmin' | translate)
                          : ('admin.users.makeAdmin' | translate)
                    "
                    class="rounded-xl"
                  >
                    <tui-icon
                      [icon]="user.is_admin ? '@tui.shield' : '@tui.shield-off'"
                      size="s"
                    />
                    Admin
                  </button>
                </td>

                <td
                  *tuiCell="'areas'"
                  tuiTd
                  class="areas-column cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors"
                  (click.zoneless)="openEditPermissions(user)"
                  [title]="'admin.users.editRoles' | translate"
                >
                  @if (user.assignedAreas.length === 0) {
                    <span class="text-xs text-neutral-400 dark:text-neutral-500"
                      >—</span
                    >
                  } @else {
                    <div class="flex flex-wrap items-center gap-1 py-1">
                      @if (user.expandedAreas) {
                        @for (area of user.assignedAreas; track area.id) {
                          <span
                            tuiBadge
                            appearance="neutral"
                            size="s"
                            class="max-w-[120px] truncate"
                          >
                            {{ area.name }}
                          </span>
                        }
                      } @else {
                        @for (
                          area of user.assignedAreas.slice(0, 2);
                          track area.id
                        ) {
                          <span
                            tuiBadge
                            appearance="neutral"
                            size="s"
                            class="max-w-[120px] truncate"
                          >
                            {{ area.name }}
                          </span>
                        }
                        @if (user.assignedAreas.length > 2) {
                          <button
                            type="button"
                            tuiBadge
                            appearance="accent"
                            size="s"
                            class="cursor-pointer hover:opacity-80 transition-opacity"
                            [title]="'showMore' | translate"
                            (click.zoneless)="
                              toggleExpand(user, 'areas', $event)
                            "
                          >
                            +{{ user.assignedAreas.length - 2 }}
                          </button>
                        }
                      }
                    </div>
                  }
                </td>
                <td
                  *tuiCell="'centers'"
                  tuiTd
                  class="centers-column cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors"
                  (click.zoneless)="openEditPermissions(user)"
                  [title]="'admin.users.editRoles' | translate"
                >
                  @if (user.assignedCenters.length === 0) {
                    <span class="text-xs text-neutral-400 dark:text-neutral-500"
                      >—</span
                    >
                  } @else {
                    <div class="flex flex-wrap items-center gap-1 py-1">
                      @if (user.expandedCenters) {
                        @for (center of user.assignedCenters; track center.id) {
                          <span
                            tuiBadge
                            appearance="neutral"
                            size="s"
                            class="max-w-[120px] truncate"
                          >
                            {{ center.name }}
                          </span>
                        }
                      } @else {
                        @for (
                          center of user.assignedCenters.slice(0, 2);
                          track center.id
                        ) {
                          <span
                            tuiBadge
                            appearance="neutral"
                            size="s"
                            class="max-w-[120px] truncate"
                          >
                            {{ center.name }}
                          </span>
                        }
                        @if (user.assignedCenters.length > 2) {
                          <button
                            type="button"
                            tuiBadge
                            appearance="accent"
                            size="s"
                            class="cursor-pointer hover:opacity-80 transition-opacity"
                            [title]="'showMore' | translate"
                            (click.zoneless)="
                              toggleExpand(user, 'centers', $event)
                            "
                          >
                            +{{ user.assignedCenters.length - 2 }}
                          </button>
                        }
                      }
                    </div>
                  }
                </td>
                <td
                  *tuiCell="'routesetters'"
                  tuiTd
                  class="routesetters-column cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors"
                  (click.zoneless)="openEditPermissions(user)"
                  [title]="'admin.users.editRoles' | translate"
                >
                  @if (user.routesetterCenters.length === 0) {
                    <span class="text-xs text-neutral-400 dark:text-neutral-500"
                      >—</span
                    >
                  } @else {
                    <div class="flex flex-wrap items-center gap-1 py-1">
                      @if (user.expandedRoutesetters) {
                        @for (
                          center of user.routesetterCenters;
                          track center.id
                        ) {
                          <span
                            tuiBadge
                            appearance="neutral"
                            size="s"
                            class="max-w-[120px] truncate"
                          >
                            {{ center.name }}
                          </span>
                        }
                      } @else {
                        @for (
                          center of user.routesetterCenters.slice(0, 2);
                          track center.id
                        ) {
                          <span
                            tuiBadge
                            appearance="neutral"
                            size="s"
                            class="max-w-[120px] truncate"
                          >
                            {{ center.name }}
                          </span>
                        }
                        @if (user.routesetterCenters.length > 2) {
                          <button
                            type="button"
                            tuiBadge
                            appearance="accent"
                            size="s"
                            class="cursor-pointer hover:opacity-80 transition-opacity"
                            [title]="'showMore' | translate"
                            (click.zoneless)="
                              toggleExpand(user, 'routesetters', $event)
                            "
                          >
                            +{{ user.routesetterCenters.length - 2 }}
                          </button>
                        }
                      }
                    </div>
                  }
                </td>
              </tr>
            </tbody>
          </table>
        </cdk-virtual-scroll-viewport>
      } @else {
        <app-empty-state icon="@tui.users" />
      }
    </section>

    <!-- Edit Permissions Dialog -->
    <ng-template #editPermissionsDialog let-observer>
      @if (editingUser(); as user) {
        <form
          class="flex flex-col gap-4 p-1"
          (submit.zoneless)="
            $event.preventDefault(); submitPermissions(observer)
          "
        >
          <div
            class="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl"
          >
            <span tuiAvatar size="m">
              @if (user.avatar; as avatar) {
                <img [src]="avatar | avatarUrl" alt="avatar" />
              } @else {
                <tui-icon icon="@tui.user" />
              }
            </span>
            <div class="flex flex-col min-w-0">
              <span class="font-semibold truncate">
                {{ user.name || ('anonymous' | translate) }}
              </span>
              <span class="text-xs text-neutral-500 font-mono truncate">
                {{ user.email || '-' }}
              </span>
            </div>
          </div>

          <tui-textfield
            multi
            tuiChevron
            [stringify]="stringifyArea"
            [disabledItemHandler]="strings"
            [identityMatcher]="areaIdentityMatcher"
            [tuiTextfieldCleaner]="false"
          >
            <label tuiLabel for="edit-areas-select">{{
              'admin.users.adminInArea' | translate
            }}</label>
            <input
              tuiInputChip
              id="edit-areas-select"
              [formControl]="editAreasControl"
              [placeholder]="'select' | translate"
              autocomplete="off"
            />
            <tui-input-chip *tuiItem />
            <tui-data-list *tuiDropdown>
              <tui-opt-group [label]="'areas' | translate" tuiMultiSelectGroup>
                @for (
                  area of availableAreas() | tuiFilterByInput;
                  track area.id
                ) {
                  <button type="button" new tuiOption [value]="area">
                    <div tuiCell size="s">
                      <div tuiTitle>{{ area.name }}</div>
                    </div>
                  </button>
                }
              </tui-opt-group>
            </tui-data-list>
          </tui-textfield>

          <tui-textfield
            multi
            tuiChevron
            [stringify]="stringifyCenter"
            [disabledItemHandler]="strings"
            [identityMatcher]="centerIdentityMatcher"
            [tuiTextfieldCleaner]="false"
          >
            <label tuiLabel for="edit-centers-select">{{
              'admin.users.adminInCenter' | translate
            }}</label>
            <input
              tuiInputChip
              id="edit-centers-select"
              [formControl]="editCentersControl"
              [placeholder]="'select' | translate"
              autocomplete="off"
            />
            <tui-input-chip *tuiItem />
            <tui-data-list *tuiDropdown>
              <tui-opt-group
                [label]="'indoor.title' | translate"
                tuiMultiSelectGroup
              >
                @for (
                  center of availableCenters() | tuiFilterByInput;
                  track center.id
                ) {
                  <button type="button" new tuiOption [value]="center">
                    <div tuiCell size="s">
                      <div tuiTitle>{{ center.name }}</div>
                    </div>
                  </button>
                }
              </tui-opt-group>
            </tui-data-list>
          </tui-textfield>

          <tui-textfield
            multi
            tuiChevron
            [stringify]="stringifyCenter"
            [disabledItemHandler]="strings"
            [identityMatcher]="centerIdentityMatcher"
            [tuiTextfieldCleaner]="false"
          >
            <label tuiLabel for="edit-routesetters-select">{{
              'admin.users.routesetterIn' | translate
            }}</label>
            <input
              tuiInputChip
              id="edit-routesetters-select"
              [formControl]="editRoutesettersControl"
              [placeholder]="'select' | translate"
              autocomplete="off"
            />
            <tui-input-chip *tuiItem />
            <tui-data-list *tuiDropdown>
              <tui-opt-group
                [label]="'indoor.title' | translate"
                tuiMultiSelectGroup
              >
                @for (
                  center of availableCenters() | tuiFilterByInput;
                  track center.id
                ) {
                  <button type="button" new tuiOption [value]="center">
                    <div tuiCell size="s">
                      <div tuiTitle>{{ center.name }}</div>
                    </div>
                  </button>
                }
              </tui-opt-group>
            </tui-data-list>
          </tui-textfield>

          <div class="flex justify-end gap-2 mt-4">
            <button
              tuiButton
              type="button"
              appearance="flat"
              size="m"
              [disabled]="isSavingPermissions()"
              (click.zoneless)="observer.complete()"
            >
              {{ 'cancel' | translate }}
            </button>
            <button
              tuiButton
              type="submit"
              appearance="primary"
              size="m"
              [disabled]="isSavingPermissions()"
            >
              {{ 'save' | translate }}
            </button>
          </div>
        </form>
      }
    </ng-template>
  `,
  styles: [
    `
      .is-current {
        background-color: var(--tui-status-info-pale);
      }

      .user-column {
        min-width: 200px;
      }

      .email-column {
        min-width: 180px;
      }

      .role-column {
        min-width: 120px;
      }

      .areas-column {
        min-width: 180px;
      }

      .centers-column {
        min-width: 180px;
      }

      .routesetters-column {
        min-width: 180px;
      }

      .user-cell {
        padding: 0.5rem 0.5rem;
      }

      .viewport {
        height: 100%;
        min-height: 400px;
      }

      table {
        inline-size: 100%;

        th {
          inset-block-start: inherit;
        }

        tr {
          min-height: 3.5rem;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class AdminUsersListComponent {
  protected readonly layout = inject(LayoutService);
  protected readonly supabase = inject(SupabaseService);
  private readonly indoor = inject(IndoorService);
  private readonly outdoorData = inject(OutdoorDataService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);
  private readonly cache = inject(CacheService);

  private readonly editPermissionsDialog = viewChild<
    TemplateRef<TuiDialogContext<boolean>>
  >('editPermissionsDialog');

  protected readonly columns = [
    'user',
    'email',
    'role',
    'areas',
    'centers',
    'routesetters',
  ];

  protected readonly rowHeight = 56;
  protected readonly trackById = (_index: number, user: UserWithRole): string =>
    user.id;

  protected readonly searchQuery = signal('');
  protected readonly filterArea = signal<AreaListItem | null>(null);
  protected readonly filterCenter = signal<IndoorCenterDto | null>(null);

  protected readonly areaFilterOptions = computed(() => {
    const areas = this.availableAreas();
    const assignedIds = new Set(
      this.users().flatMap((u) => u.assignedAreas.map((a) => a.id)),
    );
    return areas.filter((a) => assignedIds.has(a.id));
  });

  protected readonly centerFilterOptions = computed(() => {
    const centers = this.availableCenters();
    const assignedIds = new Set(
      this.users().flatMap((u) => [
        ...u.assignedCenters.map((c) => c.id),
        ...u.routesetterCenters.map((c) => c.id),
      ]),
    );
    return centers.filter((c) => assignedIds.has(c.id));
  });

  protected readonly stringifyAreaFilter = (a: AreaListItem | null) =>
    a?.name ?? '';
  protected readonly stringifyCenterFilter = (c: IndoorCenterDto | null) =>
    c?.name ?? '';

  protected readonly filteredUsers = computed(() => {
    const query = this.searchQuery();
    const area = this.filterArea();
    const center = this.filterCenter();
    let list = this.users();

    if (query) {
      list = list.filter(
        (u) =>
          matchesQuery(u.name, query) ||
          (u.email ? matchesQuery(u.email, query) : false),
      );
    }

    if (area) {
      list = list.filter((u) => u.assignedAreas.some((a) => a.id === area.id));
    }

    if (center) {
      list = list.filter(
        (u) =>
          u.assignedCenters.some((c) => c.id === center.id) ||
          u.routesetterCenters.some((c) => c.id === center.id),
      );
    }

    return list;
  });

  protected readonly currentUserId = computed(
    () => this.supabase.authUser()?.id,
  );
  protected readonly loading: WritableSignal<boolean> = signal(true);
  protected readonly users: WritableSignal<UserWithRole[]> = signal([]);

  protected readonly availableAreas = computed(() =>
    this.outdoorData.areasList(),
  );
  protected readonly stringifyArea = (a: AreaListItem) => a.name;
  protected readonly areaIdentityMatcher: TuiIdentityMatcher<AreaListItem> = (
    a,
    b,
  ) => a.id === b.id;

  protected readonly availableCenters = signal<IndoorCenterDto[]>([]);
  protected readonly stringifyCenter = (c: IndoorCenterDto) => c.name;
  protected readonly centerIdentityMatcher: TuiIdentityMatcher<IndoorCenterDto> =
    (a, b) => a.id === b.id;

  protected readonly strings = tuiIsString;

  protected readonly skeletons = Array(10).fill(0);
  protected readonly direction = signal<TuiSortDirection>(TuiSortDirection.Asc);

  // Edit dialog state
  protected readonly editingUser = signal<UserWithRole | null>(null);
  protected readonly editAreasControl = new FormControl<AreaListItem[]>([], {
    nonNullable: true,
  });
  protected readonly editCentersControl = new FormControl<IndoorCenterDto[]>(
    [],
    { nonNullable: true },
  );
  protected readonly editRoutesettersControl = new FormControl<
    IndoorCenterDto[]
  >([], { nonNullable: true });
  protected readonly isSavingPermissions = signal<boolean>(false);

  /**
   * Sorter logic for Role column: Admins appear first when ascending, non-admins first when descending.
   * Secondary sorting is alphabetical by user name.
   */
  protected readonly roleSorter: TuiComparator<UserWithRole> = (a, b) => {
    if (a.is_admin !== b.is_admin) {
      return a.is_admin ? -1 : 1;
    }
    return tuiDefaultSort(a.name || '', b.name || '');
  };

  /**
   * Sorter logic for User column: Sorts alphabetically by name.
   */
  protected readonly userSorter: TuiComparator<UserWithRole> = (a, b) =>
    tuiDefaultSort(a.name || '', b.name || '');

  /**
   * Sorter logic for Email column: Sorts alphabetically by email.
   */
  protected readonly emailSorter: TuiComparator<UserWithRole> = (a, b) =>
    tuiDefaultSort(a.email || '', b.email || '');

  /**
   * Sorter logic for Areas column: Sorts by count of assigned areas.
   */
  protected readonly areasSorter: TuiComparator<UserWithRole> = (a, b) =>
    tuiDefaultSort(a.assignedAreas.length, b.assignedAreas.length);

  /**
   * Sorter logic for Centers column: Sorts by count of assigned centers.
   */
  protected readonly centersSorter: TuiComparator<UserWithRole> = (a, b) =>
    tuiDefaultSort(a.assignedCenters.length, b.assignedCenters.length);

  /**
   * Sorter logic for Routesetters column: Sorts by count of routesetter centers.
   */
  protected readonly routesettersSorter: TuiComparator<UserWithRole> = (a, b) =>
    tuiDefaultSort(a.routesetterCenters.length, b.routesetterCenters.length);

  protected readonly defaultSorter: TuiComparator<UserWithRole> =
    this.roleSorter;

  protected readonly sorter = signal<TuiComparator<UserWithRole>>(
    this.defaultSorter,
  );

  protected onSortChange(sort: TuiTableSortChange<UserWithRole>): void {
    this.direction.set(sort.sortDirection);
    this.sorter.set(sort.sortComparator || this.defaultSorter);
  }

  constructor() {
    this.outdoorData.clearSelection();
    if (this.isBrowser) {
      void this.loadUsers();
    }
  }

  private async loadUsers(): Promise<void> {
    try {
      this.loading.set(true);
      await this.supabase.whenReady();

      if (this.outdoorData.areasList().length === 0) {
        await waitForResource(this.outdoorData.areasListResource, 150, 100);
      }
      const areas = this.outdoorData.areasList();
      const areasMap = new Map(areas.map((a) => [a.id, a]));

      const { data: profiles, error: profilesError } =
        await this.supabase.client.rpc('get_admin_users');

      if (profilesError) throw profilesError;
      if (!profiles) {
        this.users.set([]);
        return;
      }

      const { data: mappings, error: mappingsError } =
        await this.supabase.client.from('area_admins').select('*');

      if (mappingsError) throw mappingsError;

      const mappingsByEquipper = new Map<string, number[]>();
      (mappings || []).forEach((m: { user_id: string; area_id: number }) => {
        const list = mappingsByEquipper.get(m.user_id) || [];
        list.push(m.area_id);
        mappingsByEquipper.set(m.user_id, list);
      });

      const { data: centerMappings, error: centerMappingsError } =
        await this.supabase.client.from('indoor_center_admins').select('*');

      if (centerMappingsError) throw centerMappingsError;

      const centerMappingsByEquipper = new Map<string, string[]>();
      (centerMappings || []).forEach(
        (m: { user_id: string | null; center_id: string | null }) => {
          if (!m.user_id || !m.center_id) return;
          const list = centerMappingsByEquipper.get(m.user_id) || [];
          list.push(m.center_id);
          centerMappingsByEquipper.set(m.user_id, list);
        },
      );

      const { data: routesetterMappings, error: routesetterMappingsError } =
        await this.supabase.client
          .from('indoor_center_routesetters')
          .select('*');

      if (routesetterMappingsError) throw routesetterMappingsError;

      const routesetterMappingsByUser = new Map<string, string[]>();
      (routesetterMappings || []).forEach(
        (m: { user_id: string | null; center_id: string | null }) => {
          if (!m.user_id || !m.center_id) return;
          const list = routesetterMappingsByUser.get(m.user_id) || [];
          list.push(m.center_id);
          routesetterMappingsByUser.set(m.user_id, list);
        },
      );

      const centers = await this.indoor.getAllCenters();
      this.availableCenters.set(centers);
      const centersMap = new Map(centers.map((c) => [c.id, c]));

      const currentId = this.currentUserId();
      const usersWithRoles: UserWithRole[] = profiles.map(
        (profile: {
          id: string;
          name: string | null;
          email: string | null;
          avatar: string | null;
          is_admin: boolean;
        }) => {
          const assignedAreaIds = mappingsByEquipper.get(profile.id) || [];
          const assignedAreas = assignedAreaIds
            .map((id) => areasMap.get(id))
            .filter((a): a is AreaListItem => !!a);

          const assignedCenterIds =
            centerMappingsByEquipper.get(profile.id) || [];
          const assignedCenters = assignedCenterIds
            .map((id) => centersMap.get(id))
            .filter((c): c is IndoorCenterDto => !!c);

          const routesetterCenterIds =
            routesetterMappingsByUser.get(profile.id) || [];
          const routesetterCenters = routesetterCenterIds
            .map((id) => centersMap.get(id))
            .filter((c): c is IndoorCenterDto => !!c);

          const isNameSameAsEmail =
            !!profile.name &&
            !!profile.email &&
            profile.name.trim().toLowerCase() ===
              profile.email.trim().toLowerCase();
          const canDelete = isNameSameAsEmail && profile.id !== currentId;

          return {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            avatar: profile.avatar,
            is_admin: !!profile.is_admin,
            canDelete,
            assignedAreas,
            assignedCenters,
            routesetterCenters,
            expandedAreas: false,
            expandedCenters: false,
            expandedRoutesetters: false,
          };
        },
      );

      this.users.set(usersWithRoles);
    } catch (e) {
      console.error('[UsersListAdmin] Exception loading users:', e);
    } finally {
      this.loading.set(false);
    }
  }

  protected toggleExpand(
    user: UserWithRole,
    field: 'areas' | 'centers' | 'routesetters',
    event?: Event,
  ): void {
    event?.stopPropagation();
    this.users.update((list) =>
      list.map((u) => {
        if (u.id !== user.id) return u;
        if (field === 'areas') return { ...u, expandedAreas: true };
        if (field === 'centers') return { ...u, expandedCenters: true };
        return { ...u, expandedRoutesetters: true };
      }),
    );
  }

  protected async openEditPermissions(user: UserWithRole): Promise<void> {
    const dialog = this.editPermissionsDialog();
    if (!dialog) return;

    this.editingUser.set(user);
    this.editAreasControl.setValue([...user.assignedAreas]);
    this.editCentersControl.setValue([...user.assignedCenters]);
    this.editRoutesettersControl.setValue([...user.routesetterCenters]);

    try {
      await firstValueFrom(
        this.dialogs.open<boolean>(dialog, {
          size: 'm',
          label: this.translate.instant('admin.users.editRoles'),
        }),
        { defaultValue: false },
      );
    } catch (e) {
      console.error('[UsersListAdmin] Exception in edit dialog:', e);
    } finally {
      this.editingUser.set(null);
    }
  }

  protected async submitPermissions(
    observer: Observer<boolean>,
  ): Promise<void> {
    const user = this.editingUser();
    if (!user) {
      observer.complete();
      return;
    }

    try {
      this.isSavingPermissions.set(true);
      const newAreas = this.editAreasControl.value;
      const newCenters = this.editCentersControl.value;
      const newRoutesetters = this.editRoutesettersControl.value;

      await Promise.all([
        this.onAreasChange(user.id, newAreas),
        this.onCentersChange(user.id, newCenters),
        this.onRoutesettersChange(user.id, newRoutesetters),
      ]);

      this.users.update((list) =>
        list.map((u) =>
          u.id === user.id
            ? {
                ...u,
                assignedAreas: newAreas,
                assignedCenters: newCenters,
                routesetterCenters: newRoutesetters,
              }
            : u,
        ),
      );

      this.toast.success(this.translate.instant('admin.users.saved'));
      observer.next(true);
      observer.complete();
    } catch (e) {
      console.error('[UsersListAdmin] Error saving permissions:', e);
      this.toast.error(this.translate.instant('admin.users.saveError'));
    } finally {
      this.isSavingPermissions.set(false);
    }
  }

  protected deleteUser(user: UserWithRole): void {
    if (!user.canDelete) return;

    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('admin.users.deleteConfirmTitle'),
        size: 's',
        data: {
          content: this.translate.instant('admin.users.deleteConfirm', {
            name: user.name || user.email || this.translate.instant('user'),
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'primary-destructive',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then((confirmed) => {
      if (confirmed) {
        void this.performDeleteUser(user);
      }
    });
  }

  private async performDeleteUser(user: UserWithRole): Promise<void> {
    try {
      const response = await this.supabase.client.functions.invoke(
        'delete-user',
        {
          method: 'POST',
          body: { userId: user.id },
          headers: {
            'ngsw-bypass': 'true',
          },
        },
      );

      if (response.error) {
        console.error('[UsersListAdmin] Error deleting user:', response.error);
        this.toast.error(this.translate.instant('admin.users.deleteError'));
        return;
      }

      this.users.set(this.users().filter((u) => u.id !== user.id));
      this.toast.success(this.translate.instant('admin.users.deleted'));
    } catch (e) {
      console.error('[UsersListAdmin] Exception deleting user:', e);
      this.toast.error(this.translate.instant('admin.users.deleteError'));
    }
  }

  protected toggleAdminStatus(user: UserWithRole): void {
    if (user.id === this.currentUserId()) {
      this.toast.error(this.translate.instant('admin.users.cannotRemoveSelf'));
      return;
    }

    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('admin.users.confirmTitle'),
        size: 's',
        data: {
          content: this.translate.instant(
            user.is_admin
              ? 'admin.users.revokeConfirm'
              : 'admin.users.makeConfirm',
            { name: user.name || this.translate.instant('anonymous') },
          ),
          yes: this.translate.instant('accept'),
          no: this.translate.instant('cancel'),
          appearance: user.is_admin ? 'negative' : 'primary',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then((confirmed) => {
      if (confirmed) {
        void this.performToggleAdminStatus(user);
      }
    });
  }

  private async performToggleAdminStatus(user: UserWithRole): Promise<void> {
    const newAdminStatus = !user.is_admin;
    try {
      const { error } = await this.supabase.client
        .from('user_profiles')
        .update({ is_admin: newAdminStatus })
        .eq('id', user.id);

      if (error) {
        console.error('[UsersListAdmin] Error updating admin status:', error);
        this.toast.error('Error');
        return;
      }

      // Update local state
      const updatedUsers = this.users().map((u) =>
        u.id === user.id ? { ...u, is_admin: newAdminStatus } : u,
      );
      this.users.set(updatedUsers);

      const msgKey = newAdminStatus
        ? 'admin.users.makeAdmin'
        : 'admin.users.revokeAdmin';
      this.toast.success(this.translate.instant(msgKey));
    } catch (e) {
      console.error('[UsersListAdmin] Exception updating admin status:', e);
      this.toast.error('Error');
    }
  }

  protected async onAreasChange(
    userId: string,
    newAreas: AreaListItem[],
  ): Promise<void> {
    try {
      const user = this.users().find((u) => u.id === userId);
      if (!user) return;

      const oldAreaIds = user.assignedAreas.map((a) => a.id);
      const newAreaIds = newAreas.map((a) => a.id);

      const toAdd = newAreaIds.filter((id) => !oldAreaIds.includes(id));
      const toRemove = oldAreaIds.filter((id) => !newAreaIds.includes(id));

      if (toAdd.length === 0 && toRemove.length === 0) return;

      if (toAdd.length > 0) {
        const { error: addError } = await this.supabase.client
          .from('area_admins')
          .insert(toAdd.map((area_id) => ({ user_id: userId, area_id })));
        if (addError) throw addError;
      }

      if (toRemove.length > 0) {
        const { error: removeError } = await this.supabase.client
          .from('area_admins')
          .delete()
          .eq('user_id', userId)
          .in('area_id', toRemove);
        if (removeError) throw removeError;
      }

      user.assignedAreas = newAreas;

      if (userId === this.currentUserId()) {
        this.cache.remove(CACHE_KEYS.adminAreas(userId));
        this.supabase.adminAreasResource.reload();
      }
    } catch (e) {
      console.error('[UsersListAdmin] Exception updating areas:', e);
      throw e;
    }
  }

  protected async onCentersChange(
    userId: string,
    newCenters: IndoorCenterDto[],
  ): Promise<void> {
    try {
      const user = this.users().find((u) => u.id === userId);
      if (!user) return;

      const oldCenterIds = user.assignedCenters.map((c) => c.id);
      const newCenterIds = newCenters.map((c) => c.id);

      const toAdd = newCenterIds.filter((id) => !oldCenterIds.includes(id));
      const toRemove = oldCenterIds.filter((id) => !newCenterIds.includes(id));

      if (toAdd.length === 0 && toRemove.length === 0) return;

      if (toAdd.length > 0) {
        const { error: addError } = await this.supabase.client
          .from('indoor_center_admins')
          .insert(
            toAdd.map((center_id) => ({
              user_id: userId,
              center_id,
            })),
          );
        if (addError) throw addError;
      }

      if (toRemove.length > 0) {
        const { error: removeError } = await this.supabase.client
          .from('indoor_center_admins')
          .delete()
          .eq('user_id', userId)
          .in('center_id', toRemove);
        if (removeError) throw removeError;
      }

      user.assignedCenters = newCenters;

      if (userId === this.currentUserId()) {
        this.cache.remove(CACHE_KEYS.adminIndoorCenters(userId));
        this.supabase.adminIndoorCentersResource.reload();
      }
    } catch (e) {
      console.error('[UsersListAdmin] Exception updating centers:', e);
      throw e;
    }
  }

  protected async onRoutesettersChange(
    userId: string,
    newCenters: IndoorCenterDto[],
  ): Promise<void> {
    try {
      const user = this.users().find((u) => u.id === userId);
      if (!user) return;

      const oldCenterIds = user.routesetterCenters.map((c) => c.id);
      const newCenterIds = newCenters.map((c) => c.id);

      const toAdd = newCenterIds.filter((id) => !oldCenterIds.includes(id));
      const toRemove = oldCenterIds.filter((id) => !newCenterIds.includes(id));

      if (toAdd.length === 0 && toRemove.length === 0) return;

      if (toAdd.length > 0) {
        const { error: addError } = await this.supabase.client
          .from('indoor_center_routesetters')
          .insert(
            toAdd.map((center_id) => ({
              user_id: userId,
              center_id,
            })),
          );
        if (addError) throw addError;
      }

      if (toRemove.length > 0) {
        const { error: removeError } = await this.supabase.client
          .from('indoor_center_routesetters')
          .delete()
          .eq('user_id', userId)
          .in('center_id', toRemove);
        if (removeError) throw removeError;
      }

      user.routesetterCenters = newCenters;

      if (userId === this.currentUserId()) {
        this.supabase.routesetterIndoorCentersResource.reload();
      }
    } catch (e) {
      console.error('[UsersListAdmin] Exception updating routesetters:', e);
      throw e;
    }
  }
}

export default AdminUsersListComponent;
