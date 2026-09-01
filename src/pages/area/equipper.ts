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

import {
  TuiButton,
  TuiDialogService,
  TuiHint,
  TuiLink,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TuiCountryIsoCode } from '@taiga-ui/i18n';
import { TUI_CONFIRM, type TuiConfirmData, TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { EquipperRequestsService } from '../../services/equipper-requests.service';
import { EquipperService } from '../../services/equipper.service';
import { LayoutService } from '../../services/layout.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

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
    TuiHint,
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
            @if (equipper.user_id === null) {
              <button
                nameActions
                tuiIconButton
                type="button"
                appearance="action-grayscale"
                size="s"
                iconStart="@tui.circle-help"
                [tuiHint]="'equipperRequest.unclaimedInfo' | translate"
                [attr.aria-label]="'equipperRequest.requestButton' | translate"
                (click.zoneless)="openRequestDialog(equipper.id, equipper.name)"
              ></button>
            }
            @if (equipper.user_id) {
              <div extraInfo class="mt-2">
                <a tuiLink [routerLink]="['/profile', equipper.user_id]">
                  {{ 'nav.viewProfile' | translate }}
                </a>
              </div>
            }
          </app-user-info>
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
            <app-indoor-routes
              [customRoutes]="indoorRoutes"
              [showStats]="false"
            />
          </section>
        }
      </section>
    </tui-scrollbar>
  `,
  host: { class: 'flex grow min-h-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipperComponent {
  private readonly dialogs = inject(TuiDialogService);
  protected readonly equipperService = inject(EquipperService);
  protected readonly equipperRequests = inject(EquipperRequestsService);
  protected readonly layoutService = inject(LayoutService);
  protected readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
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

  protected async openRequestDialog(
    equipperId: number,
    equipperName: string,
  ): Promise<void> {
    if (!this.supabase.authUserId()) {
      this.toast.info('equipperRequest.loginRequired');
      return;
    }

    const hasRequest = !!this.myRequest();
    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant(
          hasRequest
            ? 'equipperRequest.pendingTitle'
            : 'equipperRequest.requestTitle',
        ),
        size: 's',
        data: {
          content: this.translate.instant(
            hasRequest
              ? 'equipperRequest.pendingCancelConfirm'
              : 'equipperRequest.confirmText',
            { name: equipperName },
          ),
          yes: this.translate.instant(
            hasRequest ? 'equipperRequest.cancel' : 'accept',
          ),
          no: this.translate.instant(hasRequest ? 'cancel' : 'cancel'),
          appearance: hasRequest ? 'negative' : 'primary',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    );

    if (!confirmed) return;

    if (hasRequest) {
      await this.cancelRequest(equipperId);
    } else {
      await this.requestEquipper(equipperId);
    }
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
