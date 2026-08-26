import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { TuiButton, TuiIcon, TuiLink, TuiScrollbar } from '@taiga-ui/core';
import { TuiCountryIsoCode } from '@taiga-ui/i18n';
import { TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { EquipperRequestsService } from '../../services/equipper-requests.service';
import { EquipperService } from '../../services/equipper.service';
import { LayoutService } from '../../services/layout.service';
import { SupabaseService } from '../../services/supabase.service';

import { IndoorRoutesComponent } from '../../components/indoor/indoor-routes';
import { OutdoorRoutesTableComponent } from '../../components/route/outdoor-routes-table';
import { UserInfoComponent } from '../../components/ui/user-info';

import { EquipperRequestDto } from '../../models';

@Component({
  selector: 'app-equipper',
  standalone: true,
  imports: [
    IndoorRoutesComponent,
    OutdoorRoutesTableComponent,
    RouterLink,
    TranslatePipe,
    TuiButton,
    TuiIcon,
    TuiLink,
    TuiScrollbar,
    TuiSkeleton,
    UserInfoComponent,
  ],
  template: `
    <tui-scrollbar class="flex grow">
      <section class="w-full max-w-5xl mx-auto p-4 grid gap-4">
        @let equipper = equipperService.equipperDetailResource.value();
        @let loading = equipperService.equipperDetailResource.isLoading();
        @if (loading) {
          <div class="flex items-center gap-4">
            <div
              class="w-16 h-16 rounded-full border border-white/10"
              [tuiSkeleton]="true"
            ></div>
            <div class="space-y-2">
              <div
                class="w-48 h-6 rounded border border-white/10"
                [tuiSkeleton]="true"
              ></div>
              <div
                class="w-32 h-4 rounded border border-white/10"
                [tuiSkeleton]="true"
              ></div>
            </div>
          </div>
        } @else if (equipper) {
          <app-user-info
            [name]="equipper.user_profile?.name || equipper.name"
            [avatar]="equipper.user_profile?.avatar"
            [country]="profileCountry()"
            [city]="equipper.user_profile?.city"
            [bio]="equipper.user_profile?.bio"
            [age]="profileAge()"
            [nameClickable]="!!equipper.user_id"
            [avatarClickable]="!!equipper.user_id"
            (nameClick)="navigateToUserProfile(equipper.user_id)"
            (avatarClick)="navigateToUserProfile(equipper.user_id)"
          >
            @if (equipper.user_id) {
              <div extraInfo class="mt-2">
                <a tuiLink [routerLink]="['/profile', equipper.user_id]">
                  {{ 'nav.viewProfile' | translate }}
                </a>
              </div>
            }
          </app-user-info>

          @if (equipper.user_id === null && supabase.authUserId()) {
            <div
              class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 my-2"
            >
              <div class="flex items-center gap-2 text-sm">
                <tui-icon
                  icon="@tui.circle-help"
                  size="s"
                  class="text-blue-500 shrink-0"
                />
                <span>
                  {{
                    (myRequest()
                      ? 'equipperRequest.pending'
                      : 'equipperRequest.unclaimedInfo'
                    ) | translate
                  }}
                </span>
              </div>

              @if (myRequest()) {
                <button
                  tuiButton
                  size="s"
                  appearance="secondary"
                  [disabled]="requesting()"
                  (click.zoneless)="cancelRequest(equipper.id)"
                  class="rounded-xl! shrink-0"
                >
                  {{ 'equipperRequest.cancel' | translate }}
                </button>
              } @else {
                <button
                  tuiButton
                  size="s"
                  appearance="primary"
                  [disabled]="requesting()"
                  (click.zoneless)="requestEquipper(equipper.id)"
                  class="rounded-xl! shrink-0"
                >
                  {{ 'equipperRequest.requestButton' | translate }}
                </button>
              }
            </div>
          }
        }

        <!-- Equipper Routes Table -->
        <section class="mt-4">
          <h2 class="text-xl font-bold mb-4">
            {{ 'equipper.routes' | translate }} ({{
              equipperService.equipperRoutesResource.value()?.length || 0
            }})
          </h2>
          <app-outdoor-routes-table
            [data]="equipperService.equipperRoutesResource.value() || []"
            [showAdminActions]="false"
          />
        </section>

        <!-- Equipper Indoor Routes -->
        @let indoorRoutes =
          equipperService.equipperIndoorRoutesResource.value() || [];
        @if (indoorRoutes.length > 0) {
          <section class="mt-4">
            <h2 class="text-xl font-bold mb-4">
              {{ 'equipper.indoorRoutes' | translate }} ({{
                indoorRoutes.length
              }})
            </h2>
            <app-indoor-routes [customRoutes]="indoorRoutes" />
          </section>
        }
      </section>
    </tui-scrollbar>
  `,
  host: { class: 'flex grow min-h-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipperComponent {
  protected readonly equipperService = inject(EquipperService);
  protected readonly equipperRequests = inject(EquipperRequestsService);
  protected readonly layoutService = inject(LayoutService);
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);

  // Route param
  id = input.required<string>();

  protected readonly myRequest = signal<EquipperRequestDto | null>(null);
  protected readonly requesting = signal(false);

  readonly profileCountry = computed(
    () =>
      this.equipperService.equipperDetailResource.value()?.user_profile
        ?.country as TuiCountryIsoCode,
  );

  readonly profileAge = computed(() => {
    const bd =
      this.equipperService.equipperDetailResource.value()?.user_profile
        ?.birth_date;
    if (!bd) return null;
    const d = new Date(bd);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
    return years;
  });

  protected navigateToUserProfile(userId: string | null | undefined): void {
    if (userId) {
      void this.router.navigate(['/profile', userId]);
    }
  }

  constructor() {
    effect(() => {
      const idStr = this.id();
      if (idStr) {
        this.equipperService.selectedEquipperId.set(parseInt(idStr, 10));
      }
    });

    effect(() => {
      this.layoutService.isNavLoading.set(
        this.equipperService.equipperDetailResource.isLoading(),
      );
    });

    effect(() => {
      const equipper = this.equipperService.equipperDetailResource.value();
      if (equipper && equipper.user_id === null && this.supabase.authUserId()) {
        void this.loadMyRequest(equipper.id);
      } else {
        this.myRequest.set(null);
      }
    });
  }

  private async loadMyRequest(equipperId: number): Promise<void> {
    const req = await this.equipperRequests.getMyRequestForEquipper(equipperId);
    this.myRequest.set(req);
  }

  protected async requestEquipper(equipperId: number): Promise<void> {
    this.requesting.set(true);
    try {
      const ok = await this.equipperRequests.requestEquipper(equipperId);
      if (ok) {
        await this.loadMyRequest(equipperId);
      }
    } finally {
      this.requesting.set(false);
    }
  }

  protected async cancelRequest(equipperId: number): Promise<void> {
    this.requesting.set(true);
    try {
      const ok = await this.equipperRequests.cancelRequest(equipperId);
      if (ok) {
        this.myRequest.set(null);
      }
    } finally {
      this.requesting.set(false);
    }
  }
}
