import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  output,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  TuiAppearance,
  TuiButton,
  TuiDropdown,
  TuiIcon,
  TuiLabel,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiBadgeNotification,
  TuiChevron,
  TuiComboBox,
  TuiDataListWrapper,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AppDialogsService } from '../../services/app-dialogs.service';
import { CacheService } from '../../services/cache.service';
import { IndoorService } from '../../services/indoor.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { UserProfilesService } from '../../services/user-profiles.service';

import {
  IndoorCenterRoutesetterRequestWithCenter,
  UserProfileBasicDto,
} from '../../models';

import { CACHE_KEYS } from '../../constants';
import { AvatarUrlPipe, InitialsPipe } from '../../pipes';

import { IS_BROWSER } from '../../app/is-browser';

export interface IndoorCenterStaffMember {
  user_id: string | null;
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
}

@Component({
  selector: 'app-indoor-center-staff-section',
  imports: [
    AvatarUrlPipe,
    DatePipe,
    FormsModule,
    InitialsPipe,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgeNotification,
    TuiButton,
    TuiChevron,
    TuiComboBox,
    TuiDataListWrapper,
    TuiDropdown,
    TuiIcon,
    TuiLabel,
    TuiTextfield,
  ],
  template: `
    <div class="flex flex-col gap-8">
      <!-- Current Admins Section -->
      @let currentAdmins = centerAdmins();
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span
            class="text-xs uppercase font-semibold tracking-wider opacity-75"
          >
            {{ 'admins' | translate }}
          </span>

          <!-- Add Admin Search / Combobox -->
          <div class="w-64 max-w-full">
            <tui-textfield
              appearance="floating"
              size="s"
              tuiChevron
              [tuiTextfieldCleaner]="true"
              [stringify]="stringifyUser"
              class="rounded-full!"
            >
              <label tuiLabel for="form-admin-search">
                {{ 'addUser' | translate }}
              </label>
              <input
                id="form-admin-search"
                tuiComboBox
                [matcher]="null"
                [placeholder]="'searchPlaceholder' | translate"
                (ngModelChange)="onAdminSelected($event, formAdminSearchInput)"
                [ngModel]="selectedAdminUser()"
                [ngModelOptions]="{ standalone: true }"
                (input.zoneless)="
                  adminSearchQuery.set(formAdminSearchInput.value)
                "
                #formAdminSearchInput
              />
              <tui-data-list-wrapper *tuiDropdown [items]="foundAdminUsers()" />
            </tui-textfield>
          </div>
        </div>

        @if (currentAdmins.length > 0) {
          <div class="flex flex-wrap gap-2.5 items-center">
            @for (admin of currentAdmins; track admin.user_id) {
              <div
                class="flex items-center gap-2 bg-(--tui-background-neutral-1) py-1 px-1 pr-2 rounded-full border border-(--tui-border-normal) group"
              >
                <a
                  [routerLink]="['/profile', admin.user_id]"
                  class="flex items-center gap-2 no-underline text-inherit select-none"
                >
                  @if (admin.user.avatar) {
                    <span tuiAvatar size="s">
                      <img
                        [src]="admin.user.avatar | avatarUrl"
                        [alt]="admin.user.name"
                      />
                    </span>
                  } @else {
                    <span tuiAvatar size="s">
                      {{ admin.user.name | initials }}
                    </span>
                  }
                  <span class="text-sm font-medium">
                    {{ admin.user.name }}
                  </span>
                </a>
                <button
                  tuiIconButton
                  appearance="flat"
                  size="xs"
                  type="button"
                  iconStart="@tui.x"
                  [attr.aria-label]="'delete' | translate"
                  class="opacity-0 group-hover:opacity-50 hover:opacity-100! transition-opacity -mr-1"
                  (click.zoneless)="
                    removeAdmin(admin.user_id || '', admin.user.name, $event)
                  "
                ></button>
              </div>
            }
          </div>
        } @else {
          <div
            class="p-4 text-center text-xs opacity-60 rounded-xl bg-(--tui-background-neutral-1) border border-dashed border-(--tui-border-normal)"
          >
            {{ 'empty' | translate }}
          </div>
        }
      </div>

      <div class="border-t border-(--tui-border-normal)"></div>

      <!-- Routesetters Section -->
      <div class="flex flex-col gap-6">
        <!-- Pending Requests Section -->
        @let pending = pendingRequests();
        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <tui-icon icon="@tui.clock" class="text-xs" />
            <span
              class="text-xs uppercase font-semibold tracking-wider opacity-75"
            >
              {{ 'admin.routesetterRequests.title' | translate }}
            </span>
            @if (pending.length > 0) {
              <tui-badge-notification tuiAppearance="accent" size="s">
                {{ pending.length }}
              </tui-badge-notification>
            }
          </div>

          @if (pending.length > 0) {
            <div class="flex flex-col gap-2.5">
              @for (req of pending; track req.id) {
                <div
                  class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal)"
                >
                  <a
                    [routerLink]="['/profile', req.user.id]"
                    class="flex items-center gap-3 no-underline text-inherit"
                  >
                    <span tuiAvatar size="m">
                      @if (req.user.avatar; as avatar) {
                        <img [src]="avatar | avatarUrl" alt="avatar" />
                      } @else {
                        {{ req.user.name | initials }}
                      }
                    </span>
                    <div class="flex flex-col min-w-0">
                      <span class="font-bold text-sm truncate">
                        {{ req.user.name || ('anonymous' | translate) }}
                      </span>
                      <span class="text-xs opacity-60">
                        {{ req.created_at | date: 'mediumDate' }}
                      </span>
                    </div>
                  </a>

                  <div
                    class="flex items-center gap-2 flex-nowrap whitespace-nowrap self-end sm:self-auto shrink-0"
                  >
                    <button
                      tuiButton
                      size="s"
                      appearance="primary"
                      type="button"
                      class="rounded-full! shrink-0"
                      (click.zoneless)="approveRoutesetter(req, $event)"
                    >
                      {{ 'adminRequests.approve' | translate }}
                    </button>
                    <button
                      tuiButton
                      size="s"
                      appearance="negative"
                      type="button"
                      class="rounded-full! shrink-0"
                      (click.zoneless)="rejectRoutesetter(req, $event)"
                    >
                      {{ 'adminRequests.reject' | translate }}
                    </button>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div
              class="p-4 text-center text-xs opacity-60 rounded-xl bg-(--tui-background-neutral-1) border border-dashed border-(--tui-border-normal)"
            >
              {{ 'admin.routesetterRequests.empty' | translate }}
            </div>
          }
        </div>

        <!-- Current Routesetters Section -->
        @let currentRoutesetters = centerRoutesetters();
        <div class="flex flex-col gap-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span
              class="text-xs uppercase font-semibold tracking-wider opacity-75"
            >
              {{ 'routesetters' | translate }}
            </span>

            <!-- Add Routesetter Search / Combobox -->
            <div class="w-64 max-w-full">
              <tui-textfield
                appearance="floating"
                size="s"
                tuiChevron
                [tuiTextfieldCleaner]="true"
                [stringify]="stringifyUser"
                class="rounded-full!"
              >
                <label tuiLabel for="form-routesetter-search">
                  {{ 'addUser' | translate }}
                </label>
                <input
                  id="form-routesetter-search"
                  tuiComboBox
                  [matcher]="null"
                  [placeholder]="'searchPlaceholder' | translate"
                  (ngModelChange)="
                    onRoutesetterSelected($event, formRoutesetterSearchInput)
                  "
                  [ngModel]="selectedRoutesetterUser()"
                  [ngModelOptions]="{ standalone: true }"
                  (input.zoneless)="
                    routesetterSearchQuery.set(formRoutesetterSearchInput.value)
                  "
                  #formRoutesetterSearchInput
                />
                <tui-data-list-wrapper
                  *tuiDropdown
                  [items]="foundRoutesetterUsers()"
                />
              </tui-textfield>
            </div>
          </div>

          @if (currentRoutesetters.length > 0) {
            <div class="flex flex-wrap gap-2.5 items-center">
              @for (rs of currentRoutesetters; track rs.user_id) {
                <div
                  class="flex items-center gap-2 bg-(--tui-background-neutral-1) py-1 px-1 pr-2 rounded-full border border-(--tui-border-normal) group"
                >
                  <a
                    [routerLink]="['/profile', rs.user_id]"
                    class="flex items-center gap-2 no-underline text-inherit select-none"
                  >
                    @if (rs.user.avatar) {
                      <span tuiAvatar size="s">
                        <img
                          [src]="rs.user.avatar | avatarUrl"
                          [alt]="rs.user.name"
                        />
                      </span>
                    } @else {
                      <span tuiAvatar size="s">
                        {{ rs.user.name | initials }}
                      </span>
                    }
                    <span class="text-sm font-medium">
                      {{ rs.user.name }}
                    </span>
                  </a>
                  <button
                    tuiIconButton
                    appearance="flat"
                    size="xs"
                    type="button"
                    iconStart="@tui.x"
                    [attr.aria-label]="'delete' | translate"
                    class="opacity-0 group-hover:opacity-50 hover:opacity-100! transition-opacity -mr-1"
                    (click.zoneless)="
                      removeRoutesetter(rs.user_id || '', $event)
                    "
                  ></button>
                </div>
              }
            </div>
          } @else {
            <div
              class="p-4 text-center text-xs opacity-60 rounded-xl bg-(--tui-background-neutral-1) border border-dashed border-(--tui-border-normal)"
            >
              {{ 'empty' | translate }}
            </div>
          }
        </div>
      </div>
    </div>
  `,
  host: { class: 'block w-full' },
})
export class IndoorCenterStaffSectionComponent {
  private readonly indoor = inject(IndoorService);
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);
  private readonly appDialogs = inject(AppDialogsService);
  private readonly userProfiles = inject(UserProfilesService);
  private readonly cache = inject(CacheService);
  private readonly translate = inject(TranslateService);
  private readonly isBrowser = inject(IS_BROWSER);

  readonly centerId = input<string | undefined>(undefined);
  readonly pendingRequests = input<
    readonly IndoorCenterRoutesetterRequestWithCenter[]
  >([]);

  readonly pendingRequestsChanged = output<void>();

  protected readonly adminSearchQuery = signal('');
  protected readonly selectedAdminUser = signal<UserProfileBasicDto | null>(
    null,
  );
  protected readonly routesetterSearchQuery = signal('');
  protected readonly selectedRoutesetterUser =
    signal<UserProfileBasicDto | null>(null);

  protected readonly centerAdminsResource = resource({
    params: () => this.centerId(),
    loader: async ({ params: centerId }) => {
      if (!centerId || !this.isBrowser) return [];
      return await this.loadRoleMembers('indoor_center_admins', centerId);
    },
  });

  readonly centerAdmins = computed(
    () => this.centerAdminsResource.value() ?? [],
  );

  protected readonly foundAdminUsersResource = resource({
    params: () => this.adminSearchQuery().trim(),
    loader: async ({ params: query }) => {
      if (query.length < 2) return [];
      return await this.userProfiles.searchUsers(query);
    },
  });

  protected readonly foundAdminUsers = computed(
    () => this.foundAdminUsersResource.value() ?? [],
  );

  protected readonly centerRoutesettersResource = resource({
    params: () => this.centerId(),
    loader: async ({ params: centerId }) => {
      if (!centerId || !this.isBrowser) return [];
      return await this.loadRoleMembers('indoor_center_routesetters', centerId);
    },
  });

  readonly centerRoutesetters = computed(
    () => this.centerRoutesettersResource.value() ?? [],
  );

  protected readonly foundRoutesetterUsersResource = resource({
    params: () => this.routesetterSearchQuery().trim(),
    loader: async ({ params: query }) => {
      if (query.length < 2) return [];
      return await this.userProfiles.searchUsers(query);
    },
  });

  protected readonly foundRoutesetterUsers = computed(
    () => this.foundRoutesetterUsersResource.value() ?? [],
  );

  protected readonly stringifyUser = (u: UserProfileBasicDto) => u.name || '';

  private async loadRoleMembers(
    table: 'indoor_center_admins' | 'indoor_center_routesetters',
    centerId: string,
  ): Promise<IndoorCenterStaffMember[]> {
    await this.supabase.whenReady();

    const { data: mappings, error: mappingError } = await this.supabase.client
      .from(table)
      .select('user_id')
      .eq('center_id', centerId);

    if (mappingError || !mappings?.length) {
      if (mappingError) {
        console.error(
          `[IndoorCenterStaffSectionComponent] Error fetching ${table} mappings:`,
          mappingError,
        );
      }
      return [];
    }

    const userIds = mappings
      .map((m) => m.user_id)
      .filter((id): id is string => !!id);
    const { data: profiles, error: profilesError } = await this.supabase.client
      .from('user_profiles')
      .select('id, name, avatar')
      .in('id', userIds);

    if (profilesError) {
      console.error(
        `[IndoorCenterStaffSectionComponent] Error fetching ${table} profiles:`,
        profilesError,
      );
      return [];
    }

    return mappings.map((m) => ({
      user_id: m.user_id,
      user: profiles.find((p) => p.id === m.user_id) || {
        id: m.user_id || '',
        name: 'Unknown',
        avatar: null,
      },
    }));
  }

  async approveRoutesetter(
    req: IndoorCenterRoutesetterRequestWithCenter,
    event?: Event,
  ): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    const centerId = this.centerId();
    if (!centerId) return;
    const success = await this.indoor.approveIndoorCenterRoutesetterRequest(
      req.id,
      centerId,
      req.user.id,
    );
    if (success) {
      this.pendingRequestsChanged.emit();
      this.centerRoutesettersResource.reload();
    }
  }

  async rejectRoutesetter(
    req: IndoorCenterRoutesetterRequestWithCenter,
    event?: Event,
  ): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    const success = await this.indoor.rejectIndoorCenterRoutesetterRequest(
      req.id,
    );
    if (success) {
      this.pendingRequestsChanged.emit();
    }
  }

  async addRoutesetter(
    user: UserProfileBasicDto,
    event?: Event,
  ): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    const centerId = this.centerId();
    if (!centerId) return;

    const { error } = await this.supabase.client
      .from('indoor_center_routesetters')
      .insert({ center_id: centerId, user_id: user.id });

    if (error) {
      if (error.code === '23505') {
        this.toast.info('adminRequests.alreadyRequested');
      } else {
        console.error(
          '[IndoorCenterStaffSectionComponent] Error adding routesetter:',
          error,
        );
        this.toast.error('errors.unexpected');
      }
      return;
    }

    this.toast.success('messages.toasts.routesetterAdded');
    this.centerRoutesettersResource.reload();
    if (user.id === this.supabase.authUserId()) {
      this.supabase.routesetterIndoorCentersResource.reload();
    }
    this.routesetterSearchQuery.set('');
  }

  async removeRoutesetter(userId: string | null, event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    const centerId = this.centerId();
    if (!centerId || !userId) return;

    const { error } = await this.supabase.client
      .from('indoor_center_routesetters')
      .delete()
      .eq('center_id', centerId)
      .eq('user_id', userId);

    if (error) {
      console.error(
        '[IndoorCenterStaffSectionComponent] Error removing routesetter:',
        error,
      );
      this.toast.error('errors.unexpected');
      return;
    }

    this.toast.success('messages.toasts.routesetterRemoved');
    this.centerRoutesettersResource.reload();
    if (userId === this.supabase.authUserId()) {
      this.supabase.routesetterIndoorCentersResource.reload();
    }
  }

  protected onRoutesetterSelected(
    user: UserProfileBasicDto | null,
    inputEl?: HTMLInputElement,
  ): void {
    if (!user) return;
    void this.addRoutesetter(user);
    this.routesetterSearchQuery.set('');
    this.selectedRoutesetterUser.set(user);
    setTimeout(() => {
      this.selectedRoutesetterUser.set(null);
      if (inputEl) {
        inputEl.value = '';
        inputEl.blur();
      }
    });
  }

  async addAdmin(user: UserProfileBasicDto, event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    const centerId = this.centerId();
    if (!centerId) return;

    const { error } = await this.supabase.client
      .from('indoor_center_admins')
      .insert({ center_id: centerId, user_id: user.id });

    if (error) {
      if (error.code === '23505') {
        this.toast.info('adminRequests.alreadyRequested');
      } else {
        console.error(
          '[IndoorCenterStaffSectionComponent] Error adding admin:',
          error,
        );
        this.toast.error('errors.unexpected');
      }
      return;
    }

    this.toast.success('messages.toasts.adminAdded');
    this.centerAdminsResource.reload();
    if (user.id === this.supabase.authUserId()) {
      this.cache.remove(CACHE_KEYS.adminIndoorCenters(user.id));
      this.supabase.adminIndoorCentersResource.reload();
    }
    this.adminSearchQuery.set('');
  }

  async removeAdmin(
    userId: string,
    userName?: string | null,
    event?: Event,
  ): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    const centerId = this.centerId();
    if (!centerId || !userId) return;
    if (!this.isBrowser) return;

    const confirmed = await this.appDialogs.confirm({
      labelKey: 'indoor.removeAdminTitle',
      contentKey: 'indoor.removeAdminConfirm',
      contentParams: {
        name: userName || this.translate.instant('user'),
      },
      yesKey: 'delete',
      appearance: 'primary-destructive',
    });

    if (!confirmed) return;

    const { error } = await this.supabase.client
      .from('indoor_center_admins')
      .delete()
      .eq('center_id', centerId)
      .eq('user_id', userId);

    if (error) {
      console.error(
        '[IndoorCenterStaffSectionComponent] Error removing admin:',
        error,
      );
      this.toast.error('errors.unexpected');
      return;
    }

    this.toast.success('messages.toasts.adminRemoved');
    this.centerAdminsResource.reload();
    if (userId === this.supabase.authUserId()) {
      this.cache.remove(CACHE_KEYS.adminIndoorCenters(userId));
      this.supabase.adminIndoorCentersResource.reload();
    }
  }

  protected onAdminSelected(
    user: UserProfileBasicDto | null,
    inputEl?: HTMLInputElement,
  ): void {
    if (!user) return;
    void this.addAdmin(user);
    this.adminSearchQuery.set('');
    this.selectedAdminUser.set(user);
    setTimeout(() => {
      this.selectedAdminUser.set(null);
      if (inputEl) {
        inputEl.value = '';
        inputEl.blur();
      }
    });
  }
}
