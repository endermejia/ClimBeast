import { inject, Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import {
  AscentType,
  AscentTypes,
  ClimbingKind,
  ClimbingKinds,
  EightAnuAscent,
  EightAnuRoute,
  LABEL_TO_VERTICAL_LIFE,
} from '../models';

import { slugify } from '../utils';

import { EightAnuService } from './eight-anu.service';

import { SupabaseService } from './supabase.service';

import { ToastService } from './toast.service';

export interface Import8aPayload {
  area_name: string;
  area_slug: string;
  area_8a_slug: string;
  crag_name: string;
  crag_slug: string;
  crag_8a_slug: string;
  country_code: string;
  lat: number | null;
  lng: number | null;
  route_name: string;
  route_slug: string;
  route_8a_slug: string | null;
  eight_anu_route_slugs: string[];
  grade: number;
  climbing_kind: ClimbingKind;
  date: string;
  style: AscentType;
  attempts: number | null;
  tries?: number | null;
  rating: number | null;
  comment: string;
  recommended: boolean;
}

export interface ResolvedSlugData {
  slug: string;
  eightAnuSlugs: string[];
}

interface ExistingUserAscentKey {
  date: string | null;
  route:
    | {
        slug: string;
        name: string;
        eight_anu_route_slugs: string[] | null;
        crag: {
          slug: string;
          area: {
            slug: string;
          };
        };
      }
    | {
        slug: string;
        name: string;
        eight_anu_route_slugs: string[] | null;
        crag: {
          slug: string;
          area: {
            slug: string;
          };
        };
      }[];
}

@Injectable({
  providedIn: 'root',
})
export class RouteMatcherService {
  private readonly supabase = inject(SupabaseService);
  private readonly eightAnuService = inject(EightAnuService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  private existingAscentKeysCache: Set<string> | null = null;
  private existingAscentKeysCacheRange: { from: string; to: string } | null =
    null;

  async resolveExistingAreasAndCrags(ascents: EightAnuAscent[]): Promise<{
    existingAreaSlugs: Set<string>;
    existingCragKeys: Set<string>;
  }> {
    const existingAreaSlugs = new Set<string>();
    const existingCragKeys = new Set<string>();

    if (ascents.length === 0) {
      return { existingAreaSlugs, existingCragKeys };
    }

    const allAreaSlugsInCSV = [
      ...new Set(ascents.map((a) => slugify(a.location_name))),
    ];
    const allSectorSlugsInCSV = [
      ...new Set(ascents.map((a) => slugify(a.sector_name))),
    ];

    if (allAreaSlugsInCSV.length > 0) {
      const { data: existingAreas } = await this.supabase.client
        .from('areas')
        .select('slug, eight_anu_crag_slugs')
        .in('slug', allAreaSlugsInCSV);

      if (existingAreas) {
        for (const area of existingAreas) {
          existingAreaSlugs.add(area.slug);
          if (area.eight_anu_crag_slugs) {
            for (const s of area.eight_anu_crag_slugs) {
              existingAreaSlugs.add(s);
            }
          }
        }
      }
    }

    if (allSectorSlugsInCSV.length > 0) {
      const { data: existingCrags } = await this.supabase.client
        .from('crags')
        .select('slug, eight_anu_sector_slugs, area_id, areas!inner(slug)')
        .in('slug', allSectorSlugsInCSV);

      if (existingCrags) {
        for (const crag of existingCrags) {
          const areaSlug = Array.isArray(crag.areas)
            ? crag.areas[0]?.slug
            : crag.areas?.slug;
          if (areaSlug) {
            existingCragKeys.add(`${areaSlug}|${crag.slug}`);
            if (crag.eight_anu_sector_slugs) {
              for (const s of crag.eight_anu_sector_slugs) {
                existingCragKeys.add(`${areaSlug}|${s}`);
              }
            }
          }
        }
      }
    }

    return { existingAreaSlugs, existingCragKeys };
  }

  async resolveCsvAscentsWith8aData(
    ascents: EightAnuAscent[],
    progress$: BehaviorSubject<number>,
  ): Promise<Map<string, ResolvedSlugData>> {
    const resolvedSlugsMap = new Map<string, ResolvedSlugData>();

    if (ascents.length === 0) return resolvedSlugsMap;

    const loaderClose = this.toast.showLoader(
      'import8a.resolvingRoutes',
      progress$,
    );

    try {
      const uniqueItems = new Map<
        string,
        { area: string; crag: string; name: string }
      >();
      for (const a of ascents) {
        const key = `${slugify(a.location_name)}|${slugify(a.sector_name)}|${slugify(a.name)}`;
        if (!uniqueItems.has(key)) {
          uniqueItems.set(key, {
            area: a.location_name,
            crag: a.sector_name,
            name: a.name,
          });
        }
      }

      const itemsToResolve = Array.from(uniqueItems.values());
      const totalItems = itemsToResolve.length;
      let completedItems = 0;

      const BATCH_SIZE = 100;

      for (let i = 0; i < totalItems; i += BATCH_SIZE) {
        const batch = itemsToResolve.slice(i, i + BATCH_SIZE);
        const names = batch.map((b) => b.name);

        const { data: matchedRoutes, error } = await this.supabase.client
          .from('routes')
          .select(
            `
            name,
            slug,
            eight_anu_route_slugs,
            crag:crags!inner(
              name,
              slug,
              area:areas!inner(
                name,
                slug
              )
            )
          `,
          )
          .in('name', names)
          .overrideTypes<
            {
              name: string;
              slug: string;
              eight_anu_route_slugs: string[] | null;
              crag: {
                name: string;
                slug: string;
                area: {
                  name: string;
                  slug: string;
                };
              };
            }[]
          >();

        if (error) {
          console.error(
            '[8a Import] Error fetching routes for resolution:',
            error,
          );
        }

        if (matchedRoutes) {
          for (const r of matchedRoutes) {
            const matchingItems = batch.filter(
              (b) => slugify(b.name) === slugify(r.name),
            );

            for (const item of matchingItems) {
              const key = `${slugify(item.area)}|${slugify(item.crag)}|${slugify(item.name)}`;
              resolvedSlugsMap.set(key, {
                slug: r.slug,
                eightAnuSlugs: r.eight_anu_route_slugs || [],
              });
            }
          }
        }

        completedItems += batch.length;
        progress$.next(Math.floor((completedItems / totalItems) * 100));
      }

      const unresolvedItems = itemsToResolve.filter((item) => {
        const key = `${slugify(item.area)}|${slugify(item.crag)}|${slugify(item.name)}`;
        return !resolvedSlugsMap.has(key);
      });

      if (unresolvedItems.length > 0) {
        const csvSlugByKey = new Map<string, string>();
        for (const a of ascents) {
          if (a.route_8a_slug) {
            const key = `${slugify(a.location_name)}|${slugify(a.sector_name)}|${slugify(a.name)}`;
            csvSlugByKey.set(key, a.route_8a_slug);
          }
        }

        const slugByKey = new Map<string, string>();
        const itemsNeedingApi: typeof unresolvedItems = [];

        for (const item of unresolvedItems) {
          const key = `${slugify(item.area)}|${slugify(item.crag)}|${slugify(item.name)}`;
          const csvSlug = csvSlugByKey.get(key);
          if (csvSlug) {
            slugByKey.set(key, csvSlug);
          } else {
            itemsNeedingApi.push(item);
          }
        }

        const API_CONCURRENCY = 2;
        for (let i = 0; i < itemsNeedingApi.length; i += API_CONCURRENCY) {
          const apiBatch = itemsNeedingApi.slice(i, i + API_CONCURRENCY);
          await Promise.all(
            apiBatch.map(async (item) => {
              const key = `${slugify(item.area)}|${slugify(item.crag)}|${slugify(item.name)}`;
              try {
                const result = await this.eightAnuService.searchRoute(
                  item.area,
                  item.crag,
                  item.name,
                );
                if (result?.zlaggableSlug) {
                  slugByKey.set(key, result.zlaggableSlug);
                }
              } catch (e) {
                console.error(
                  `[8a Import] Error fetching 8a slug for route ${item.name}:`,
                  e,
                );
              }
            }),
          );
        }

        if (slugByKey.size > 0) {
          const allSlugs = [...new Set(slugByKey.values())];
          const SLUG_CHUNK_SIZE = 50;
          const routesBySlugs: {
            name: string;
            slug: string;
            eight_anu_route_slugs: string[] | null;
          }[] = [];

          for (let i = 0; i < allSlugs.length; i += SLUG_CHUNK_SIZE) {
            const slugChunk = allSlugs.slice(i, i + SLUG_CHUNK_SIZE);
            const { data } = await this.supabase.client
              .from('routes')
              .select('name, slug, eight_anu_route_slugs')
              .overlaps('eight_anu_route_slugs', slugChunk);
            if (data) routesBySlugs.push(...data);
          }

          for (const [key, slug8a] of slugByKey.entries()) {
            if (resolvedSlugsMap.has(key)) continue;
            const match = routesBySlugs.find((r) =>
              r.eight_anu_route_slugs?.includes(slug8a),
            );
            if (match) {
              resolvedSlugsMap.set(key, {
                slug: match.slug,
                eightAnuSlugs: match.eight_anu_route_slugs || [],
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('[8a Import] Error resolving data:', e);
      this.toast.error(this.translate.instant('import8a.errors.resolve'));
    } finally {
      loaderClose.next();
      loaderClose.complete();
    }

    return resolvedSlugsMap;
  }

  async fetch8aAreaAndCragData(
    ascents: EightAnuAscent[],
    progress$: BehaviorSubject<number>,
    resolvedSlugsMap: Map<string, ResolvedSlugData>,
  ): Promise<{
    payload: Import8aPayload[];
    totalUnits: number;
  }> {
    const areaToCoords = new Map<
      string,
      { latitude: number; longitude: number }
    >();
    const areaToSlug = new Map<string, string>();
    const sectorToCragSlug = new Map<string, string>();
    const sectorTo8aRoutes = new Map<
      string,
      { routes: EightAnuRoute[]; climbingKind: ClimbingKind }
    >();
    const areaRoutesCache = new Map<string, EightAnuRoute[]>();

    const uniqueAreas = [
      ...new Map(
        ascents.map((a) => [a.location_name, a.country_code]),
      ).entries(),
    ];

    const uniqueSectorsToFetch = [
      ...new Map(
        ascents.map((a) => [
          `${slugify(a.location_name)}|${slugify(a.sector_name)}`,
          {
            locationName: a.location_name,
            sectorName: a.sector_name,
            countryCode: a.country_code,
            climbingKind: a.climbing_kind!,
          },
        ]),
      ).values(),
    ];

    const knownAreaSlugs = new Set<string>();
    const knownSectorSlugs = new Set<string>();

    const allAreaSlugsInCSV = [
      ...new Set(ascents.map((a) => slugify(a.location_name))),
    ];
    const { data: existingAreas } = await this.supabase.client
      .from('areas')
      .select('slug, eight_anu_crag_slugs')
      .in('slug', allAreaSlugsInCSV);

    if (existingAreas) {
      for (const area of existingAreas) {
        if (area.eight_anu_crag_slugs && area.eight_anu_crag_slugs.length > 0) {
          const originalName = ascents.find(
            (a) => slugify(a.location_name) === area.slug,
          )?.location_name;
          if (originalName) {
            areaToSlug.set(originalName, area.eight_anu_crag_slugs[0]);
            knownAreaSlugs.add(area.slug);
          }
        }
      }
    }

    const allSectorSlugsInCSV = [
      ...new Set(ascents.map((a) => slugify(a.sector_name))),
    ];
    const { data: existingCrags } = await this.supabase.client
      .from('crags')
      .select('slug, eight_anu_sector_slugs, area_id, areas!inner(slug)')
      .in('slug', allSectorSlugsInCSV);

    if (existingCrags) {
      for (const crag of existingCrags) {
        if (
          crag.eight_anu_sector_slugs &&
          crag.eight_anu_sector_slugs.length > 0
        ) {
          const areaSlug = crag.areas.slug;
          sectorToCragSlug.set(
            `${areaSlug}|${crag.slug}`,
            crag.eight_anu_sector_slugs[0],
          );
          knownSectorSlugs.add(`${areaSlug}|${crag.slug}`);
        }
      }
    }

    const totalUnits = uniqueAreas.length + uniqueSectorsToFetch.length + 5;
    let completedUnits = 0;

    const incrementProgress = () => {
      completedUnits++;
      progress$.next(
        Math.min(100, Math.floor((completedUnits / totalUnits) * 100)),
      );
    };

    const AREA_CONCURRENCY = 2;
    for (let i = 0; i < uniqueAreas.length; i += AREA_CONCURRENCY) {
      const batch = uniqueAreas.slice(i, i + AREA_CONCURRENCY);
      await Promise.all(
        batch.map(async ([areaName]) => {
          const areaSlug = slugify(areaName);
          if (knownAreaSlugs.has(areaSlug)) {
            incrementProgress();
            return;
          }

          try {
            const searchResult = await this.eightAnuService.searchCrag(
              areaName,
              undefined,
            );
            if (searchResult) {
              if (searchResult.coordinates) {
                areaToCoords.set(areaName, searchResult.coordinates);
              }
              if (searchResult.cragSlug) {
                areaToSlug.set(areaName, searchResult.cragSlug);
              }
            }
          } catch (e) {
            console.error(`[8a Import] Error searching area ${areaName}:`, e);
            this.toast.error(
              `${this.translate.instant('import8a.errors.fetchAscents')}: ${areaName}`,
            );
          }
          incrementProgress();
        }),
      );
    }

    const SECTOR_CONCURRENCY = 1;
    for (let i = 0; i < uniqueSectorsToFetch.length; i += SECTOR_CONCURRENCY) {
      const batch = uniqueSectorsToFetch.slice(i, i + SECTOR_CONCURRENCY);
      await Promise.all(
        batch.map(async (s) => {
          try {
            const countrySlug = this.eightAnuService.getCountrySlug(
              s.countryCode,
            );
            const area8aSlug =
              areaToSlug.get(s.locationName) || slugify(s.locationName);
            const areaSlug = slugify(s.locationName);
            const sectorSlug = slugify(s.sectorName);

            const searchResult = await this.eightAnuService.searchRoute(
              s.locationName,
              s.sectorName,
              undefined,
            );

            if (searchResult) {
              const realSectorSlug = searchResult.sectorSlug;
              const realAreaSlug = searchResult.cragSlug || area8aSlug;

              sectorToCragSlug.set(`${areaSlug}|${sectorSlug}`, realSectorSlug);

              const category =
                s.climbingKind === ClimbingKinds.BOULDER
                  ? 'bouldering'
                  : 'sportclimbing';

              const cacheKey = `${category}|${countrySlug}|${realAreaSlug}`;
              let allRoutes = areaRoutesCache.get(cacheKey);

              if (!allRoutes) {
                allRoutes = await this.eightAnuService.getAllRoutes(
                  category,
                  countrySlug,
                  realAreaSlug,
                );
                areaRoutesCache.set(cacheKey, allRoutes);
              }

              const sectorRoutes = allRoutes.filter(
                (r) => r.sectorSlug === realSectorSlug,
              );

              if (sectorRoutes.length > 0) {
                sectorTo8aRoutes.set(`${areaSlug}|${sectorSlug}`, {
                  routes: sectorRoutes,
                  climbingKind: s.climbingKind,
                });
              }
            }
          } catch (e) {
            console.error(
              `[8a Import] Error processing sector ${s.sectorName}:`,
              e,
            );
            this.toast.error(
              `${this.translate.instant('import8a.errors.fetchAscents')}: ${s.sectorName}`,
            );
          }
          incrementProgress();
        }),
      );
    }

    const payload: Import8aPayload[] = ascents.map((a) => {
      const areaSlug = slugify(a.location_name);
      const area8aSlug = areaToSlug.get(a.location_name) || areaSlug;
      const cleanSectorName = a.sector_name?.trim() || 'General';
      const sectorSlug = slugify(cleanSectorName) || 'general';
      const crag8aSlug =
        sectorToCragSlug.get(`${areaSlug}|${sectorSlug}`) || sectorSlug;

      const coords = areaToCoords.get(a.location_name);

      const csvKey = `${areaSlug}|${sectorSlug}|${slugify(a.name)}`;
      const resolved = resolvedSlugsMap.get(csvKey);

      const route_8a_slug =
        a.route_8a_slug || resolved?.eightAnuSlugs?.[0] || null;
      const eight_anu_route_slugs =
        resolved?.eightAnuSlugs || (route_8a_slug ? [route_8a_slug] : []);
      const routeSlug = resolved?.slug || route_8a_slug || slugify(a.name);
      const grade = LABEL_TO_VERTICAL_LIFE[a.difficulty] ?? 0;

      let attempts = a.tries ?? null;
      if (attempts === null || attempts <= 0) {
        if (a.type === AscentTypes.OS || a.type === AscentTypes.F) {
          attempts = 1;
        } else {
          attempts = null;
        }
      }

      return {
        area_name: a.location_name,
        area_slug: areaSlug,
        area_8a_slug: area8aSlug,
        crag_name: cleanSectorName,
        crag_slug: sectorSlug,
        crag_8a_slug: crag8aSlug,
        country_code: a.country_code,
        lat: coords?.latitude ?? null,
        lng: coords?.longitude ?? null,
        route_name: a.name,
        route_slug: routeSlug,
        route_8a_slug,
        eight_anu_route_slugs,
        grade,
        climbing_kind: a.climbing_kind ?? ClimbingKinds.SPORT,
        date: a.date.split('T')[0],
        style: a.type,
        attempts,
        tries: attempts,
        rating: a.rating === 0 ? null : a.rating,
        comment: a.comment,
        recommended: a.recommended,
      };
    });

    return { payload, totalUnits };
  }

  async deduplicateCsvAscentsAgainstExisting(
    ascents: EightAnuAscent[],
    resolvedSlugsMap: Map<string, ResolvedSlugData>,
  ): Promise<{ ascents: EightAnuAscent[]; skipped: number }> {
    if (ascents.length === 0) {
      return { ascents, skipped: 0 };
    }

    const csvDateRange = this.getCsvDateRange(ascents);
    const existingKeys = await this.getOrLoadExistingAscentKeys(
      csvDateRange || undefined,
    );
    const seenInCsv = new Set<string>();
    const deduplicatedAscents: EightAnuAscent[] = [];
    let skipped = 0;

    for (const ascent of ascents) {
      const keysToCheck: (string | null)[] = [];
      const csvKey = `${slugify(ascent.location_name)}|${slugify(ascent.sector_name)}|${slugify(ascent.name)}`;
      const resolved = resolvedSlugsMap.get(csvKey);

      if (resolved?.slug) {
        keysToCheck.push(this.buildAscentDedupKey(ascent.date, resolved.slug));
      }

      keysToCheck.push(this.buildAscentDedupKey(ascent.date, ascent.name));

      const eightAnuSlug = ascent.route_8a_slug || resolved?.eightAnuSlugs?.[0];
      if (eightAnuSlug) {
        keysToCheck.push(
          this.buildAscentDedupKey(ascent.date, eightAnuSlug, true),
        );
      }

      const isDuplicate = keysToCheck.some(
        (k) => k && (existingKeys.has(k) || seenInCsv.has(k)),
      );

      if (isDuplicate) {
        skipped++;
        continue;
      }

      for (const k of keysToCheck) {
        if (k) seenInCsv.add(k);
      }
      deduplicatedAscents.push(ascent);
    }

    return { ascents: deduplicatedAscents, skipped };
  }

  deduplicatePayloadAgainstExistingAscents(
    payload: Import8aPayload[],
    existingKeys: Set<string>,
  ): { payload: Import8aPayload[]; skipped: number } {
    if (payload.length === 0) {
      return { payload, skipped: 0 };
    }

    const seenInImport = new Set<string>();
    const deduplicatedPayload: Import8aPayload[] = [];
    let skipped = 0;

    for (const ascent of payload) {
      const keysToCheck: (string | null)[] = [];

      keysToCheck.push(
        this.buildAscentDedupKey(ascent.date, ascent.route_slug),
      );

      if (ascent.route_8a_slug) {
        keysToCheck.push(
          this.buildAscentDedupKey(ascent.date, ascent.route_8a_slug, true),
        );
      }

      const isDuplicate = keysToCheck.some(
        (k) => k && (existingKeys.has(k) || seenInImport.has(k)),
      );

      if (isDuplicate) {
        skipped++;
        continue;
      }

      for (const k of keysToCheck) {
        if (k) seenInImport.add(k);
      }
      deduplicatedPayload.push(ascent);
    }

    return { payload: deduplicatedPayload, skipped };
  }

  async getOrLoadExistingAscentKeys(range?: {
    from: string;
    to: string;
  }): Promise<Set<string>> {
    if (
      this.existingAscentKeysCache &&
      (!range ||
        (this.existingAscentKeysCacheRange !== null &&
          this.existingAscentKeysCacheRange.from <= range.from &&
          this.existingAscentKeysCacheRange.to >= range.to))
    ) {
      return this.existingAscentKeysCache;
    }

    const userId = this.supabase.authUserId();
    if (!userId) {
      this.existingAscentKeysCache = new Set<string>();
      this.existingAscentKeysCacheRange = range || null;
      return this.existingAscentKeysCache;
    }

    let query = this.supabase.client
      .from('route_ascents')
      .select(
        `
          date,
          route:routes!inner(
            slug,
            name,
            eight_anu_route_slugs
          )
        `,
      )
      .eq('user_id', userId)
      .not('date', 'is', null);

    if (range) {
      query = query.gte('date', range.from).lte('date', range.to);
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        '[8a Import] Error loading existing ascents for deduplication:',
        error,
      );
      this.existingAscentKeysCache = new Set<string>();
      this.existingAscentKeysCacheRange = range || null;
      return this.existingAscentKeysCache;
    }

    const existingKeys = new Set<string>();
    for (const ascent of (data ?? []) as ExistingUserAscentKey[]) {
      const routeDataRaw = Array.isArray(ascent.route)
        ? ascent.route[0]
        : ascent.route;
      const routeData =
        routeDataRaw && typeof routeDataRaw === 'object'
          ? (routeDataRaw as {
              slug?: string | null;
              name?: string | null;
              eight_anu_route_slugs?: string[] | null;
            })
          : null;

      const routeIdentifier = routeData?.slug || routeData?.name || '';
      const key = this.buildAscentDedupKey(ascent.date, routeIdentifier);
      if (key) {
        existingKeys.add(key);
      }

      if (routeData?.name) {
        const nameKey = this.buildAscentDedupKey(ascent.date, routeData.name);
        if (nameKey) {
          existingKeys.add(nameKey);
        }
      }

      if (ascent.date && routeData?.eight_anu_route_slugs) {
        for (const slug of routeData.eight_anu_route_slugs) {
          const slugKey = this.buildAscentDedupKey(ascent.date, slug, true);
          if (slugKey) {
            existingKeys.add(slugKey);
          }
        }
      }
    }

    this.existingAscentKeysCache = existingKeys;
    this.existingAscentKeysCacheRange = range || null;
    return existingKeys;
  }

  resetCache(): void {
    this.existingAscentKeysCache = null;
    this.existingAscentKeysCacheRange = null;
  }

  private buildAscentDedupKey(
    date: string | null | undefined,
    slug: string | null | undefined,
    is8aSlug = false,
  ): string | null {
    const normalizedDate = (date ?? '').split('T')[0].trim();
    if (!normalizedDate || !slug) return null;
    const identifier = is8aSlug ? `8a:${slug}` : slugify(slug);
    return `${normalizedDate}|${identifier}`;
  }

  private getCsvDateRange(
    ascents: EightAnuAscent[],
  ): { from: string; to: string } | null {
    const normalizedDates = ascents
      .map((a) => (a.date || '').split('T')[0].trim())
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();

    if (normalizedDates.length === 0) {
      return null;
    }

    return {
      from: normalizedDates[0],
      to: normalizedDates[normalizedDates.length - 1],
    };
  }
}
