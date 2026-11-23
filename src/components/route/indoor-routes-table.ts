import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiDialogService } from '@taiga-ui/core';
import { TuiLink } from '@taiga-ui/core';
import { TUI_CONFIRM, type TuiConfirmData } from '@taiga-ui/kit';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../../services/ascents.service';
import { AuthStateService } from '../../services/auth-state.service';
import { IndoorService } from '../../services/indoor.service';
import { LayoutService } from '../../services/layout.service';
import { SupabaseService } from '../../services/supabase.service';

import { ToastService } from '../../services/toast.service';

import {
  AscentType,
  ClimbingKind,
  EquipperDto,
  IndoorRouteWithExtras,
  RouteAscentWithExtras,
  RouteItem,
  RoutesTableRow,
} from '../../models';

import { mapRouteToTableRow, handleErrorToast } from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

import { IndoorRouteEquippersInputComponent } from './indoor-route-equippers-input';

import { RoutesTableComponent } from './routes-table';

@Component({
  selector: 'app-indoor-routes-table',
  imports: [
    CommonModule,
    TranslateModule,
    RoutesTableComponent,
    IndoorRouteEquippersInputComponent,
    RouterLink,
    TuiLink,
  ],
  template: `
    <app-routes-table
      [data]="mappedData()"
      [columns]="columns()"
      [showAddRouteToTopo]="true"
      [availableTopos]="availableTopos()"
      [ascentInfo]="ascentsService.ascentInfo()"
      [isMobile]="layoutService.isMobile()"
      [equippersTemplate]="equippersTpl"
      (updateRouteName)="onUpdateRouteName($event.row, $event.name)"
      (logAscent)="logIndoorAscent($event)"
      (viewAscent)="viewIndoorAscent($event.row, $event.ascent)"
      (deleteRoute)="deleteIndoorRoute($event)"
      (toggleRouteOnTopo)="
        toggleRouteOnTopo($event.topoId, $event.routeId, $event.isAttached)
      "
    />

    <ng-template #equippersTpl let-item let-isEditing="isEditing">
      @if (isEditing) {
        <app-indoor-route-equippers-input
          [route]="indoorRefMap()[item.id]"
          [autoSave]="false"
          (equippersChange)="onUpdateRouteEquippers(item, $event)"
        />
      } @else {
        <div class="flex flex-wrap gap-x-1 gap-y-0.5 items-center min-w-0">
          @for (e of item.equippers; track e.id; let last = $last) {
            <span class="inline-flex items-center min-w-0 max-w-full">
              <a
                tuiLink
                class="text-xs bg-(--tui-background-neutral-1) hover:bg-(--tui-background-neutral-1-hover) text-(--tui-text-primary) px-2 py-0.5 rounded-md transition-colors truncate max-w-full font-medium"
                [routerLink]="e.id > 0 ? ['/equipper', e.id] : null"
              >
                {{ e.name }}
              </a>
              @if (!last) {
                <span class="text-xs opacity-60">,</span>
              }
            </span>
          } @empty {
            <span class="opacity-50 text-xs">-</span>
          }
        </div>
      }
    </ng-template>
  `,
  host: { class: 'block w-full min-w-0' },
})
export class IndoorRoutesTableComponent {
  protected readonly layoutService = inject(LayoutService);
  protected readonly authState = inject(AuthStateService);
  protected readonly indoorService = inject(IndoorService);
  protected readonly ascentsService = inject(AscentsService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);

  data = input<IndoorRouteWithExtras[]>([]);
  centerId = input<string | undefined>();
  centerSlug = input<string | undefined>();
  availableTopos = input<{ id: number | string; name: string }[]>([]);

  private readonly equippersOverrides = signal<Record<string, EquipperDto[]>>(
    {},
  );
  private readonly equippersSaveSeq = new Map<string, number>();
  private readonly equippersSaveChain = new Map<string, Promise<void>>();
  private readonly inFlightEquipperRoutes = new Set<string>();

  constructor() {
    effect(() => {
      this.data();
      if (this.inFlightEquipperRoutes.size === 0) {
        this.equippersOverrides.set({});
      } else {
        this.equippersOverrides.update((prev) => {
          const next: Record<string, EquipperDto[]> = {};
          for (const [id, list] of Object.entries(prev)) {
            if (this.inFlightEquipperRoutes.has(id)) {
              next[id] = list;
            }
          }
          return next;
        });
      }
    });
  }

  protected canEditIndoor(): boolean {
    const cid = this.centerId();
    if (!cid) return false;
    return !!this.authState.indoorAdminPermissions()[cid];
  }

  protected readonly mappedData = computed(() => {
    const isEdit = this.canEditIndoor();
    const slug = this.centerSlug();
    const equipperOverrides = this.equippersOverrides();
    return this.data().map((r) => {
      const override = equipperOverrides[String(r.id)];
      const withEquippers = override ? { ...r, equippers: override } : r;
      const route = slug
        ? { ...withEquippers, center_slug: slug }
        : withEquippers;
      const row = mapRouteToTableRow(route);
      row._ref = r;
      row.canEdit = isEdit;
      row.canDelete = isEdit && !row.hasAscents;
      row.canAddTopo = isEdit;
      return row;
    });
  });

  protected readonly indoorRefMap = computed(() => {
    const equipperOverrides = this.equippersOverrides();
    const map: Record<string, IndoorRouteWithExtras> = {};
    for (const r of this.data()) {
      const id = String(r.id);
      const override = equipperOverrides[id];
      map[id] = override ? { ...r, equippers: override } : r;
    }
    return map;
  });

  protected readonly columns = computed(() => {
    return [
      'grade',
      'route',
      'topo',
      'color',
      'equippers',
      'ascents',
      'actions',
    ];
  });

  protected getIndoorRef(item: RoutesTableRow): IndoorRouteWithExtras {
    return item._ref as IndoorRouteWithExtras;
  }

  protected async logIndoorAscent(
    item: RoutesTableRow | RouteItem | IndoorRouteWithExtras,
  ): Promise<void> {
    const r =
      '_ref' in item
        ? (item._ref as IndoorRouteWithExtras)
        : (item as IndoorRouteWithExtras);
    const success = await firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: r.id,
        routeName: r.name,
        isIndoor: true,
        climbingKind: r.climbing_kind as ClimbingKind | undefined,
        grade: r.grade ?? undefined,
      }),
      { defaultValue: false },
    );
    if (success) {
      this.indoorService.reloadCenterRoutes();
    }
  }

  protected async viewIndoorAscent(
    _item: RoutesTableRow | RouteItem | IndoorRouteWithExtras,
    ascent:
      RouteAscentWithExtras | { id: string | number; type: AscentType | null },
  ): Promise<void> {
    this.ascentsService.viewAscent(ascent.id);
  }

  protected async editIndoorRoute(
    item: RoutesTableRow | RouteItem | IndoorRouteWithExtras,
  ): Promise<void> {
    const r =
      '_ref' in item
        ? (item._ref as IndoorRouteWithExtras)
        : (item as IndoorRouteWithExtras);
    const id = this.centerId();
    if (!id) return;
    const success = await this.indoorService.openIndoorRouteForm(id, r);
    if (success) {
      this.indoorService.reloadCenterRoutes();
    }
  }

  protected onUpdateRouteEquippers(
    row: RoutesTableRow,
    newEquippers: readonly (EquipperDto | string)[],
  ): void {
    const r = row._ref as IndoorRouteWithExtras | undefined;
    const routeId = String(row.id);
    const seq = (this.equippersSaveSeq.get(routeId) ?? 0) + 1;
    this.equippersSaveSeq.set(routeId, seq);
    this.inFlightEquipperRoutes.add(routeId);

    const optimisticEquippers: EquipperDto[] = newEquippers.map((item, idx) =>
      typeof item === 'string'
        ? {
            id: -(idx + 1),
            name: item,
            created_at: '',
            description: null,
            user_id: null,
          }
        : item,
    );

    this.equippersOverrides.update((prev) => ({
      ...prev,
      [routeId]: optimisticEquippers,
    }));

    const payload: (EquipperDto | string)[] = newEquippers.map((item) =>
      typeof item === 'string' ? item : item.id > 0 ? item : item.name,
    );

    const prev = this.equippersSaveChain.get(routeId) ?? Promise.resolve();
    const nextTask = prev.then(async () => {
      try {
        const saved = await this.indoorService.setRouteEquippers(
          routeId,
          payload,
        );
        if (this.equippersSaveSeq.get(routeId) === seq) {
          if (r) {
            r.equippers = saved;
          }
          this.equippersOverrides.update((curr) => ({
            ...curr,
            [routeId]: saved,
          }));
          this.inFlightEquipperRoutes.delete(routeId);
        }
      } catch (err: unknown) {
        if (this.equippersSaveSeq.get(routeId) === seq) {
          this.inFlightEquipperRoutes.delete(routeId);
          this.equippersOverrides.update((curr) => {
            const copy = { ...curr };
            delete copy[routeId];
            return copy;
          });
        }
        handleErrorToast(err, this.toast);
      }
    });
    this.equippersSaveChain.set(routeId, nextTask);
  }

  protected async onUpdateRouteName(
    row: RoutesTableRow,
    newName: string,
  ): Promise<void> {
    const r = row._ref as IndoorRouteWithExtras | undefined;
    const trimmed = newName.trim();
    if (!trimmed || (r && trimmed === r.name)) return;
    try {
      if (r) {
        r.name = trimmed;
      }
      await this.indoorService.updateRoute(String(row.id), { name: trimmed });
      this.indoorService.reloadCenterRoutes();
    } catch (err: unknown) {
      handleErrorToast(err, this.toast);
    }
  }

  protected async deleteIndoorRoute(
    item: RoutesTableRow | RouteItem | IndoorRouteWithExtras,
  ): Promise<void> {
    const hasAscents =
      '_ref' in item
        ? (item.hasAscents ?? (item.ascents > 0 || !!item.own_ascent))
        : (item.ascent_count ?? 0) > 0 || !!item.own_ascent;
    if (hasAscents) return;

    const r =
      '_ref' in item
        ? (item._ref as IndoorRouteWithExtras)
        : (item as IndoorRouteWithExtras);
    if (!this.isBrowser) return;
    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('routes.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('routes.deleteConfirm', {
            name: r.name || this.translate.instant('route'),
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'primary-destructive',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    );
    if (!confirmed) return;
    try {
      await this.indoorService.deleteRoute(r.id);
      this.indoorService.reloadCenterRoutes();
    } catch (e: unknown) {
      console.error('[IndoorRoutesTable] error deleting route', e);
      handleErrorToast(e, this.toast);
    }
  }

  protected async toggleRouteOnTopo(
    topoId: number | string,
    routeId: number | string,
    isPresent: boolean,
  ): Promise<void> {
    const tid = typeof topoId === 'string' ? topoId : String(topoId);
    const rid = typeof routeId === 'string' ? routeId : String(routeId);
    try {
      await this.supabaseService.whenReady();
      const client = this.supabaseService.client;
      if (isPresent) {
        const { error } = await client
          .from('indoor_topo_routes')
          .delete()
          .eq('topo_id', tid)
          .eq('route_id', rid);
        if (error) throw error;
      } else {
        const { error } = await client.from('indoor_topo_routes').insert({
          topo_id: tid,
          route_id: rid,
          number: 0,
          user_creator_id: this.supabaseService.authUserId(),
        });
        if (error) throw error;
      }
      this.indoorService.reloadCenterRoutes();
    } catch (e: unknown) {
      console.error('[IndoorRoutesTable] error toggling route on topo', e);
      handleErrorToast(e, this.toast);
    }
  }
}
