import {
  computed,
  Directive,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  Signal,
} from '@angular/core';
import { Router } from '@angular/router';

import {
  TuiSortDirection,
  type TuiTableSortChange,
} from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { TuiDialogService } from '@taiga-ui/core';

import { TranslateService } from '@ngx-translate/core';

import { AscentsService } from '../../services/ascents.service';
import { BreadcrumbsService } from '../../services/breadcrumbs.service';

import { IndoorDataService } from '../../services/indoor-data.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { RoutesService } from '../../services/routes.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { ToposService } from '../../services/topos.service';

import { TopoRouteWithRoute } from '../../models';
import type { TopoDetail, TopoListItem } from '../../models';

import { TopoRouteRow } from '../../pipes/table-sorter.pipe';

import {
  getRouteStyleProperties,
  getRouteStrokeWidth,
  getPointsString as getPointsStringUtil,
} from '../../utils/topo-styles.utils';

import { IS_BROWSER } from '../../app/is-browser';

@Directive()
export abstract class TopoPageBase {
  protected readonly outdoorData = inject(OutdoorDataService);
  protected readonly indoorData = inject(IndoorDataService);
  protected readonly breadcrumbsService = inject(BreadcrumbsService);
  protected readonly supabase = inject(SupabaseService);
  protected readonly ascentsService = inject(AscentsService);
  protected readonly toposService = inject(ToposService);

  protected readonly routesService = inject(RoutesService);
  protected readonly router = inject(Router);
  protected readonly isBrowser = inject(IS_BROWSER);
  protected readonly dialogs = inject(TuiDialogService);
  protected readonly translate = inject(TranslateService);
  protected readonly toast = inject(ToastService);

  abstract isIndoor: Signal<boolean>;

  countrySlug = input<string | undefined>(undefined);
  areaSlug = input<string | undefined>(undefined);
  cragSlug = input<string | undefined>(undefined);
  centerSlug = input<string | undefined>(undefined);
  id = input<string | undefined>();
  sectorSlug = input<string | undefined>();

  protected readonly topo = computed(() => {
    return this.isIndoor()
      ? this.indoorData.topoDetailResource.value()
      : this.outdoorData.topoDetailResource.value();
  });
  protected readonly crag = this.outdoorData.cragDetailResource.value;
  protected readonly allAreaTopos = computed(() => {
    return this.isIndoor()
      ? this.indoorData.centerToposResource.value()
      : this.outdoorData.areaToposResource.value();
  });

  protected readonly selectedRouteId = signal<string | number | null>(null);
  protected readonly hoveredRouteId = signal<string | number | null>(null);

  protected readonly selectedRouteInfo = computed(() => {
    const routeId = this.selectedRouteId();
    const topo = this.topo();
    if (!routeId || !topo || !topo.topo_routes) return null;
    return (
      topo.topo_routes.find(
        (r: TopoRouteWithRoute) => r?.route_id === routeId,
      ) || null
    );
  });

  protected readonly imageRatio = signal(1);

  protected readonly renderedTopoRoutes = computed(() => {
    const t = this.topo();
    if (!t) return [];
    const selectedId = this.selectedRouteId();
    const hoveredId = this.hoveredRouteId();
    const ratio = this.imageRatio();
    const hScale = 1000 / ratio;
    const routes = [...t.topo_routes];
    routes.sort((a, b) => {
      const getPriority = (id: string | number) => {
        if (id === selectedId) return 2;
        if (id === hoveredId) return 1;
        return 0;
      };
      return getPriority(a.route_id) - getPriority(b.route_id);
    });
    return routes.map((tr) => {
      const isSelected = tr.route_id === selectedId;
      const isHovered = tr.route_id === hoveredId;
      const style = getRouteStyleProperties(
        isSelected,
        isHovered,
        tr.route.grade,
        tr.route.color || tr.path?.color,
      );
      const width = getRouteStrokeWidth(
        isSelected,
        isHovered,
        5,
        'viewer',
        tr.path?.width,
      );
      const pointsString = tr.path
        ? getPointsStringUtil(tr.path.points, 1000, hScale)
        : '';
      return { ...tr, style, width, pointsString };
    });
  });

  protected readonly sortedAreaTopos = computed(() => {
    const topos = this.allAreaTopos() || [];
    return [...topos].sort((a, b) => a.name.localeCompare(b.name));
  });

  protected readonly direction = signal<TuiSortDirection>(TuiSortDirection.Asc);
  protected readonly sorter = signal<TuiComparator<TopoRouteRow>>(() => 0);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.isIndoor()) {
        this.breadcrumbsService.selectedIndoorCenter.set(null);
      }
    });

    effect(() => {
      const t = this.topo();
      if (this.isIndoor() && t) {
        this.breadcrumbsService.selectedIndoorCenter.set({
          id: t.center_id || '',
          name: t.crag?.name || '',
          slug: t.crag?.slug || '',
        } as never);
      }
    });

    effect(() => {
      const topoId = this.id() ? String(this.id()) : null;
      if (this.isIndoor()) {
        const center = this.centerSlug();
        this.indoorData.selectedCenterSlug.set(center || null);
        this.outdoorData.selectTopo(null, null, topoId);
      } else {
        const area = this.areaSlug();
        const crag = this.cragSlug();
        this.indoorData.selectedCenterSlug.set(null);
        this.outdoorData.selectTopo(area || null, crag || null, topoId);
      }
      this.indoorData.selectedTopoId.set(topoId);
    });

    effect(() => {
      if (!this.isBrowser) return;
      const isLoading = this.isIndoor()
        ? this.indoorData.topoDetailResource.isLoading()
        : this.outdoorData.topoDetailResource.isLoading();
      if (isLoading) return;
      const t = this.topo();
      if (!t) {
        this.router.navigateByUrl('/page-not-found');
      }
    });
  }

  protected onSortChange(sort: TuiTableSortChange<TopoRouteRow>): void {
    this.direction.set(sort.sortDirection);
    this.sorter.set(sort.sortComparator || (() => 0));
  }

  protected navigateToTopo(
    topo: TopoDetail | (TopoListItem & { crag_slug: string }),
  ): void {
    if (this.isIndoor()) {
      void this.router.navigate([
        '/indoor',
        this.centerSlug()!,
        'topo',
        topo.id,
      ]);
    } else {
      void this.router.navigate([
        '/area',
        this.areaSlug()!,
        this.cragSlug()!,
        'topo',
        topo.id,
      ]);
    }
  }
}
