import {
  ChangeDetectionStrategy,
  Component,
  inject,
  resource,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiIcon, TuiTitle } from '@taiga-ui/core';
import { TuiAvatar, TuiAvatarStack } from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe } from '@ngx-translate/core';

import { SupabaseService } from '../../services/supabase.service';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    TuiAvatar,
    TuiAvatarStack,
    TuiHeader,
    TuiIcon,
    TuiTitle,
  ],
  template: `
    <div class="p-4 flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <header tuiHeader>
        <h1 tuiTitle>{{ 'admin.title' | translate }}</h1>
      </header>

      <!-- Section 1: Users & Permissions -->
      <section class="flex flex-col gap-3">
        <h2
          class="text-xs font-semibold uppercase tracking-wider text-(--tui-text-tertiary) px-1"
        >
          {{ 'admin.categories.usersAndPermissions' | translate }}
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <!-- Users -->
          <a
            routerLink="/admin/users"
            class="group flex items-center gap-3.5 p-4 bg-(--tui-background-base) rounded-2xl border border-(--tui-border-normal) no-underline text-inherit hover:bg-(--tui-background-neutral-1) hover:border-(--tui-border-hover) hover:shadow-xs transition-all"
          >
            <div
              class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0"
            >
              <tui-icon icon="@tui.users" />
            </div>

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
                          <img [src]="url" alt="avatar" />
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

          <!-- Requests -->
          <a
            routerLink="/admin/requests"
            class="group flex items-center gap-3.5 p-4 bg-(--tui-background-base) rounded-2xl border border-(--tui-border-normal) no-underline text-inherit hover:bg-(--tui-background-neutral-1) hover:border-(--tui-border-hover) hover:shadow-xs transition-all"
          >
            <div
              class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0"
            >
              <tui-icon icon="@tui.shield" />
            </div>

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

      <!-- Section 2: Content & Map -->
      <section class="flex flex-col gap-3">
        <h2
          class="text-xs font-semibold uppercase tracking-wider text-(--tui-text-tertiary) px-1"
        >
          {{ 'admin.categories.contentAndMap' | translate }}
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <!-- Unification -->
          <a
            routerLink="/admin/unify"
            class="group flex items-center gap-3.5 p-4 bg-(--tui-background-base) rounded-2xl border border-(--tui-border-normal) no-underline text-inherit hover:bg-(--tui-background-neutral-1) hover:border-(--tui-border-hover) hover:shadow-xs transition-all"
          >
            <div
              class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0"
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

          <!-- Equippers -->
          <a
            routerLink="/admin/equippers"
            class="group flex items-center gap-3.5 p-4 bg-(--tui-background-base) rounded-2xl border border-(--tui-border-normal) no-underline text-inherit hover:bg-(--tui-background-neutral-1) hover:border-(--tui-border-hover) hover:shadow-xs transition-all"
          >
            <div
              class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"
            >
              <tui-icon icon="@tui.hammer" />
            </div>

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

          <!-- Parkings -->
          <a
            routerLink="/admin/parkings"
            class="group flex items-center gap-3.5 p-4 bg-(--tui-background-base) rounded-2xl border border-(--tui-border-normal) no-underline text-inherit hover:bg-(--tui-background-neutral-1) hover:border-(--tui-border-hover) hover:shadow-xs transition-all md:col-span-2"
          >
            <div
              class="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0"
            >
              <tui-icon icon="@tui.map-pin" />
            </div>

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

      <!-- Section 3: Shop & System -->
      <section class="flex flex-col gap-3">
        <h2
          class="text-xs font-semibold uppercase tracking-wider text-(--tui-text-tertiary) px-1"
        >
          {{ 'admin.categories.shopAndSystem' | translate }}
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <!-- Orders -->
          <a
            routerLink="/admin/orders"
            class="group flex items-center gap-3.5 p-4 bg-(--tui-background-base) rounded-2xl border border-(--tui-border-normal) no-underline text-inherit hover:bg-(--tui-background-neutral-1) hover:border-(--tui-border-hover) hover:shadow-xs transition-all"
          >
            <div
              class="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0"
            >
              <tui-icon icon="@tui.shopping-bag" />
            </div>

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
            <div
              class="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0"
            >
              <tui-icon icon="@tui.triangle-alert" />
            </div>

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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly isBrowser = inject(IS_BROWSER);

  readonly usersSampleResource = resource({
    loader: async () => {
      if (!this.isBrowser) return [];

      try {
        await this.supabase.whenReady();
        const { data, error } = await this.supabase.client
          .from('user_profiles')
          .select('id, avatar_url:avatar')
          .not('avatar', 'is', null)
          .limit(5);

        if (error) throw error;

        return (
          data?.map((u: { id: string; avatar_url: string | null }) => ({
            ...u,
            avatar_url: u.avatar_url
              ? this.supabase.buildAvatarUrl(u.avatar_url)
              : null,
          })) ?? []
        );
      } catch (e) {
        console.error('[AdminComponent] Error loading users sample', e);
        return [];
      }
    },
  });
}

export default AdminComponent;
