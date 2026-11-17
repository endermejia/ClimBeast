import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { TuiIcon } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { AreaDonationsService } from '../../services/area-donations.service';
import { AuthStateService } from '../../services/auth-state.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';

import { CragDetail } from '../../models';

import { TopoCardComponent } from '../topo/topo-card';
import { ToposOfflineBarComponent } from '../topo/topos-offline-bar';
import { EmptyStateComponent } from '../ui/empty-state';

@Component({
  selector: 'app-crag-topos',
  imports: [
    EmptyStateComponent,
    TopoCardComponent,
    ToposOfflineBarComponent,
    TranslatePipe,
    TuiIcon,
  ],
  template: `
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
      @let c = crag();
      @let hasAccess =
        c?.is_public || c?.purchased || canEditAsAdmin() || canAreaAdmin();
      @let isSecret =
        !hasAccess && !c?.is_public && (c?.price === null || c?.price === 0);

      @if (!isSecret) {
        @if (hasAccess && topos().length > 0) {
          <app-topos-offline-bar
            class="col-span-full"
            [topos]="topos()"
            [scopeKey]="'crag:' + areaSlug() + ':' + cragSlug()"
          />
        }
        @for (t of topos(); track t.id) {
          <app-topo-card
            [topo]="t"
            (selected)="
              hasAccess
                ? router.navigate([
                    '/area',
                    areaSlug(),
                    cragSlug(),
                    'topo',
                    t.id,
                  ])
                : openDonationDialog()
            "
          />
        } @empty {
          <div class="col-span-full">
            <app-empty-state icon="@tui.image" />
          </div>
        }
      } @else {
        <div
          class="col-span-full flex flex-col items-center justify-center p-8 text-center gap-2"
        >
          <tui-icon icon="@tui.lock" class="text-4xl opacity-50" />
          <p class="text-sm font-semibold opacity-70">
            {{ 'topos.restricted' | translate }}
          </p>
          <p class="text-xs opacity-50">
            {{ 'topos.restrictedMessage' | translate }}
          </p>
        </div>
      }
    </div>
  `,
})
export class CragToposComponent {
  crag = input.required<CragDetail | null>();
  areaSlug = input.required<string>();
  cragSlug = input.required<string>();

  protected readonly authState = inject(AuthStateService);
  private readonly donationsService = inject(AreaDonationsService);
  private readonly outdoorData = inject(OutdoorDataService);
  protected readonly router = inject(Router);

  readonly canEditAsAdmin = this.authState.canEditAsAdmin;
  readonly canAreaAdmin = computed(() => {
    const c = this.crag();
    if (!c) return false;
    return this.authState.areaAdminPermissions()[c.area_id];
  });

  protected readonly topos = computed(() => {
    const c = this.crag();
    if (!c) return [];
    return c.topos;
  });

  protected openDonationDialog(): void {
    const c = this.crag();
    if (!c) return;
    this.donationsService.openDonationDialog(c.area_id, c.area_name, {
      areaPrice: c.price ?? undefined,
      isPurchased: !!c.purchased,
      toposCount:
        this.outdoorData.selectedArea()?.topos_count ?? this.topos().length,
      topos: this.outdoorData.areaTopos(),
      initialAmount: c.price ?? undefined,
    });
  }
}
