import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  TuiDialogService,
  TuiFilterByInputPipe,
  TuiIcon,
  TuiInput,
  TuiLink,
  TuiOptGroup,
  TuiScrollbar,
  TuiTitle,
} from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiBadgeNotification,
  TuiBadgedContentComponent,
  TuiBadgedContentDirective,
  TuiChevron,
  TUI_CONFIRM,
  type TuiConfirmData,
  TuiComboBox,
  TuiDataListWrapper,
  TuiInputChip,
  TuiMultiSelect,
  TuiSkeleton,
} from '@taiga-ui/kit';

import { WaIntersectionObserver } from '@ng-web-apis/intersection-observer';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { IndoorService } from '../../services/indoor.service';
import { LayoutService } from '../../services/layout.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

import { EmptyStateComponent } from '../../components/ui/empty-state';

import { AreaListItem, IndoorCenterDto } from '../../models';

import { AvatarUrlPipe } from '../../pipes';

import { matchesQuery } from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

interface UserWithRole {
  id: string;
  name: string | null;
  avatar: string | null;
  is_admin: boolean;
  assignedAreas: AreaListItem[];
  areasControl: FormControl<AreaListItem[]>;
  assignedCenters: IndoorCenterDto[];
  centersControl: FormControl<IndoorCenterDto[]>;
}

@Component({
  selector: 'app-users-list-admin',
  standalone: true,
  imports: [
    AvatarUrlPipe,
    EmptyStateComponent,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
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
    TuiLink,
    TuiMultiSelect,
    TuiOptGroup,
    TuiScrollbar,
    TuiSkeleton,
    TuiTable,
    TuiTitle,
    WaIntersectionObserver,
  ],
  template: `
    <section class="flex flex-col w-full max-w-5xl mx-auto p-4">
      <header class="mb-4 flex items-center justify-between gap-2">
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
              <span
                tuiAvatar="@tui.users"
                tuiThumbnail
                size="l"
                class="self-center"
                [attr.aria-label]="'admin.users.title' | translate"
              ></span>
            </tui-badged-content>
            {{ 'admin.users.title' | translate }}
          </a>
        </h1>
      </header>

      <div class="mb-6 flex flex-col sm:flex-row gap-3">
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

      <tui-scrollbar waIntersectionRoot class="flex grow">
        @if (filteredUsers().length > 0) {
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
              <tr tuiThGroup>
                <th
                  *tuiHead="'user'"
                  tuiTh
                  class="user-column min-w-[240px]"
                  [sorter]="userSorter"
                >
                  {{ 'user' | translate }}
                </th>
                <th
                  *tuiHead="'role'"
                  tuiTh
                  class="role-column min-w-[240px]"
                  [sorter]="roleSorter"
                >
                  {{ 'role' | translate }}
                </th>
                <th
                  *tuiHead="'areas'"
                  tuiTh
                  class="areas-column min-w-[260px]"
                  [sorter]="areasSorter"
                >
                  {{ 'areas' | translate }}
                </th>
                <th
                  *tuiHead="'centers'"
                  tuiTh
                  class="centers-column min-w-[260px]"
                  [sorter]="centersSorter"
                >
                  {{ 'indoor.title' | translate }}
                </th>
              </tr>
            </thead>

            <tbody tuiTbody [data]="sortedUsersList">
              @if (loading()) {
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
                    <td *tuiCell="'role'" tuiTd class="role-cell">
                      <div [tuiSkeleton]="true" class="w-24 h-8"></div>
                    </td>
                    <td *tuiCell="'areas'" tuiTd class="areas-column">
                      <div [tuiSkeleton]="true" class="w-full h-10"></div>
                    </td>
                    <td *tuiCell="'centers'" tuiTd class="centers-column">
                      <div [tuiSkeleton]="true" class="w-full h-10"></div>
                    </td>
                  </tr>
                }
              } @else {
                @for (user of sortedUsersList; track user.id) {
                  <tr tuiTr [class.is-current]="user.id === currentUserId()">
                    <td *tuiCell="'user'" tuiTd class="user-cell">
                      <div class="flex items-center gap-3 min-w-0">
                        <a
                          [routerLink]="['/profile', user.id]"
                          class="shrink-0"
                        >
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
                        </div>
                      </div>
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
                          [icon]="
                            user.is_admin ? '@tui.shield' : '@tui.shield-off'
                          "
                          size="s"
                        />
                        Admin
                      </button>
                    </td>

                    <td *tuiCell="'areas'" tuiTd class="areas-column">
                      @if (!user.is_admin) {
                        <tui-textfield
                          multi
                          tuiChevron
                          [stringify]="stringifyArea"
                          [disabledItemHandler]="strings"
                          [identityMatcher]="areaIdentityMatcher"
                          [tuiTextfieldCleaner]="false"
                        >
                          <input
                            tuiInputChip
                            id="areas-select-{{ user.id }}"
                            [formControl]="user.areasControl"
                            [placeholder]="'select' | translate"
                            autocomplete="off"
                          />
                          <tui-input-chip *tuiItem />
                          <tui-data-list *tuiDropdown>
                            <tui-opt-group
                              [label]="'areas' | translate"
                              tuiMultiSelectGroup
                            >
                              @for (
                                area of availableAreas() | tuiFilterByInput;
                                track area.id
                              ) {
                                <button
                                  type="button"
                                  new
                                  tuiOption
                                  [value]="area"
                                >
                                  <div tuiCell size="s">
                                    <div tuiTitle>
                                      {{ area.name }}
                                    </div>
                                  </div>
                                </button>
                              }
                            </tui-opt-group>
                          </tui-data-list>
                        </tui-textfield>
                      }
                    </td>
                    <td *tuiCell="'centers'" tuiTd class="centers-column">
                      @if (!user.is_admin) {
                        <tui-textfield
                          multi
                          tuiChevron
                          [stringify]="stringifyCenter"
                          [disabledItemHandler]="strings"
                          [identityMatcher]="centerIdentityMatcher"
                          [tuiTextfieldCleaner]="false"
                        >
                          <input
                            tuiInputChip
                            id="centers-select-{{ user.id }}"
                            [formControl]="user.centersControl"
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
                                <button
                                  type="button"
                                  new
                                  tuiOption
                                  [value]="center"
                                >
                                  <div tuiCell size="s">
                                    <div tuiTitle>
                                      {{ center.name }}
                                    </div>
                                  </div>
                                </button>
                              }
                            </tui-opt-group>
                          </tui-data-list>
                        </tui-textfield>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        } @else {
          <app-empty-state icon="@tui.users" />
        }
      </tui-scrollbar>
    </section>
  `,
  styles: [
    `
      .is-current {
        background-color: var(--tui-status-info-pale);
      }

      .user-column {
        min-width: 240px;
      }

      .role-column {
        min-width: 240px;
      }

      .areas-column {
        min-width: 280px;
      }

      .centers-column {
        min-width: 280px;
      }

      .user-cell {
        padding: 0.75rem 0.5rem;
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogs = inject(TuiDialogService);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);

  protected readonly columns = ['user', 'role', 'areas', 'centers'];

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
      this.users().flatMap((u) => u.assignedCenters.map((c) => c.id)),
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
      list = list.filter((u) => matchesQuery(u.name, query));
    }

    if (area) {
      list = list.filter((u) => u.assignedAreas.some((a) => a.id === area.id));
    }

    if (center) {
      list = list.filter((u) =>
        u.assignedCenters.some((c) => c.id === center.id),
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

  protected readonly skeletons = Array(25).fill(0);
  protected readonly direction = signal<TuiSortDirection>(TuiSortDirection.Asc);

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
   * Sorter logic for Areas column: Sorts by count of assigned areas.
   */
  protected readonly areasSorter: TuiComparator<UserWithRole> = (a, b) =>
    tuiDefaultSort(a.assignedAreas.length, b.assignedAreas.length);

  /**
   * Sorter logic for Centers column: Sorts by count of assigned centers.
   */
  protected readonly centersSorter: TuiComparator<UserWithRole> = (a, b) =>
    tuiDefaultSort(a.assignedCenters.length, b.assignedCenters.length);

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

      // 1. Load areas if not already loaded
      if (this.outdoorData.areasList().length === 0) {
        while (this.outdoorData.areasListResource.isLoading()) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      const areas = this.outdoorData.areasList();
      const areasMap = new Map(areas.map((a) => [a.id, a]));

      // 2. Fetch user profiles (including is_admin)
      const { data: profiles, error: profilesError } =
        await this.supabase.client
          .from('user_profiles')
          .select('id, name, avatar, is_admin');

      if (profilesError) throw profilesError;
      if (!profiles) {
        this.users.set([]);
        return;
      }

      // 3. Fetch all area-admin mappings
      const { data: mappings, error: mappingsError } =
        await this.supabase.client.from('area_admins').select('*');

      if (mappingsError) throw mappingsError;

      const mappingsByEquipper = new Map<string, number[]>();
      (mappings || []).forEach((m: { user_id: string; area_id: number }) => {
        const list = mappingsByEquipper.get(m.user_id) || [];
        list.push(m.area_id);
        mappingsByEquipper.set(m.user_id, list);
      });

      // 4. Fetch indoor center admins
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

      // 5. Fetch available centers
      const centers = await this.indoor.getAllCenters();
      this.availableCenters.set(centers);
      const centersMap = new Map(centers.map((c) => [c.id, c]));

      const usersWithRoles: UserWithRole[] = profiles.map(
        (profile: {
          id: string;
          name: string | null;
          avatar: string | null;
          is_admin: boolean | null;
        }) => {
          const assignedAreaIds = mappingsByEquipper.get(profile.id) || [];
          const assignedAreas = assignedAreaIds
            .map((id) => areasMap.get(id))
            .filter((a): a is AreaListItem => !!a);

          const areasControl = new FormControl(assignedAreas, {
            nonNullable: true,
          });
          areasControl.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((newAreas: AreaListItem[]) => {
              void this.onAreasChange(profile.id, newAreas);
            });

          const assignedCenterIds =
            centerMappingsByEquipper.get(profile.id) || [];
          const assignedCenters = assignedCenterIds
            .map((id) => centersMap.get(id))
            .filter((c): c is IndoorCenterDto => !!c);

          const centersControl = new FormControl(assignedCenters, {
            nonNullable: true,
          });
          centersControl.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((newCenters: IndoorCenterDto[]) => {
              void this.onCentersChange(profile.id, newCenters);
            });

          return {
            id: profile.id,
            name: profile.name,
            avatar: profile.avatar,
            is_admin: !!profile.is_admin,
            assignedAreas,
            areasControl,
            assignedCenters,
            centersControl,
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
    } catch (e) {
      console.error('[UsersListAdmin] Exception updating areas:', e);
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
    } catch (e) {
      console.error('[UsersListAdmin] Exception updating centers:', e);
    }
  }
}

export default AdminUsersListComponent;
