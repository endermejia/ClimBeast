import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { Router } from '@angular/router';

import { TuiScrollbar } from '@taiga-ui/core';

import { TuiCountryIsoCode } from '@taiga-ui/i18n';
import { TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { EquipperService } from '../../services/equipper.service';
import { LayoutService } from '../../services/layout.service';
import { SupabaseService } from '../../services/supabase.service';

import { IndoorRoutesComponent } from '../../components/indoor/indoor-routes';
import { OutdoorRoutesTableComponent } from '../../components/route/outdoor-routes-table';

import { UserInfoComponent } from '../../components/ui/user-info';

@Component({
  selector: 'app-equipper',
  imports: [
    OutdoorRoutesTableComponent,
    IndoorRoutesComponent,
    TranslatePipe,
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
          />
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
  protected readonly layoutService = inject(LayoutService);
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);

  // Route param
  id = input.required<string>();

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
  }
}
