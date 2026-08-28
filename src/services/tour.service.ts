import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

import { SupabaseService } from './supabase.service';
import { UserProfilesService } from './user-profiles.service';

export enum TourStep {
  WELCOME = 0,
  HOME = 1,
  EXPLORE = 2,
  EXPLORE_AREAS = 3,
  AREAS = 4,
  SEARCH = 5,
  CRAG = 6,
  CRAG_TOPOS = 7,
  CRAG_PARKINGS = 8,
  CRAG_WEATHER = 9,
  ROUTE = 10,
  PROFILE = 11,
  PROFILE_PROJECTS = 12,
  PROFILE_STATISTICS = 13,
  PROFILE_LIKES = 14,
  OFF = -1,
}

interface TourAreaRef {
  slug: string;
  name?: string;
}

interface TourRouteNavigationData {
  slug: string;
  crag:
    | {
        slug: string;
        area: TourAreaRef | TourAreaRef[];
      }
    | {
        slug: string;
        area: TourAreaRef | TourAreaRef[];
      }[];
}

@Injectable({
  providedIn: 'root',
})
export class TourService {
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  private readonly userProfilesService = inject(UserProfilesService);

  readonly step = signal<TourStep>(TourStep.OFF);
  readonly isActive = signal<boolean>(false);

  async start(): Promise<void> {
    this.isActive.set(true);
    await this.goToStep(TourStep.WELCOME);
  }

  async next(): Promise<void> {
    if (!this.isActive()) return;
    const current = this.step();
    if (current === TourStep.PROFILE || current === TourStep.PROFILE_LIKES) {
      await this.finish();
      return;
    }
    await this.goToStep(current + 1);
  }

  async stop(): Promise<void> {
    this.isActive.set(false);
    this.step.set(TourStep.OFF);
  }

  async finish(): Promise<void> {
    try {
      await this.userProfilesService.updateUserProfile({ first_steps: false });
    } finally {
      await this.stop();
    }
  }

  private async goToStep(step: TourStep): Promise<void> {
    // Navigate first
    switch (step) {
      case TourStep.WELCOME:
        await this.router.navigate(['/profile/config']);
        break;
      case TourStep.HOME:
        await this.router.navigate(['/home']);
        break;
      case TourStep.EXPLORE:
      case TourStep.EXPLORE_AREAS:
        await this.router.navigate(['/explore']);
        break;
      case TourStep.AREAS:
        await this.router.navigate(['/area']);
        break;
      case TourStep.SEARCH:
        // Already shown in navbar
        break;
      case TourStep.CRAG:
      case TourStep.CRAG_TOPOS:
      case TourStep.CRAG_PARKINGS:
      case TourStep.CRAG_WEATHER:
        await this.navigateToCrag('Millena');
        break;
      case TourStep.ROUTE:
        await this.navigateToAnyRoute();
        break;
      case TourStep.PROFILE:
      case TourStep.PROFILE_PROJECTS:
      case TourStep.PROFILE_STATISTICS:
      case TourStep.PROFILE_LIKES:
        await this.router.navigate(['/profile']);
        break;
    }

    this.step.set(step);
  }

  private async navigateToCrag(name: string): Promise<void> {
    const client = await this.supabase.getClient();

    // 1. Try finding a crag by crag name
    let { data } = await client
      .from('crags')
      .select('slug, area:areas!inner(slug, name)')
      .ilike('name', `%${name}%`)
      .limit(1)
      .maybeSingle();

    // 2. If not found by crag name, try finding a crag by area name
    if (!data) {
      const { data: byArea } = await client
        .from('crags')
        .select('slug, area:areas!inner(slug, name)')
        .ilike('area.name', `%${name}%`)
        .limit(1)
        .maybeSingle();
      data = byArea;
    }

    // 3. Fallback to any crag
    if (!data) {
      const { data: anyCrag } = await client
        .from('crags')
        .select('slug, area:areas!inner(slug, name)')
        .limit(1)
        .maybeSingle();
      data = anyCrag;
    }

    if (data && data.area) {
      const area = Array.isArray(data.area) ? data.area[0] : data.area;
      await this.router.navigate(['/area', area.slug, data.slug]);
    } else {
      await this.router.navigate(['/explore']);
    }
  }

  private async navigateToAnyRoute(): Promise<void> {
    const client = await this.supabase.getClient();

    // 1. Query route_ascents for Millena routes specifically
    const { data: ascentsData } = await client
      .from('route_ascents')
      .select(
        'route_id, route:routes!inner(slug, crag:crags!inner(slug, area:areas!inner(slug, name)))',
      )
      .limit(200);

    if (ascentsData && ascentsData.length > 0) {
      const counts = new Map<
        number,
        { count: number; route: TourRouteNavigationData }
      >();
      for (const item of ascentsData) {
        if (item.route_id && item.route) {
          const routeData = item.route as unknown as TourRouteNavigationData;
          const crag = Array.isArray(routeData.crag)
            ? routeData.crag[0]
            : routeData.crag;
          const areaObj = crag?.area;
          const area: TourAreaRef | undefined = Array.isArray(areaObj)
            ? areaObj[0]
            : areaObj;
          const areaName = (area?.name || '').toLowerCase();
          const areaSlug = (area?.slug || '').toLowerCase();

          if (areaName.includes('millena') || areaSlug.includes('millena')) {
            const existing = counts.get(item.route_id);
            if (existing) {
              existing.count += 1;
            } else {
              counts.set(item.route_id, { count: 1, route: routeData });
            }
          }
        }
      }

      let maxItem: { count: number; route: TourRouteNavigationData } | null =
        null;
      for (const entry of counts.values()) {
        if (!maxItem || entry.count > maxItem.count) {
          maxItem = entry;
        }
      }

      if (maxItem && maxItem.route) {
        const route = maxItem.route;
        const crag = Array.isArray(route.crag) ? route.crag[0] : route.crag;
        if (crag && crag.area) {
          const area = Array.isArray(crag.area) ? crag.area[0] : crag.area;
          await this.router.navigate([
            '/area',
            area.slug,
            crag.slug,
            route.slug,
          ]);
          return;
        }
      }
    }

    // 2. Fallback to any route in Millena if no ascents found in Millena
    const { data: millenaRoute } = await client
      .from('routes')
      .select('slug, crag:crags!inner(slug, area:areas!inner(slug, name))')
      .ilike('crag.area.name', '%Millena%')
      .limit(1)
      .maybeSingle();

    if (millenaRoute && millenaRoute.crag) {
      const crag = Array.isArray(millenaRoute.crag)
        ? millenaRoute.crag[0]
        : millenaRoute.crag;
      if (crag && crag.area) {
        const area = Array.isArray(crag.area) ? crag.area[0] : crag.area;
        await this.router.navigate([
          '/area',
          area.slug,
          crag.slug,
          millenaRoute.slug,
        ]);
        return;
      }
    }

    // 3. Fallback to any route in database
    const { data } = await client
      .from('routes')
      .select('slug, crag:crags!inner(slug, area:areas!inner(slug))')
      .limit(1)
      .maybeSingle();

    if (data && data.crag) {
      const crag = Array.isArray(data.crag) ? data.crag[0] : data.crag;
      if (crag && crag.area) {
        const area = Array.isArray(crag.area) ? crag.area[0] : crag.area;
        await this.router.navigate(['/area', area.slug, crag.slug, data.slug]);
        return;
      }
    }
    await this.router.navigate(['/explore']);
  }
}
