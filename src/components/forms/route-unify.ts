import { CommonModule } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, required } from '@angular/forms/signals';

import { type TuiDialogContext } from '@taiga-ui/core';
import {
  TuiButton,
  TuiDataList,
  TuiError,
  TuiIcon,
  TuiLabel,
  TuiNotification,
  TuiOptGroup,
  TuiInput,
  TuiFilterByInputPipe,
} from '@taiga-ui/core';
import {
  TuiBadge,
  TuiChevron,
  TuiInputChip,
  TuiComboBox,
  TuiMultiSelect,
} from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { CragRoutesDataService } from '../../services/crag-routes-data.service';
import { RoutesService } from '../../services/routes.service';

import { RouteDto } from '../../models';

@Component({
  selector: 'app-route-unify',
  imports: [
    CommonModule,
    FormField,
    FormsModule,
    TranslatePipe,
    TuiBadge,
    TuiButton,
    TuiChevron,
    TuiComboBox,
    TuiDataList,
    TuiError,
    TuiFilterByInputPipe,
    TuiIcon,
    TuiInput,
    TuiInputChip,
    TuiLabel,
    TuiMultiSelect,
    TuiNotification,
    TuiOptGroup,
  ],
  template: `
    <div class="flex flex-col gap-4">
      <p class="text-sm opacity-70">
        {{ 'routes.unifyDescription' | translate }}
      </p>

      <tui-textfield tuiChevron class="block" [stringify]="stringify">
        <label tuiLabel for="target-route">{{
          'routes.targetRoute' | translate
        }}</label>
        <input
          tuiComboBox
          id="target-route"
          autocomplete="off"
          [ngModel]="model().targetRoute"
          (ngModelChange)="onTargetRouteChange($event)"
          name="targetRoute"
          [placeholder]="'select' | translate"
        />
        <tui-data-list *tuiDropdown>
          @for (route of cragRoutes() | tuiFilterByInput; track route.id) {
            <button tuiOption new [value]="route">
              {{ route.name }}
            </button>
          }
        </tui-data-list>
      </tui-textfield>
      @if (
        unifyForm.targetRoute().invalid() && unifyForm.targetRoute().touched()
      ) {
        <tui-error [error]="'errors.required' | translate" />
      }

      <tui-textfield
        tuiChevron
        multi
        class="block"
        [stringify]="stringify"
        [disabledItemHandler]="isInvalidRoute"
      >
        <label tuiLabel for="source-routes">{{
          'routes.sourceRoutes' | translate
        }}</label>
        <input
          tuiInputChip
          id="source-routes"
          autocomplete="off"
          [ngModel]="model().sourceRoutes"
          (ngModelChange)="onSourceRoutesChange($event)"
          name="sourceRoutes"
          [placeholder]="'select' | translate"
        />
        <tui-input-chip *tuiItem />
        <tui-data-list *tuiDropdown>
          <tui-opt-group tuiMultiSelectGroup>
            @for (
              route of availableSources() | tuiFilterByInput;
              track route.id
            ) {
              <button tuiOption new [value]="route">
                {{ route.name }}
              </button>
            }
          </tui-opt-group>
        </tui-data-list>
      </tui-textfield>
      @if (
        unifyForm.sourceRoutes().invalid() && unifyForm.sourceRoutes().touched()
      ) {
        <tui-error [error]="'errors.required' | translate" />
      }

      <tui-textfield class="block">
        <label tuiLabel for="new-name">{{
          'routes.newName' | translate
        }}</label>
        <input
          tuiInput
          id="new-name"
          autocomplete="off"
          [formField]="unifyForm.newName"
          type="text"
          [placeholder]="model().targetRoute?.name || ''"
        />
      </tui-textfield>

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

      <div class="flex justify-end gap-2 mt-4">
        <button
          tuiButton
          appearance="flat"
          type="button"
          (click)="context.completeWith(false)"
        >
          {{ 'cancel' | translate }}
        </button>
        <button
          tuiButton
          appearance="primary"
          [disabled]="
            unifyForm.targetRoute().invalid() ||
            model().sourceRoutes.length === 0 ||
            loading()
          "
          (click)="onUnify()"
        >
          {{ 'unify' | translate }}
        </button>
      </div>
    </div>
  `,
  host: { class: 'block w-full' },
})
export class RouteUnifyComponent {
  protected readonly cragRoutesData = inject(CragRoutesDataService);
  protected readonly context =
    injectContext<TuiDialogContext<boolean, { candidates?: RouteDto[] }>>();
  private readonly routesService = inject(RoutesService);

  protected readonly loading = signal(false);

  model = signal<{
    targetRoute: RouteDto | null;
    sourceRoutes: RouteDto[];
    newName: string;
  }>({
    targetRoute: null,
    sourceRoutes: [],
    newName: '',
  });

  unifyForm = form(this.model, (schemaPath) => {
    required(schemaPath.targetRoute);
    required(schemaPath.sourceRoutes);
  });

  constructor() {
    const candidates = this.context.data?.candidates;
    if (candidates && candidates.length > 0) {
      this.model.update((m) => ({
        ...m,
        targetRoute: candidates[0],
        sourceRoutes: candidates.length > 1 ? candidates.slice(1) : [],
      }));
    }
  }

  protected readonly cragRoutes = computed(() => {
    const candidates = this.context.data?.candidates;
    if (candidates && candidates.length > 0) {
      return candidates;
    }
    return this.cragRoutesData.cragRoutes() ?? [];
  });

  protected readonly isInvalidRoute = (item: RouteDto): boolean =>
    !this.cragRoutes().some((a) => a.id === item.id);

  protected readonly stringify = (route: RouteDto) => route.name;

  protected readonly availableSources = computed(() => {
    const targetId = this.model().targetRoute?.id;
    return this.cragRoutes().filter((a) => a.id !== targetId);
  });

  private readonly selectedRouteIds = computed(() => {
    const m = this.model();
    const ids = new Set<number>();
    if (m.targetRoute?.id != null) ids.add(m.targetRoute.id);
    for (const src of m.sourceRoutes) {
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
    const targetId = this.model().targetRoute?.id;
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

  onTargetRouteChange(route: RouteDto | null): void {
    this.model.update((m) => ({ ...m, targetRoute: route }));
  }

  onSourceRoutesChange(routes: RouteDto[]): void {
    this.model.update((m) => ({ ...m, sourceRoutes: routes }));
  }

  async onUnify() {
    const target = this.model().targetRoute;
    const sources = this.model().sourceRoutes;
    if (!target || !sources || sources.length === 0) return;

    this.loading.set(true);
    const success = await this.routesService.unify(
      target.id,
      sources.map((s) => s.id),
      this.model().newName || target.name,
    );
    this.loading.set(false);

    if (success) {
      this.context.completeWith(true);
    }
  }
}
