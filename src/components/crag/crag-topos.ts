import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Router } from '@angular/router';

import { TuiIcon } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { AuthStateService } from '../../services/auth-state.service';

import { CragDetail } from '../../models';

import { PaywallComponent } from '../paywall/paywall';

import { TopoCardComponent } from '../topo/topo-card';
import { EmptyStateComponent } from '../ui/empty-state';

@Component({
  selector: 'app-crag-topos',
  imports: [
    EmptyStateComponent,
    PaywallComponent,
    TopoCardComponent,
    TranslatePipe,
    TuiIcon,
  ],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      @if (
        crag()?.is_public ||
        crag()?.purchased ||
        canEditAsAdmin() ||
        canAreaAdmin()
      ) {
        @for (t of topos(); track t.id) {
          <app-topo-card
            [topo]="t"
            (selected)="
              router.navigate(['/area', areaSlug(), cragSlug(), 'topo', t.id])
            "
          />
        } @empty {
          <div class="col-span-full">
            <app-empty-state icon="@tui.image" />
          </div>
        }
      } @else {
        @let isSecret =
          !crag()?.is_public && (crag()?.price === null || crag()?.price === 0);
        @if (!isSecret) {
          <div class="col-span-full">
            <app-paywall
              [areaId]="crag()?.area_id || 0"
              [price]="crag()?.price || 0"
            />
          </div>
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
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CragToposComponent {
  crag = input.required<CragDetail | null>();
  areaSlug = input.required<string>();
  cragSlug = input.required<string>();

  protected readonly authState = inject(AuthStateService);
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
}
