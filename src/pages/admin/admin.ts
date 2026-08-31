import {
  ChangeDetectionStrategy,
  Component,
  inject,
  resource,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiAppearance, TuiIcon, TuiScrollbar, TuiTitle } from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiAvatarStack,
  TuiBadgedContent,
  TuiBadgeNotification,
} from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe } from '@ngx-translate/core';

import { SupabaseService } from '../../services/supabase.service';

import { AvatarUrlPipe } from '../../pipes';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    AvatarUrlPipe,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiAvatarStack,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiHeader,
    TuiIcon,
    TuiScrollbar,
    TuiTitle,
  ],
  template: `
    <tui-scrollbar class="flex grow">
      <div class="p-4 md:p-6 flex flex-col gap-8 max-w-5xl mx-auto w-full">
        <header tuiHeader>
          <h1 tuiTitle class="text-2xl font-bold">
            {{ 'admin.title' | translate }}
          </h1>
        </header>

        <!-- Section 1: Users & Permissions -->
        <section class="flex flex-col gap-3">
          <h2
            class="text-xs font-semibold uppercase tracking-wider text-(--tui-text-tertiary) px-1"
          >
            {{ 'admin.categories.usersAndPermissions' | translate }}
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <!-- Users -->
            <a
              routerLink="/admin/users"
              class="group flex items-center gap-3.5 p-4 bg-(--tui-background-base) rounded-2xl border border-(--tui-border-normal) no-underline text-inherit hover:bg-(--tui-background-neutral-1) hover:border-(--tui-border-hover) hover:shadow-xs transition-all"
            >
              <tui-badged-content [style.--tui-radius.%]="50" class="shrink-0">
                @if (countsResource.value()?.users; as count) {
                  <ng-container tuiSlot="top">
                    <tui-badge-notification tuiAppearance="accent" size="s">
                      {{ count }}
                    </tui-badge-notification>
                  </ng-container>
                }
                <div
                  class="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0"
                >
                  <tui-icon icon="@tui.users" />
                </div>
              </tui-badged-content>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <span class="font-bold text-sm truncate">{{
                    'nav.admin-users' | translate
                  }}</span>

                  @if (usersSampleResource.value(); as users) {
                    <tui-avatar-stack class="shrink-0">
                      @for (user of users; track user.id) {
                        <span tuiAvatar size="s">
                          @if (user.avatar_url; as url) {
                            <img [src]="url | avatarUrl" alt="avatar" />
                          } @else {
                            <tui-icon icon="@tui.user" />
                          }
                        </span>
                      }
                    </tui-avatar-stack>
                  }
                </div>
                <p
                  class="text-xs text-(--tui-text-secondary) mt-0.5 line-clamp-1"
                >
                  {{ 'admin.users.description' | translate }}
                </p>
              </div>

              <tui-icon
                icon="@tui.chevron-right"
                class="text-(--tui-text-tertiary) text-sm group-hover:translate-x-0.5 transition-transform shrink-0"
              />
            </a>

            <!-- Area Requests -->
            <a
              routerLink="/admin/requests"
              class="group flex items-center gap-3.5 p-4 bg-(--tui-background-base) rounded-2xl border border-(--tui-border-normal) no-underline text-inherit hover:bg-(--tui-background-neutral-1) hover:border-(--tui-border-hover) hover:shadow-xs transition-all"
            >
              <tui-badged-content [style.--tui-radius.%]="50" class="shrink-0">
                @if (countsResource.value()?.areaRequests; as count) {
                  <ng-container tuiSlot="top">
                    <tui-badge-notification tuiAppearance="accent" size="s">
                      {{ count }}
                    </tui-badge-notification>
                  </ng-container>
                }
                <div
                  class="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center"
                >
                  <tui-icon icon="@tui.shield" />
                </div>
              </tui-badged-content>

              <div class="flex-1 min-w-0">
                <span class="font-bold text-sm block truncate">
                  {{ 'adminRequests.manageTitle' | translate }}
                </span>
                <p
                  class="text-xs text-(--tui-text-secondary) mt-0.5 line-clamp-1"
                >
                  {{ 'adminRequests.manageDescription' | translate }}
                </p>
              </div>

              <tui-icon
                icon="@tui.chevron-right"
                class="text-(--tui-text-tertiary) text-sm group-hover:translate-x-0.5 transition-transform shrink-0"
              />
            </a>
          </div>
        </section>

        <!-- Section 2: Equippers -->
        <section class="flex flex-col gap-3">
          <h2
            class="text-xs font-semibold uppercase tracking-wider text-(--tui-text-tertiary) px-1"
          >
            {{ 'admin.categories.equippers' | translate }}
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <!-- Equippers List -->
            <a
              routerLink="/admin/equippers"
              class="group flex items-center gap-3.5 p-4 bg-(--tui-background-base) rounded-2xl border border-(--tui-border-normal) no-underline text-inherit hover:bg-(--tui-background-neutral-1) hover:border-(--tui-border-hover) hover:shadow-xs transition-all"
            >
              <tui-badged-content [style.--tui-radius.%]="50" class="shrink-0">
                @if (countsResource.value()?.equippers; as count) {
                  <ng-container tuiSlot="top">
                    <tui-badge-notification tuiAppearance="accent" size="s">
                      {{ count }}
                    </tui-badge-notification>
                  </ng-container>
                }
                <div
                  class="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"
                >
                  <tui-icon icon="@tui.hammer" />
                </div>
              </tui-badged-content>

              <div class="flex-1 min-w-0">
                <span class="font-bold text-sm block truncate">
                  {{ 'nav.admin-equippers' | translate }}
                </span>
                <p
                  class="text-xs text-(--tui-text-secondary) mt-0.5 line-clamp-1"
                >
                  {{ 'admin.equippers.description' | translate }}
                </p>
              </div>

              <tui-icon
                icon="@tui.chevron-right"
                class="text-(--tui-text-tertiary) text-sm group-hover:translate-x-0.5 transition-transform shrink-0"
              />
            </a>

            <!-- Equipper Requests -->
            <a
              routerLink="/admin/equipper-requests"
              class="group flex items-center gap-3.5 p-4 bg-(--tui-background-base) rounded-2xl border border-(--tui-border-normal) no-underline text-inherit hover:bg-(--tui-background-neutral-1) hover:border-(--tui-border-hover) hover:shadow-xs transition-all"
            >
              <tui-badged-content [style.--tui-radius.%]="50" class="shrink-0">
                @if (countsResource.value()?.equipperRequests; as count) {
                  <ng-container tuiSlot="top">
                    <tui-badge-notification tuiAppearance="accent" size="s">
                      {{ count }}
                    </tui-badge-notification>
                  </ng-container>
                }
                <div
                  class="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"
                >
                  <tui-icon icon="@tui.user-check" />
                </div>
              </tui-badged-content>

              <div class="flex-1 min-w-0">
                <span class="font-bold text-sm block truncate">
                  {{ 'adminEquipperRequests.title' | translate }}
                </span>
                <p
                  class="text-xs text-(--tui-text-secondary) mt-0.5 line-clamp-1"
                >
                  {{ 'adminEquipperRequests.description' | translate }}
                </p>
              </div>

              <tui-icon
                icon="@tui.chevron-right"
                class="text-(--tui-text-tertiary) text-sm group-hover:translate-x-0.5 transition-transform shrink-0"
              />
            </a>
          </div>
        </section>

        <!-- Section 3: Content & Map -->
        <section class="flex flex-col gap-3">
          <h2
            class="text-xs font-semibold uppercase tracking-wider text-(--tui-text-tertiary) px-1"
          >
            {{ 'admin.categories.contentAndMap' | translate }}
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <!-- Unification -->
            <a
              routerLink="/admin/unify"
              class="group flex items-center gap-3.5 p-4 bg-(--tui-background-base) rounded-2xl border border-(--tui-border-normal) no-underline text-inherit hover:bg-(--tui-background-neutral-1) hover:border-(--tui-border-hover) hover:shadow-xs transition-all"
            >
              <div
                class="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0"
              >
                <tui-icon icon="@tui.copy" />
              </div>

              <div class="flex-1 min-w-0">
                <span class="font-bold text-sm block truncate">
                  {{ 'admin.unifyTitle' | translate }}
                </span>
                <p
                  class="text-xs text-(--tui-text-secondary) mt-0.5 line-clamp-1"
                >
                  {{ 'admin.unifyDescription' | translate }}
                </p>
              </div>

              <tui-icon
                icon="@tui.chevron-right"
                class="text-(--tui-text-tertiary) text-sm group-hover:translate-x-0.5 transition-transform shrink-0"
              />
            </a>

            <!-- Parkings -->
            <a
              routerLink="/admin/parkings"
              class="group flex items-center gap-3.5 p-4 bg-(--tui-background-base) rounded-2xl border border-(--tui-border-normal) no-underline text-inherit hover:bg-(--tui-background-neutral-1) hover:border-(--tui-border-hover) hover:shadow-xs transition-all"
            >
              <tui-badged-content [style.--tui-radius.%]="50" class="shrink-0">
                @if (countsResource.value()?.parkings; as count) {
                  <ng-container tuiSlot="top">
                    <tui-badge-notification tuiAppearance="accent" size="s">
                      {{ count }}
                    </tui-badge-notification>
                  </ng-container>
                }
                <div
                  class="w-11 h-11 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center"
                >
                  <tui-icon icon="@tui.map-pin" />
                </div>
              </tui-badged-content>

              <div class="flex-1 min-w-0">
                <span class="font-bold text-sm block truncate">
                  {{ 'nav.admin-parkings' | translate }}
                </span>
                <p
                  class="text-xs text-(--tui-text-secondary) mt-0.5 line-clamp-1"
                >
                  {{ 'admin.parkings.description' | translate }}
                </p>
              </div>

              <tui-icon
                icon="@tui.chevron-right"
                class="text-(--tui-text-tertiary) text-sm group-hover:translate-x-0.5 transition-transform shrink-0"
              />
            </a>
          </div>
        </section>

        <!-- Section 4: Shop & System -->
        <section class="flex flex-col gap-3">
          <h2
            class="text-xs font-semibold uppercase tracking-wider text-(--tui-text-tertiary) px-1"
          >
            {{ 'admin.categories.shopAndSystem' | translate }}
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <!-- Orders -->
            <a
              routerLink="/admin/orders"
              class="group flex items-center gap-3.5 p-4 bg-(--tui-background-base) rounded-2xl border border-(--tui-border-normal) no-underline text-inherit hover:bg-(--tui-background-neutral-1) hover:border-(--tui-border-hover) hover:shadow-xs transition-all"
            >
              <tui-badged-content [style.--tui-radius.%]="50" class="shrink-0">
                @if (countsResource.value()?.orders; as count) {
                  <ng-container tuiSlot="top">
                    <tui-badge-notification tuiAppearance="accent" size="s">
                      {{ count }}
                    </tui-badge-notification>
                  </ng-container>
                }
                <div
                  class="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center"
                >
                  <tui-icon icon="@tui.shopping-bag" />
                </div>
              </tui-badged-content>

              <div class="flex-1 min-w-0">
                <span class="font-bold text-sm block truncate">
                  {{ 'admin.orders.title' | translate }}
                </span>
                <p
                  class="text-xs text-(--tui-text-secondary) mt-0.5 line-clamp-1"
                >
                  {{ 'admin.orders.description' | translate }}
                </p>
              </div>

              <tui-icon
                icon="@tui.chevron-right"
                class="text-(--tui-text-tertiary) text-sm group-hover:translate-x-0.5 transition-transform shrink-0"
              />
            </a>

            <!-- Error Logs -->
            <a
              routerLink="/admin/error-logs"
              class="group flex items-center gap-3.5 p-4 bg-(--tui-background-base) rounded-2xl border border-(--tui-border-normal) no-underline text-inherit hover:bg-(--tui-background-neutral-1) hover:border-(--tui-border-hover) hover:shadow-xs transition-all"
            >
              <tui-badged-content [style.--tui-radius.%]="50" class="shrink-0">
                @if (countsResource.value()?.errorLogs; as count) {
                  <ng-container tuiSlot="top">
                    <tui-badge-notification tuiAppearance="accent" size="s">
                      {{ count }}
                    </tui-badge-notification>
                  </ng-container>
                }
                <div
                  class="w-11 h-11 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center"
                >
                  <tui-icon icon="@tui.triangle-alert" />
                </div>
              </tui-badged-content>

              <div class="flex-1 min-w-0">
                <span class="font-bold text-sm block truncate">
                  {{ 'admin.errorLogs.title' | translate }}
                </span>
                <p
                  class="text-xs text-(--tui-text-secondary) mt-0.5 line-clamp-1"
                >
                  {{ 'admin.errorLogs.description' | translate }}
                </p>
              </div>

              <tui-icon
                icon="@tui.chevron-right"
                class="text-(--tui-text-tertiary) text-sm group-hover:translate-x-0.5 transition-transform shrink-0"
              />
            </a>
          </div>
        </section>
      </div>
    </tui-scrollbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class AdminComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly isBrowser = inject(IS_BROWSER);

  readonly usersSampleResource = resource({
    loader: async () => {
      if (!this.isBrowser) return [];

      await this.supabase.whenReady();
      const { data } = await this.supabase.client
        .from('user_profiles')
        .select('id, avatar_url:avatar')
        .not('avatar', 'is', null)
        .limit(3);

      return data || [];
    },
  });

  readonly countsResource = resource({
    loader: async () => {
      if (!this.isBrowser) return null;
      await this.supabase.whenReady();

      const [
        ordersRes,
        areaReqsRes,
        equipperReqsRes,
        errorLogsRes,
        parkingsRes,
        equippersRes,
        usersRes,
      ] = await Promise.all([
        this.supabase.client
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .not('status', 'in', '("delivered","cancelled","refunded")'),
        this.supabase.client
          .from('area_admin_requests')
          .select('*', { count: 'exact', head: true }),
        this.supabase.client
          .from('equipper_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.supabase.client as any)
          .from('error_logs')
          .select('*', { count: 'exact', head: true }),
        this.supabase.client
          .from('parkings')
          .select('*', { count: 'exact', head: true }),
        this.supabase.client
          .from('equippers')
          .select('*', { count: 'exact', head: true }),
        this.supabase.client
          .from('user_profiles')
          .select('*', { count: 'exact', head: true }),
      ]);

      return {
        orders: ordersRes.count ?? 0,
        areaRequests: areaReqsRes.count ?? 0,
        equipperRequests: equipperReqsRes.count ?? 0,
        errorLogs: errorLogsRes.count ?? 0,
        parkings: parkingsRes.count ?? 0,
        equippers: equippersRes.count ?? 0,
        users: usersRes.count ?? 0,
      };
    },
  });
}
