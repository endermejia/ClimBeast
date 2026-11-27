import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { TuiSortDirection } from '@taiga-ui/addon-table';
import { TuiDialogService, TuiLink } from '@taiga-ui/core';
import { TUI_CONFIRM, type TuiConfirmData } from '@taiga-ui/kit';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../../services/ascents.service';
import { AuthStateService } from '../../services/auth-state.service';
import { CragRoutesDataService } from '../../services/crag-routes-data.service';
import { LayoutService } from '../../services/layout.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { RoutesService } from '../../services/routes.service';
import { ToastService } from '../../services/toast.service';
import { ToposService } from '../../services/topos.service';

import {
  AscentType,
  EquipperDto,
  IndoorRouteWithExtras,
  RouteAscentWithExtras,
  RouteItem,
  RoutesTableKey,
  RoutesTableRow,
} from '../../models';

import { handleErrorToast, mapRouteToTableRow } from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';
import { RouteEquippersInputComponent } from './route-equippers-input';
import { RouteEquippersQueue } from './route-equippers-queue';
import { RoutesTableComponent } from './routes-table';

@Component({
  selector: 'app-outdoor-routes-table',
  imports: [
    CommonModule,
    RouteEquippersInputComponent,
    RouterLink,
    RoutesTableComponent,
    TranslateModule,
    TuiLink,
  ],
  template: `
    <app-routes-table
      [data]="mappedData()"
      [columns]="columns()"
      [direction]="direction()"
      [activeCol]="activeCol()"
      [showRowColors]="showRowColors()"
      [showAddRouteToTopo]="showAddRouteToTopo()"
      [showLocation]="showLocation()"
      [availableTopos]="availableTopos()"
      [toposByCrag]="toposByCrag()"
      [availableCrags]="availableCrags()"
      [ascentInfo]="ascentsService.ascentInfo()"
      [isMobile]="layoutService.isMobile()"
      [equippersTemplate]="equippersTpl"
      (updateRouteHeight)="onUpdateRouteHeight($event.row, $event.height)"
      (updateRouteName)="onUpdateRouteName($event.row, $event.name)"
      (updateRouteCrag)="onUpdateRouteCrag($event.row, $event.cragId)"
      (toggleRouteOnTopo)="
        toggleRouteOnTopo($event.topoId, $event.routeId, $event.isAttached)
      "
      (logAscent)="onLogAscent($event)"
      (viewAscent)="onViewAscent($event.row, $event.ascent)"
      (toggleProject)="onToggleProject($event)"
      (deleteRoute)="deleteRoute($event)"
    />

    <ng-template #equippersTpl let-item let-isEditing="isEditing">
      @if (isEditing) {
        <app-route-equippers-input
          [route]="outdoorRefMap()[item.id]"
          [autoSave]="false"
          (equippersChange)="onUpdateRouteEquippers(item, $event)"
        />
      } @else {
        <div
          class="flex flex-wrap gap-x-1 gap-y-0.5 items-center min-w-0 w-full max-w-full"
        >
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
export class OutdoorRoutesTableComponent {
  protected readonly layoutService = inject(LayoutService);
  protected readonly authState = inject(AuthStateService);
  protected readonly cragRoutesData = inject(CragRoutesDataService);
  protected readonly outdoorData = inject(OutdoorDataService);
  protected readonly routesService = inject(RoutesService);
  protected readonly toposService = inject(ToposService);
  protected readonly ascentsService = inject(AscentsService);
  protected readonly router = inject(Router);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);

  // Inputs
  data = input<RouteItem[]>([]);
  showLocation = input(false);
  showAdminActions = input(true);
  showRowColors = input(true);
  showAddRouteToTopo = input(true);
  hiddenColumns = input<string[]>([]);
  activeCol = input<RoutesTableKey>('ascents');
  direction = input<TuiSortDirection>(TuiSortDirection.Desc);

  // Outputs
  routeUpdated = output<void>();

  private readonly equippersQueue = new RouteEquippersQueue();

  constructor() {
    effect(() => {
      this.data();
      this.equippersQueue.reconcileWithData();
    });
  }

  protected readonly mappedData = computed(() => {
    const isAsAdmin = this.authState.canEditAsAdmin();
    const areaAdminMap = this.authState.areaAdminPermissions();
    const equipperOverrides = this.equippersQueue.overrides();

    return this.data().map((r) => {
      const override = equipperOverrides[String(r.id)];
      const routeItem = override ? { ...r, equippers: override } : r;
      const row = mapRouteToTableRow(routeItem);
      row._ref = r;
      const canEdit = this.authState.checkRouteEditPermission(r);
      row.canEdit = canEdit;
      row.canDelete =
        (isAsAdmin || !!areaAdminMap[r.area_id || -1]) && !row.hasAscents;
      row.canAddTopo = canEdit;
      return row;
    });
  });

  protected readonly outdoorRefMap = computed(() => {
    const equipperOverrides = this.equippersQueue.overrides();
    const map: Record<string | number, RouteItem> = {};
    for (const r of this.data()) {
      const override = equipperOverrides[String(r.id)];
      map[r.id] = override ? { ...r, equippers: override } : r;
    }
    return map;
  });

  protected readonly columns = computed(() => {
    const cols = [
      'grade',
      'route',
      ...(this.showLocation() ? ['crag'] : []),
      'topo',
      'equippers',
      'height',
      'ascents',
      'actions',
    ];

    return cols.filter((c) => !this.hiddenColumns().includes(c));
  });

  protected readonly availableCrags = computed(() => {
    const crags = this.outdoorData.cragsList();
    if (crags.length > 0) {
      return crags.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
    }
    const crag = this.outdoorData.cragDetail();
    if (crag) {
      return [{ id: crag.id, name: crag.name, slug: crag.slug }];
    }
    const cragsFromData = new Map<
      number,
      { id: number; name: string; slug?: string }
    >();
    for (const r of this.data()) {
      if (r.crag_id && r.crag_name) {
        cragsFromData.set(r.crag_id, {
          id: r.crag_id,
          name: r.crag_name,
          slug: r.crag_slug,
        });
      }
    }
    return Array.from(cragsFromData.values());
  });

  protected readonly toposByCrag = computed(() => {
    const map: Record<
      string | number,
      { id: number | string; name: string }[]
    > = {};

    for (const c of this.outdoorData.cragsList()) {
      if (c.topos) {
        map[c.id] = c.topos.map((t) => ({ id: t.id, name: t.name }));
      }
    }

    for (const t of this.outdoorData.areaTopos()) {
      const crag = this.outdoorData
        .cragsList()
        .find((c) => c.slug === t.crag_slug);
      if (crag) {
        map[crag.id] = map[crag.id] || [];
        if (!map[crag.id].some((x) => x.id === t.id)) {
          map[crag.id].push({ id: t.id, name: t.name });
        }
      }
    }

    const crag = this.outdoorData.cragDetail();
    if (crag && crag.topos) {
      map[crag.id] = map[crag.id] || [];
      for (const t of crag.topos) {
        if (!map[crag.id].some((x) => x.id === t.id)) {
          map[crag.id].push({ id: t.id, name: t.name });
        }
      }
    }

    for (const r of this.data()) {
      if (r.crag_id && r.topos) {
        map[r.crag_id] = map[r.crag_id] || [];
        for (const t of r.topos) {
          if (!map[r.crag_id].some((x) => x.id === t.id)) {
            map[r.crag_id].push({ id: t.id, name: t.name });
          }
        }
      }
    }

    return map;
  });

  protected readonly availableTopos = computed(() => {
    const crag = this.outdoorData.cragDetail();
    if (!crag || !crag.topos) return [];
    return crag.topos.map((t) => ({ id: t.id, name: t.name }));
  });

  protected onUpdateRouteEquippers(
    row: RoutesTableRow,
    newEquippers: readonly (EquipperDto | string)[],
  ): void {
    const r = row._ref as RouteItem;
    const routeId = r.id;
    void this.equippersQueue.enqueue({
      routeId,
      equippers: newEquippers,
      save: (payload) => this.routesService.setRouteEquippers(routeId, payload),
      onSaved: (saved) => {
        r.equippers = saved;
        this.routeUpdated.emit();
      },
      onError: (err) => handleErrorToast(err, this.toast),
    });
  }

  protected onUpdateRouteName(row: RoutesTableRow, name: string): void {
    const r = row._ref as RouteItem;
    const trimmed = name.trim();
    if (!trimmed || trimmed === r.name) return;

    r.name = trimmed;
    this.routesService
      .update(r.id, { name: trimmed })
      .then(() => this.routeUpdated.emit())
      .catch((err) => handleErrorToast(err, this.toast));
  }

  protected async onUpdateRouteCrag(
    row: RoutesTableRow,
    cragId: number,
  ): Promise<void> {
    const r = row._ref as RouteItem;
    if (r.crag_id === cragId) return;

    try {
      const oldTopos = row.topos || [];
      for (const t of oldTopos) {
        await this.toposService.removeRoute(t.id, r.id, false);
      }
      r.crag_id = cragId;
      await this.routesService.update(r.id, { crag_id: cragId });
      this.routeUpdated.emit();
    } catch (err: unknown) {
      handleErrorToast(err, this.toast);
    }
  }

  protected onUpdateRouteHeight(
    row: RoutesTableRow,
    newHeight: number | string | null,
  ): void {
    const r = row._ref as RouteItem;
    const val =
      newHeight === null || newHeight === ''
        ? null
        : typeof newHeight === 'string'
          ? parseInt(newHeight, 10)
          : newHeight;

    if ((val ?? null) === (r.height ?? null)) return;

    r.height = val;
    this.routesService
      .update(r.id, { height: val })
      .then(() => this.routeUpdated.emit())
      .catch((err) => handleErrorToast(err, this.toast));
  }

  protected async toggleRouteOnTopo(
    topoId: number | string,
    routeId: number | string,
    isPresent: boolean,
  ): Promise<void> {
    const tid = typeof topoId === 'string' ? parseInt(topoId, 10) : topoId;
    const rid = typeof routeId === 'string' ? parseInt(routeId, 10) : routeId;
    try {
      if (isPresent) {
        await this.toposService.removeRoute(tid, rid, false);
      } else {
        await this.toposService.addRoute(
          {
            topo_id: tid,
            route_id: rid,
            number: 0,
          },
          false,
        );
      }
      await this.cragRoutesData.cragRoutesResource.reload();
      await this.outdoorData.cragDetailResource.reload();
      this.routeUpdated.emit();
    } catch (e: unknown) {
      console.error('[OutdoorRoutesTable] error toggling route on topo', e);
      handleErrorToast(e, this.toast);
    }
  }

  protected async onLogAscent(
    item: RoutesTableRow | RouteItem | IndoorRouteWithExtras,
  ): Promise<void> {
    const r = '_ref' in item ? (item._ref as RouteItem) : (item as RouteItem);
    void firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: r.id,
        routeName: r.name,
        grade: r.grade,
        climbingKind: r.climbing_kind,
      }),
      { defaultValue: undefined },
    );
  }

  protected onViewAscent(
    _row: RoutesTableRow | RouteItem | IndoorRouteWithExtras,
    ascent:
      RouteAscentWithExtras | { id: string | number; type: AscentType | null },
  ): void {
    this.ascentsService.viewAscent(ascent.id);
  }

  protected onToggleProject(item: RoutesTableRow): void {
    const r = item._ref as RouteItem;
    this.routesService.toggleRouteProject(r.id, r);
  }

  protected openEditRoute(
    row: RoutesTableRow | RouteItem | IndoorRouteWithExtras,
  ): void {
    const r = '_ref' in row ? (row._ref as RouteItem) : (row as RouteItem);
    this.routesService.openRouteForm({
      cragId: r.crag_id,
      routeData: {
        id: r.id,
        crag_id: r.crag_id,
        name: r.name,
        slug: r.slug,
        grade: Number(r.grade),
        climbing_kind: r.climbing_kind,
        height: r.height || null,
      },
    });
  }

  protected async deleteRoute(
    row: RoutesTableRow | RouteItem | IndoorRouteWithExtras,
  ): Promise<void> {
    if (!this.isBrowser) return;
    const hasAscents =
      '_ref' in row
        ? (row.hasAscents ?? (row.ascents > 0 || !!row.own_ascent))
        : (row.ascent_count ?? 0) > 0 || !!row.own_ascent;
    if (hasAscents) return;

    const r = '_ref' in row ? (row._ref as RouteItem) : (row as RouteItem);

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
      await this.routesService.delete(r.id);
      this.routeUpdated.emit();
    } catch (err: unknown) {
      handleErrorToast(err, this.toast);
    }
  }
}
