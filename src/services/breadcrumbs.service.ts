import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { computed, Signal } from '@angular/core';

import {
  BreadcrumbItem,
  IndoorCenterDto,
  IndoorRouteWithExtras,
} from '../models';
import { TopoDataService } from './topo-data.service';

/**
 * Manages breadcrumb generation for navigation.
 * Extracted from GlobalData to reduce its responsibilities.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbsService {
  private readonly topoData = inject(TopoDataService);

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
      const topo = this.topoData.topoDetail();

      if (indoorCenter) {
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

      const area = this.topoData.selectedAreaSlug()
        ? this.findAreaBySlug(this.topoData.selectedAreaSlug()!)
        : null;
      const crag = this.topoData.selectedCragSlug()
        ? this.findCragBySlug(this.topoData.selectedCragSlug()!)
        : null;
      const route = this.topoData.routeDetail();

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
          }
          if (route) {
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

  // These are placeholder methods that should be implemented based on the actual data sources
  private findAreaBySlug(_slug: string): { name: string; slug: string } | null {
    // This should be connected to the actual areas list
    return null;
  }

  private findCragBySlug(_slug: string): { name: string; slug: string } | null {
    // This should be connected to the actual crags list
    return null;
  }
}
