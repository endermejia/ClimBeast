import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
} from '@angular/core';

import {
  TuiButton,
  TuiDataList,
  TuiHint,
  TuiIcon,
  TuiLoader,
} from '@taiga-ui/core';
import { TUI_CONFIRM, TuiBadge, type TuiConfirmData } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AuthStateService } from '../../services/auth-state.service';
import { LayoutService } from '../../services/layout.service';
import { TopoImageCacheService } from '../../services/topo-image-cache.service';

import { PaywallComponent } from '../../components/paywall/paywall';
import { TopoRoutesTableComponent } from '../../components/topo/topo-routes-table';
import { TopoViewerComponent } from '../../components/topo/topo-viewer';
import type { TopoRouteRow } from '../../components/topo/topo.types';
import {
  SectionHeaderAction,
  SectionHeaderComponent,
} from '../../components/ui/section-header';

import type { TopoDetail, TopoRouteWithRoute } from '../../models';

import { ShadeInfoPipe } from '../../pipes';

import { TopoPageBase } from './topo-page-base';

@Component({
  selector: 'app-outdoor-topo',
  imports: [
    PaywallComponent,
    ShadeInfoPipe,
    SectionHeaderComponent,
    TopoViewerComponent,
    TopoRoutesTableComponent,
    TranslatePipe,
    TuiBadge,
    TuiButton,
    TuiDataList,
    TuiHint,
    TuiIcon,
    TuiLoader,
  ],
  template: `
    <div class="h-full w-full">
      <section class="flex flex-col w-full h-full md:p-4">
        @let isMobile = layoutService.isMobile();
        @let canEditAsAdmin = authState.canEditAsAdmin();
        @if (topo(); as t) {
          @let canAreaAdmin =
            t.crag
              ? authState.areaAdminPermissions()[t.crag.area_id || -1]
              : false;
          <div class="px-4 pt-4 pb-1.5 md:p-0 md:mb-4 shrink-0">
            <app-section-header
              [title]="t.name"
              [showLike]="false"
              [titleDropdown]="topoDropdown"
              [itemCount]="sortedAreaTopos().length"
              [actions]="headerActions()"
            >
              <ng-container titleInfo>
                @if (t.legacy) {
                  <span
                    tuiBadge
                    size="s"
                    appearance="neutral"
                    class="uppercase text-[10px] shrink-0"
                  >
                    {{ 'indoor.legacy' | translate }}
                  </span>
                }
                @if (t | shadeInfo; as info) {
                  <tui-icon
                    [icon]="info.icon"
                    [tuiHint]="
                      (info.label | translate) +
                      (t.shade_change_hour
                        ? ' (' +
                          ('filters.shade.changeAt' | translate) +
                          ' ' +
                          t.shade_change_hour +
                          ')'
                        : '')
                    "
                    class="text-2xl opacity-70"
                  />
                }
              </ng-container>

              <ng-template #topoDropdown>
                <tui-data-list>
                  @for (item of sortedAreaTopos(); track item.id) {
                    <button
                      tuiOption
                      new
                      type="button"
                      [disabled]="item.id === t.id"
                      (click.zoneless)="navigateToTopo(item)"
                    >
                      {{ item.name }}
                    </button>
                  }
                </tui-data-list>
              </ng-template>
            </app-section-header>
          </div>

          @let isPublic = t.crag?.area?.is_public;
          @let purchased = t.crag?.area?.purchased;
          @let isCreator =
            t.crag?.user_creator_id === authState.userProfile()?.id;
          @let hasAccess =
            isPublic ||
            purchased ||
            canEditAsAdmin ||
            canAreaAdmin ||
            isCreator;

          @if (!hasAccess) {
            @let isSecret =
              !isPublic &&
              (t.crag?.area?.price === null || t.crag?.area?.price === 0);
            @if (!isSecret) {
              <div
                class="flex flex-col items-center justify-center grow p-4 sm:p-8 w-full max-w-lg mx-auto"
              >
                <app-paywall
                  [areaId]="t.crag?.area?.id || 0"
                  [price]="t.crag?.area?.price || 0"
                  [areaName]="t.crag?.area?.name || ''"
                />
              </div>
            } @else {
              <div
                class="flex flex-col items-center justify-center grow gap-4 p-8 text-center h-[50vh] w-full"
              >
                <tui-icon icon="@tui.lock" class="text-6xl opacity-50" />
                <h2 class="text-2xl font-bold">
                  {{ 'topos.restricted' | translate }}
                </h2>
                <p class="max-w-md opacity-70">
                  {{ 'topos.restrictedMessage' | translate }}
                </p>
                <button
                  tuiButton
                  appearance="secondary"
                  (click)="router.navigate(['/area', t.crag?.area?.slug])"
                >
                  {{ 'back' | translate }}
                </button>
              </div>
            }
          } @else {
            <div
              class="grid grid-cols-1 grid-rows-[minmax(0,3fr)_minmax(0,2fr)] lg:grid-cols-3 lg:grid-rows-1 w-full flex-1 min-h-0 gap-0 lg:gap-4 overflow-hidden"
            >
              <app-topo-viewer
                class="relative w-full h-full lg:col-span-2"
                [topoImage]="topoImageResource.value()"
                [topoName]="t.name"
                [renderedRoutes]="renderedTopoRoutes()"
                [hasAccess]="hasAccess"
                [selectedRouteId]="selectedRouteId()"
                [hoveredRouteId]="hoveredRouteId()"
                (selectedRouteIdChange)="selectedRouteId.set($event)"
                (hoveredRouteIdChange)="hoveredRouteId.set($event)"
                (imageRatioChange)="imageRatio.set($event)"
              />

              <app-topo-routes-table
                class="w-full h-full min-w-0 min-h-0 overflow-hidden"
                [sortedTableData]="sortedTableData()"
                [columns]="columns()"
                [isMobile]="isMobile"
                [selectedRouteId]="selectedRouteId()"
                [hasAccess]="hasAccess"
                [isIndoor]="isIndoor()"
                [direction]="direction()"
                [sorter]="sorter()"
                [topoId]="t.id"
                [areaId]="t.crag?.area?.id || 0"
                [areaPrice]="t.crag?.area?.price || 0"
                (selectedRouteIdChange)="selectedRouteId.set($event)"
                (hoveredRouteIdChange)="hoveredRouteId.set($event)"
                (sortChange)="onSortChange($event)"
              />
            </div>
          }
        } @else {
          <div class="flex items-center justify-center h-full">
            <tui-loader size="xxl" />
          </div>
        }
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex grow h-full overflow-hidden',
    style: 'touch-action: auto',
  },
})
export class OutdoorTopoComponent extends TopoPageBase {
  protected readonly authState = inject(AuthStateService);
  protected readonly layoutService = inject(LayoutService);
  protected readonly topoImageCache = inject(TopoImageCacheService);

  override isIndoor = computed(() => false);

  protected readonly areaId = computed(
    () => this.topo()?.crag?.area?.id ?? null,
  );

  protected readonly topoImageResource = resource({
    params: () => {
      const t = this.topo();
      if (!t?.photo) return null;
      const area = t.crag?.area;
      const isPublic = area?.is_public;
      const purchased = area?.purchased;
      const isCreator =
        t.crag?.user_creator_id === this.authState.userProfile()?.id;
      const canEditAsAdmin = this.authState.canEditAsAdmin();
      const crag = this.crag();
      const canAreaAdmin = crag
        ? this.authState.areaAdminPermissions()[crag.area_id || -1]
        : false;
      const hasAccess =
        isPublic || purchased || canEditAsAdmin || canAreaAdmin || isCreator;
      if (!hasAccess) return null;
      return { path: t.photo, version: this.outdoorData.topoPhotoVersion() };
    },
    loader: async ({ params }) => {
      if (!params) return null;
      const url = await this.supabase.getTopoSignedUrl(
        params.path,
        params.version,
      );
      // Bytes cacheados: la imagen ya vista se muestra sin red (offline).
      // La versión (?v=) de la URL cambia al subir una foto nueva, por lo que
      // la copia antigua se descarta sola con el límite de entradas.
      return this.topoImageCache.resolve(url);
    },
  });

  protected readonly canDraw = computed(() => {
    const t = this.topo();
    if (!t || !t.photo) return false;
    const crag = this.crag();
    return this.authState.checkCragEditPermissionDirect(t.crag ?? crag);
  });

  protected readonly headerActions = computed<SectionHeaderAction[]>(() => {
    const t = this.topo();
    if (!t) return [];

    const actions: SectionHeaderAction[] = [];
    const isAdmin = this.authState.isAdmin();
    const crag = this.crag();
    const areaId = t.crag?.area_id ?? crag?.area_id ?? -1;
    const canAreaAdmin = this.authState.isAreaAdminOf(areaId);
    const canEdit = this.authState.checkCragEditPermissionDirect(
      t.crag ?? crag,
    );

    if (this.canDraw()) {
      actions.push({
        label: 'draw',
        icon: '/image/topo.svg',
        appearance: 'neutral',
        action: () => this.openDrawTopo(t),
      });
    }
    if (canEdit) {
      actions.push({
        label: 'edit',
        icon: '@tui.square-pen',
        appearance: 'neutral',
        action: () => this.openEditTopo(t),
      });
      if (isAdmin || canAreaAdmin) {
        actions.push({
          label: 'delete',
          icon: '@tui.trash',
          appearance: 'negative',
          action: () => this.deleteTopo(t),
        });
      }
    }

    return actions;
  });

  protected readonly columns = computed(() => {
    const isMobile = this.layoutService.isMobile();
    return isMobile
      ? ['index', 'grade', 'name', 'actions']
      : ['index', 'grade', 'name', 'height', 'actions'];
  });

  protected readonly tableData = computed(() => {
    const topo = this.topo();
    if (!topo) return [];
    return topo.topo_routes.map((tr: TopoRouteWithRoute) => {
      const r = tr.route;
      const climbed = !!r.own_ascent && r.own_ascent.type !== 'attempt';
      const project = !!r.project;
      return {
        index: tr.number,
        name: r.name,
        grade: r.grade,
        height: r.height || null,
        slug: r.slug,
        link: ['/area', this.areaSlug()!, this.cragSlug()!, r.slug],
        climbed,
        project,
        _ref: tr,
      } as TopoRouteRow;
    });
  });

  protected readonly sortedTableData = computed(() => {
    const data = this.tableData();
    const sorter = this.sorter();
    const direction = this.direction();
    if (!sorter) return data;
    return [...data].sort((a, b) => {
      const result = sorter(a, b);
      return direction === 1 ? -result : result;
    });
  });

  protected async openDrawTopo(topo: TopoDetail): Promise<void> {
    if (!this.isBrowser) return;
    const photoPath = topo.photo;
    if (!photoPath) return;
    const imageUrl =
      this.topoImageResource.value() ||
      (await this.supabase.getTopoSignedUrl(
        photoPath,
        this.outdoorData.topoPhotoVersion(),
      ));
    if (!imageUrl) return;

    const routes = (topo.topo_routes || []).map((tr, i) => ({
      topo_id: topo.id,
      route_id: tr.route_id,
      number: tr.number ?? i,
      route: tr.route,
      path: tr.path,
    }));

    const result = await this.toposService.openTopoPathEditor({
      imageUrl,
      topoRoutes: routes as TopoRouteWithRoute[],
      topoName: topo.name,
      topoId: topo.id,
      standalone: true,
      isIndoor: false,
    });

    if (result) {
      this.outdoorData.topoDetailResource.reload();
    }
  }

  protected openEditTopo(topo: TopoDetail): void {
    if (!this.isBrowser) return;
    const initialRouteIds = topo.topo_routes.map((tr) => tr.route_id);
    this.toposService.openTopoForm({
      cragId: topo.crag_id,
      outdoorData: topo,
      initialRouteIds,
    });
  }

  protected deleteTopo(topo: TopoDetail): void {
    if (!this.isBrowser) return;
    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('topos.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('topos.deleteConfirm', {
            name: topo.name,
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'primary-destructive',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then((confirmed) => {
      if (!confirmed) return;
      this.toposService
        .delete(topo.id)
        .then(() =>
          this.router.navigate(['/area', this.areaSlug()!, this.cragSlug()!]),
        )
        .catch(() => {
          // noop
        });
    });
  }
}
