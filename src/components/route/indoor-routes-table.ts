import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiLink } from '@taiga-ui/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AppDialogsService } from '../../services/app-dialogs.service';
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

import { handleErrorToast, mapRouteToTableRow } from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';
import { RouteEquippersInputComponent } from './route-equippers-input';
import { RouteEquippersQueue } from './route-equippers-queue';
import { RoutesTableComponent } from './routes-table';

@Component({
  selector: 'app-indoor-routes-table',
  imports: [
    TranslateModule,
    RoutesTableComponent,
    RouteEquippersInputComponent,
    RouterLink,
    TuiLink,
  ],
  template: `
    <app-routes-table
      [data]="mappedData()"
      [columns]="columns()"
      [showRowColors]="showRowColors()"
      [showAddRouteToTopo]="showAddRouteToTopo()"
      [showLocation]="showLocation()"
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
        <app-route-equippers-input
          mode="indoor"
          [route]="indoorRefMap()[item.id]"
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
export class IndoorRoutesTableComponent {
  protected readonly layoutService = inject(LayoutService);
  protected readonly authState = inject(AuthStateService);
  protected readonly indoorService = inject(IndoorService);
  protected readonly ascentsService = inject(AscentsService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly appDialogs = inject(AppDialogsService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);

  data = input<IndoorRouteWithExtras[]>([]);
  centerId = input<string | undefined>();
  centerSlug = input<string | undefined>();
  availableTopos = input<{ id: number | string; name: string }[]>([]);
  showRowColors = input<boolean>(true);
  showAddRouteToTopo = input<boolean>(true);
  showLocation = input<boolean>(false);

  routeUpdated = output<void>();

  private readonly equippersQueue = new RouteEquippersQueue();

  constructor() {
    effect(() => {
      this.data();
      this.equippersQueue.reconcileWithData();
    });
  }

  protected canEditIndoor(route?: IndoorRouteWithExtras): boolean {
    const cid =
      this.centerId() || (route?.center_id ? String(route.center_id) : '');
    if (!cid) return false;
    return (
      !!this.authState.indoorAdminPermissions()[cid] ||
      this.authState.canEditAsAdmin()
    );
  }

  protected readonly mappedData = computed(() => {
    const cid = this.centerId();
    const slug = this.centerSlug();
    const perms = this.authState.indoorAdminPermissions();
    const isAdmin = this.authState.canEditAsAdmin();
    const allowAddTopo = this.showAddRouteToTopo();
    const equipperOverrides = this.equippersQueue.overrides();

    return this.data().map((r) => {
      const override = equipperOverrides[String(r.id)];
      const withEquippers = override ? { ...r, equippers: override } : r;
      const route = slug
        ? { ...withEquippers, center_slug: slug }
        : withEquippers;
      const row = mapRouteToTableRow(route);
      row._ref = r;
      const effectiveCenterId = cid || (r.center_id ? String(r.center_id) : '');
      const canEdit =
        !!effectiveCenterId && (!!perms[effectiveCenterId] || isAdmin);
      row.canEdit = canEdit;
      row.canDelete = canEdit && !row.hasAscents;
      row.canAddTopo = canEdit && allowAddTopo;
      return row;
    });
  });

  protected readonly indoorRefMap = computed(() => {
    const equipperOverrides = this.equippersQueue.overrides();
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
      ...(this.showLocation() ? ['center'] : []),
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
      if (this.centerId()) {
        this.indoorService.reloadCenterRoutes();
      }
      this.routeUpdated.emit();
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
    const id =
      this.centerId() || (r.center_id ? String(r.center_id) : undefined);
    if (!id) return;
    const success = await this.indoorService.openIndoorRouteForm(id, r);
    if (success) {
      if (this.centerId()) {
        this.indoorService.reloadCenterRoutes();
      }
      this.routeUpdated.emit();
    }
  }

  protected onUpdateRouteEquippers(
    row: RoutesTableRow,
    newEquippers: readonly (EquipperDto | string)[],
  ): void {
    const r = row._ref as IndoorRouteWithExtras | undefined;
    const routeId = String(row.id);
    void this.equippersQueue.enqueue({
      routeId,
      equippers: newEquippers,
      save: (payload) => this.indoorService.setRouteEquippers(routeId, payload),
      onSaved: (saved) => {
        if (r) {
          r.equippers = saved;
        }
        this.routeUpdated.emit();
      },
      onError: (err) => handleErrorToast(err, this.toast),
    });
  }

  protected async onUpdateRouteName(
    row: RoutesTableRow,
    newName: string,
  ): Promise<void> {
    const r = row._ref as IndoorRouteWithExtras | undefined;
    const trimmed = newName.trim();
    if (!trimmed || (r && trimmed === r.name)) return;
    const prevName = r?.name;
    try {
      if (r) {
        r.name = trimmed;
      }
      await this.indoorService.updateRoute(String(row.id), { name: trimmed });
      if (this.centerId()) {
        this.indoorService.reloadCenterRoutes();
      }
      this.routeUpdated.emit();
    } catch (err: unknown) {
      if (r && prevName !== undefined) {
        r.name = prevName;
      }
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
    const confirmed = await this.appDialogs.confirm({
      labelKey: 'routes.deleteTitle',
      contentKey: 'routes.deleteConfirm',
      contentParams: {
        name: r.name || this.translate.instant('route'),
      },
      yesKey: 'delete',
      noKey: 'cancel',
      appearance: 'primary-destructive',
    });
    if (!confirmed) return;
    try {
      await this.indoorService.deleteRoute(r.id);
      if (this.centerId()) {
        this.indoorService.reloadCenterRoutes();
      }
      this.routeUpdated.emit();
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
      if (this.centerId()) {
        this.indoorService.reloadCenterRoutes();
      }
      this.routeUpdated.emit();
    } catch (e: unknown) {
      console.error('[IndoorRoutesTable] error toggling route on topo', e);
      handleErrorToast(e, this.toast);
    }
  }
}
