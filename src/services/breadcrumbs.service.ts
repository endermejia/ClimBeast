import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { computed, Signal } from '@angular/core';

import {
  BreadcrumbItem,
  IndoorCenterDto,
  IndoorRouteWithExtras,
} from '../models';

import { IndoorDataService } from './indoor-data.service';
import { OutdoorDataService } from './outdoor-data.service';

/**
 * Manages breadcrumb generation for navigation.
 * Extracted from GlobalData to reduce its responsibilities.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbsService {
  private readonly outdoorData = inject(OutdoorDataService);
  private readonly indoorData = inject(IndoorDataService);

  readonly i18nTick: WritableSignal<number> = signal(0);

  // These should be set by the consuming component or GlobalData facade
  selectedIndoorCenter: WritableSignal<IndoorCenterDto | null> = signal(null);
  selectedIndoorRoute: WritableSignal<IndoorRouteWithExtras | null> =
    signal(null);

  readonly breadcrumbs: Signal<BreadcrumbItem[]> = computed<BreadcrumbItem[]>(
    () => {
      this.i18nTick();
      const indoorCenter = this.selectedIndoorCenter();
      const indoorRoute = this.selectedIndoorRoute();

      if (indoorCenter) {
        const topo = this.indoorData.topoDetail();
        const items: BreadcrumbItem[] = [
          { caption: 'indoor.title', routerLink: ['/indoor'] },
          {
            caption: indoorCenter.name,
            routerLink: ['/indoor', indoorCenter.slug],
          },
        ];
        if (topo && topo.center_id === indoorCenter.id) {
          items.push({
            caption: topo.name,
            routerLink: ['/indoor', indoorCenter.slug, 'topo', topo.id],
          });
        }
        if (indoorRoute) {
          items.push({
            caption: indoorRoute.name,
            routerLink: [
              '/indoor',
              indoorCenter.slug,
              'route',
              indoorRoute.slug,
            ],
          });
        }
        return items;
      }

      const items: BreadcrumbItem[] = [
        { caption: 'areas', routerLink: ['/area'] },
      ];

      const areaSlug = this.outdoorData.selectedAreaSlug();
      const area = areaSlug ? this.findAreaBySlug(areaSlug) : null;
      const cragSlug = this.outdoorData.selectedCragSlug();
      const crag = cragSlug ? this.findCragBySlug(cragSlug) : null;
      const topo = this.outdoorData.topoDetail();
      const routeDetail = this.outdoorData.routeDetail();
      const selectedRouteSlug = this.outdoorData.selectedRouteSlug();
      const route = routeDetail
        ? { name: routeDetail.name, slug: routeDetail.slug }
        : selectedRouteSlug
          ? { name: selectedRouteSlug, slug: selectedRouteSlug }
          : null;

      if (area) {
        items.push({
          caption: area.name,
          routerLink: ['/area', area.slug],
        });
        if (crag) {
          items.push({
            caption: crag.name,
            routerLink: ['/area', area.slug, crag.slug],
          });
          if (topo) {
            items.push({
              caption: topo.name,
              routerLink: ['/area', area.slug, crag.slug, 'topo', topo.id],
            });
          } else if (route) {
            items.push({
              caption: route.name,
              routerLink: ['/area', area.slug, crag.slug, route.slug],
            });
          }
        }
      }

      return items.filter((i) => !!i.caption);
    },
  );

  readonly slicedBreadcrumbs: Signal<BreadcrumbItem[]> = computed(() =>
    this.breadcrumbs().slice(0, -1),
  );

  private findAreaBySlug(slug: string): { name: string; slug: string } | null {
    if (!slug) return null;

    const cragDetail = this.outdoorData.cragDetail();
    if (cragDetail?.area_slug === slug && cragDetail?.area_name) {
      return { name: cragDetail.area_name, slug: cragDetail.area_slug };
    }

    const routeDetail = this.outdoorData.routeDetail();
    if (routeDetail?.area_slug === slug && routeDetail?.area_name) {
      return { name: routeDetail.area_name, slug: routeDetail.area_slug };
    }

    const topoDetail = this.outdoorData.topoDetail();
    if (topoDetail?.crag?.area?.slug === slug) {
      return {
        name: topoDetail.crag.area.name,
        slug: topoDetail.crag.area.slug,
      };
    }

    const areaFromList = this.outdoorData
      .areasList()
      .find((a) => a.slug === slug);
    if (areaFromList) {
      return { name: areaFromList.name, slug: areaFromList.slug };
    }

    return { name: slug, slug };
  }

  private findCragBySlug(slug: string): { name: string; slug: string } | null {
    if (!slug) return null;

    const cragDetail = this.outdoorData.cragDetail();
    if (cragDetail?.slug === slug) {
      return { name: cragDetail.name, slug: cragDetail.slug };
    }

    const routeDetail = this.outdoorData.routeDetail();
    if (routeDetail?.crag_slug === slug && routeDetail?.crag_name) {
      return { name: routeDetail.crag_name, slug: routeDetail.crag_slug };
    }

    const topoDetail = this.outdoorData.topoDetail();
    if (topoDetail?.crag?.slug === slug) {
      return { name: topoDetail.crag.name, slug: topoDetail.crag.slug };
    }

    const cragFromList = this.outdoorData
      .cragsList()
      .find((c) => c.slug === slug);
    if (cragFromList) {
      return { name: cragFromList.name, slug: cragFromList.slug };
    }

    return { name: slug, slug };
  }
}
