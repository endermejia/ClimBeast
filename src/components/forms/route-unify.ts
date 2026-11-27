import { Component, computed, inject, resource, signal } from '@angular/core';

import {
  type TuiDialogContext,
  TuiIcon,
  TuiNotification,
} from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { CragRoutesDataService } from '../../services/crag-routes-data.service';
import { RoutesService } from '../../services/routes.service';

import {
  EntityUnifyFormComponent,
  type EntityUnifyPayload,
  type EntityUnifySelection,
  type UnifyEntityItem,
} from '../../components/forms/entity-unify-form';

import { RouteDto } from '../../models';

@Component({
  selector: 'app-route-unify',
  imports: [
    EntityUnifyFormComponent,
    TranslatePipe,
    TuiBadge,
    TuiIcon,
    TuiNotification,
  ],
  template: `
    <app-entity-unify-form
      [items]="cragRoutes()"
      [initialTarget]="initialTarget"
      [initialSources]="initialSources"
      [loading]="loading()"
      descriptionKey="routes.unifyDescription"
      targetLabelKey="routes.targetRoute"
      sourcesLabelKey="routes.sourceRoutes"
      newNameLabelKey="routes.newName"
      targetInputId="target-route"
      sourcesInputId="source-routes"
      (selectionChange)="onSelectionChange($event)"
      (unify)="onUnify($event)"
      (cancelled)="context.completeWith(false)"
    >
      @if (affectedTopos().length > 0) {
        <div class="flex flex-col gap-2">
          <span class="text-xs font-medium opacity-75">
            {{ 'routes.unifyToposPreserved' | translate }}
          </span>
          <div class="flex flex-wrap gap-1.5">
            @for (topo of affectedTopos(); track topo.topo_id) {
              <span
                tuiBadge
                size="m"
                [appearance]="topo.has_path ? 'info' : 'warning'"
                class="inline-flex items-center gap-1"
              >
                <tui-icon
                  icon="/image/topo.svg"
                  class="w-3.5! h-3.5! shrink-0"
                  [style.font-size.rem]="0.875"
                  aria-hidden="true"
                />
                <span>{{ topo.topo_name }}</span>
              </span>
            }
          </div>
          @if (hasDuplicateDrawnTopo()) {
            <div tuiNotification appearance="warning" size="s">
              {{ 'routes.unifyTopoDuplicateDrawnWarning' | translate }}
            </div>
          }
        </div>
      }
    </app-entity-unify-form>
  `,
  host: { class: 'block w-full' },
})
export class RouteUnifyComponent {
  protected readonly cragRoutesData = inject(CragRoutesDataService);
  protected readonly context =
    injectContext<TuiDialogContext<boolean, { candidates?: RouteDto[] }>>();
  private readonly routesService = inject(RoutesService);

  protected readonly loading = signal(false);

  protected readonly initialTarget: UnifyEntityItem | null;
  protected readonly initialSources: UnifyEntityItem[];

  private readonly selection = signal<EntityUnifySelection>({
    target: null,
    sources: [],
  });

  constructor() {
    const candidates = this.context.data?.candidates;
    this.initialTarget = candidates?.[0] ?? null;
    this.initialSources =
      candidates && candidates.length > 1 ? candidates.slice(1) : [];
    this.selection.set({
      target: this.initialTarget,
      sources: this.initialSources,
    });
  }

  protected readonly cragRoutes = computed<UnifyEntityItem[]>(() => {
    const candidates = this.context.data?.candidates;
    if (candidates && candidates.length > 0) {
      return candidates;
    }
    return this.cragRoutesData.cragRoutes() ?? [];
  });

  private readonly selectedRouteIds = computed(() => {
    const { target, sources } = this.selection();
    const ids = new Set<number>();
    if (target?.id != null) ids.add(target.id);
    for (const src of sources) {
      if (src?.id != null) ids.add(src.id);
    }
    return Array.from(ids).sort((a, b) => a - b);
  });

  protected readonly toposResource = resource({
    params: () => this.selectedRouteIds(),
    loader: async ({ params: ids }) => {
      if (ids.length === 0) return [];
      return this.routesService.getToposForRoutes(ids);
    },
  });

  protected readonly affectedTopos = computed(() => {
    const entries = this.toposResource.value() ?? [];
    const byTopo = new Map<
      number,
      { topo_id: number; topo_name: string; has_path: boolean }
    >();
    for (const entry of entries) {
      const existing = byTopo.get(entry.topo_id);
      if (existing) {
        existing.has_path = existing.has_path || entry.has_path;
      } else {
        byTopo.set(entry.topo_id, {
          topo_id: entry.topo_id,
          topo_name: entry.topo_name,
          has_path: entry.has_path,
        });
      }
    }
    return Array.from(byTopo.values()).sort((a, b) =>
      a.topo_name.localeCompare(b.topo_name),
    );
  });

  protected readonly hasDuplicateDrawnTopo = computed(() => {
    const targetId = this.selection().target?.id;
    if (targetId == null) return false;
    const entries = this.toposResource.value() ?? [];
    const targetDrawnTopos = new Set<number>();
    for (const entry of entries) {
      if (entry.route_id === targetId && entry.has_path) {
        targetDrawnTopos.add(entry.topo_id);
      }
    }
    return entries.some(
      (entry) =>
        entry.route_id !== targetId &&
        entry.has_path &&
        targetDrawnTopos.has(entry.topo_id),
    );
  });

  protected onSelectionChange(selection: EntityUnifySelection): void {
    this.selection.set(selection);
  }

  protected async onUnify(payload: EntityUnifyPayload): Promise<void> {
    this.loading.set(true);
    const success = await this.routesService.unify(
      payload.targetId,
      payload.sourceIds,
      payload.newName,
    );
    this.loading.set(false);

    if (success) {
      this.context.completeWith(true);
    }
  }
}
