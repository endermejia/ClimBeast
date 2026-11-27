import {
  Component,
  inject,
  input,
  resource,
  computed,
  signal,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  TuiAppearance,
  TuiLoader,
  TuiButton,
  TuiCheckbox,
} from '@taiga-ui/core';

import { TranslateModule } from '@ngx-translate/core';

import { AppDialogsService } from '../../services/app-dialogs.service';
import { AuthStateService } from '../../services/auth-state.service';

import { IndoorService } from '../../services/indoor.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

import { TopoCardComponent } from '../topo/topo-card';
import { EmptyStateComponent } from '../ui/empty-state';
import { OfflineNotCachedComponent } from '../ui/offline-not-cached';

import type { IndoorCenterDto, IndoorTopoListItem } from '../../models';

import { STORAGE_KEYS } from '../../constants';
import { safeResourceValue } from '../../utils';

@Component({
  selector: 'app-indoor-topos',
  imports: [
    FormsModule,
    TranslateModule,
    TuiAppearance,
    TuiLoader,
    TuiButton,
    TuiCheckbox,
    EmptyStateComponent,
    OfflineNotCachedComponent,
    TopoCardComponent,
  ],
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex justify-between items-center px-3">
        <div>
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input
              tuiCheckbox
              type="checkbox"
              [ngModel]="showLegacyTopos()"
              (ngModelChange)="showLegacyTopos.set($event)"
            />
            <span class="text-xs opacity-75">
              {{ 'indoor.showLegacyTopos' | translate }}
            </span>
          </label>
        </div>
        @if (canCreate()) {
          <button
            tuiButton
            appearance="textfield"
            size="s"
            iconStart="@tui.plus"
            (click.zoneless)="createTopo()"
          >
            {{ 'new' | translate }}
          </button>
        }
      </div>

      @if (topos(); as topos) {
        <div class="grid gap-2 grid-cols-1 xl:grid-cols-2">
          @for (topo of topos; track topo.id) {
            <app-topo-card
              [topo]="topo"
              [isIndoor]="true"
              [pendingRoutes]="topo.total_routes - topo.own_ascents_count"
              [totalRoutes]="topo.total_routes"
              (selected)="onCardClick(topo)"
            />
          } @empty {
            <div class="col-span-full">
              <app-empty-state icon="@tui.image" />
            </div>
          }
        </div>
      } @else if (toposResource.isLoading()) {
        <tui-loader />
      } @else {
        <app-offline-not-cached [fallbackUrl]="'/indoor/' + centerSlug()" />
      }
    </div>
  `,
})
export class IndoorToposComponent {
  centerId = input.required<string>();
  centerSlug = input.required<string>();
  center = input<IndoorCenterDto | null>(null);

  protected readonly indoor = inject(IndoorService);
  protected readonly supabase = inject(SupabaseService);
  protected readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly appDialogs = inject(AppDialogsService);
  private readonly toast = inject(ToastService);

  protected readonly canCreate = computed(() => {
    const c = this.center() ?? ({ id: this.centerId() } as IndoorCenterDto);
    return this.authState.canCreateIndoorTopo(c);
  });

  protected readonly canEdit = computed(() => {
    return !!this.authState.indoorAdminPermissions()[this.centerId()];
  });

  protected readonly showLegacyTopos = signal<boolean>(
    (() => {
      try {
        return (
          typeof window !== 'undefined' &&
          localStorage.getItem(STORAGE_KEYS.showLegacyTopos) === 'true'
        );
      } catch {
        return false;
      }
    })(),
  );

  constructor() {
    effect(() => {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            STORAGE_KEYS.showLegacyTopos,
            String(this.showLegacyTopos()),
          );
        }
      } catch {
        // localStorage can be unavailable (SSR or privacy-restricted browsers).
      }
    });
  }

  protected readonly toposResource = resource({
    params: () => ({
      id: this.centerId(),
      showLegacyTopos: this.showLegacyTopos(),
    }),
    loader: ({ params }): Promise<IndoorTopoListItem[]> =>
      this.indoor.getCenterTopos(params.id, params.showLegacyTopos),
  });

  /**
   * Safe view of the resource: `undefined` while loading or when the request
   * failed (offline). Reading `resource.value()` directly throws in that case
   * and would blank the whole tab.
   */
  protected readonly topos = computed(() =>
    safeResourceValue<IndoorTopoListItem[]>(this.toposResource),
  );

  onCardClick(topo: IndoorTopoListItem): void {
    void this.router.navigate(['/indoor', this.centerSlug(), 'topo', topo.id]);
  }

  async createTopo(): Promise<void> {
    const success = await this.indoor.openIndoorTopoForm(
      this.centerId(),
      undefined,
      this.center() ?? undefined,
    );
    if (success) {
      this.toposResource.reload();
    }
  }

  async editTopo(topo: IndoorTopoListItem, event: Event): Promise<void> {
    event.stopPropagation();
    const success = await this.indoor.openIndoorTopoForm(
      this.centerId(),
      topo,
      this.center() ?? undefined,
    );
    if (success) {
      this.toposResource.reload();
    }
  }

  async deleteTopo(topo: IndoorTopoListItem, event: Event): Promise<void> {
    event.stopPropagation();
    const confirmed = await this.appDialogs.confirm({
      labelKey: 'topos.deleteTitle',
      contentKey: 'topos.deleteConfirm',
      contentParams: { name: topo.name },
      yesKey: 'delete',
      noKey: 'cancel',
      appearance: 'primary-destructive',
    });

    if (confirmed) {
      await this.indoor.deleteTopo(topo.id);
      this.toast.success('messages.toasts.topoDeleted');
      this.toposResource.reload();
    }
  }
}
