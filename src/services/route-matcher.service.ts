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

import {
  collectCsvMatchInputs,
  DbAreaRecord,
  DbCragRecord,
  matchExistingAreas,
  matchExistingCrags,
  normalizeName,
  sectorSlug,
  slugify,
} from '../utils';

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

interface MatchedRouteRow {
  name: string;
  slug: string;
  eight_anu_route_slugs: string[] | null;
  crag: {
    name: string;
    slug: string;
    eight_anu_sector_slugs: string[] | null;
    area: {
      name: string;
      slug: string;
      eight_anu_crag_slugs: string[] | null;
    };
  };
}

interface ExistingUserAscentRoute {
  slug: string;
  name: string;
  eight_anu_route_slugs: string[] | null;
  crag?:
    | {
        slug: string;
        eight_anu_sector_slugs?: string[] | null;
        area?:
          | {
              slug: string;
              eight_anu_crag_slugs?: string[] | null;
            }
          | {
              slug: string;
              eight_anu_crag_slugs?: string[] | null;
            }[];
      }
    | {
        slug: string;
        eight_anu_sector_slugs?: string[] | null;
        area?:
          | {
              slug: string;
              eight_anu_crag_slugs?: string[] | null;
            }
          | {
              slug: string;
              eight_anu_crag_slugs?: string[] | null;
            }[];
      }[];
}

interface ExistingUserAscentKey {
  date: string | null;
  route: ExistingUserAscentRoute | ExistingUserAscentRoute[];
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

    const { csvAreas, csvCrags } = collectCsvMatchInputs(ascents);

    const dbAreas = await this.fetchAllAreas();
    const { dbAreaIdBySlug, existingAreaSlugs: matchedAreaSlugs } =
      matchExistingAreas(csvAreas, dbAreas);

    for (const slug of matchedAreaSlugs) {
      existingAreaSlugs.add(slug);
    }

    const areaIds = [...new Set(dbAreaIdBySlug.values())];
    if (areaIds.length === 0) {
      return { existingAreaSlugs, existingCragKeys };
    }

    const dbCrags = await this.fetchCragsByAreaIds(areaIds);
    for (const key of matchExistingCrags(csvCrags, dbAreaIdBySlug, dbCrags)) {
      existingCragKeys.add(key);
    }

    return { existingAreaSlugs, existingCragKeys };
  }

  private async fetchAllAreas(): Promise<DbAreaRecord[]> {
    const rows: DbAreaRecord[] = [];
    const PAGE = 1000;

    for (let from = 0; ; from += PAGE) {
      const { data, error } = await this.supabase.client
        .from('areas')
        .select('id, slug, name, eight_anu_crag_slugs')
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1);

      if (error) {
        console.error('[8a Import] Error fetching areas:', error);
        break;
      }

      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
    }

    return rows;
  }

  private async fetchCragsByAreaIds(
    areaIds: number[],
  ): Promise<DbCragRecord[]> {
    const rows: DbCragRecord[] = [];
    const PAGE = 1000;

    for (let from = 0; ; from += PAGE) {
      const { data, error } = await this.supabase.client
        .from('crags')
        .select('id, area_id, slug, name, eight_anu_sector_slugs')
        .in('area_id', areaIds)
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1);

      if (error) {
        console.error('[8a Import] Error fetching crags:', error);
        break;
      }

      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
    }

    return rows;
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
        const key = `${slugify(a.location_name)}|${sectorSlug(a.sector_name)}|${slugify(a.name)}`;
        if (!uniqueItems.has(key)) {
          uniqueItems.set(key, {
            area: a.location_name,
            crag: a.sector_name,
            name: a.name,
          });
        }
      }

      const csvSlugByKey = new Map<string, string>();
      for (const a of ascents) {
        if (a.route_8a_slug) {
          const key = `${slugify(a.location_name)}|${sectorSlug(a.sector_name)}|${slugify(a.name)}`;
          csvSlugByKey.set(key, a.route_8a_slug);
        }
      }

      const routeSelect = `
            name,
            slug,
            eight_anu_route_slugs,
            crag:crags!inner(
              name,
              slug,
              eight_anu_sector_slugs,
              area:areas!inner(
                name,
                slug,
                eight_anu_crag_slugs
              )
            )
          `;

      const itemsToResolve = Array.from(uniqueItems.values());
      const totalItems = itemsToResolve.length;
      let completedItems = 0;

      const BATCH_SIZE = 100;

      for (let i = 0; i < totalItems; i += BATCH_SIZE) {
        const batch = itemsToResolve.slice(i, i + BATCH_SIZE);
        const names = [...new Set(batch.map((b) => b.name))];
        const candidateSlugs = [
          ...new Set(
            batch
              .flatMap((b) => {
                const key = `${slugify(b.area)}|${sectorSlug(b.crag)}|${slugify(b.name)}`;
                const csvSlug = csvSlugByKey.get(key);
                return csvSlug ? [slugify(b.name), csvSlug] : [slugify(b.name)];
              })
              .filter(Boolean),
          ),
        ];

        const [byNameRes, bySlugRes, byEightAnuRes] = await Promise.all([
          this.supabase.client
            .from('routes')
            .select(routeSelect)
            .in('name', names)
            .overrideTypes<MatchedRouteRow[]>(),
          candidateSlugs.length > 0
            ? this.supabase.client
                .from('routes')
                .select(routeSelect)
                .in('slug', candidateSlugs)
                .overrideTypes<MatchedRouteRow[]>()
            : Promise.resolve({ data: [] as MatchedRouteRow[], error: null }),
          candidateSlugs.length > 0
            ? this.supabase.client
                .from('routes')
                .select(routeSelect)
                .overlaps('eight_anu_route_slugs', candidateSlugs)
                .overrideTypes<MatchedRouteRow[]>()
            : Promise.resolve({ data: [] as MatchedRouteRow[], error: null }),
        ]);

        if (byNameRes.error || bySlugRes.error || byEightAnuRes.error) {
          console.error(
            '[8a Import] Error fetching routes for resolution:',
            byNameRes.error || bySlugRes.error || byEightAnuRes.error,
          );
        }

        const matchedRoutes: MatchedRouteRow[] = [];
        const seenRouteKeys = new Set<string>();
        for (const r of [
          ...(byEightAnuRes.data ?? []),
          ...(bySlugRes.data ?? []),
          ...(byNameRes.data ?? []),
        ]) {
          const rk = `${r.crag.area.slug}|${r.crag.slug}|${r.slug}`;
          if (!seenRouteKeys.has(rk)) {
            seenRouteKeys.add(rk);
            matchedRoutes.push(r);
          }
        }

        for (const r of matchedRoutes) {
          const matchingItems = batch.filter((b) => {
            const itemNameSlug = slugify(b.name);
            const itemKey = `${slugify(b.area)}|${sectorSlug(b.crag)}|${itemNameSlug}`;
            const csvSlug = csvSlugByKey.get(itemKey);

            const routeMatches =
              itemNameSlug === slugify(r.name) ||
              normalizeName(b.name) === normalizeName(r.name) ||
              r.slug === itemNameSlug ||
              (r.eight_anu_route_slugs?.includes(itemNameSlug) ?? false) ||
              (!!csvSlug &&
                (r.slug === csvSlug ||
                  (r.eight_anu_route_slugs?.includes(csvSlug) ?? false)));
            if (!routeMatches) return false;

            const areaSlug = slugify(b.area);
            const areaNorm = normalizeName(b.area);
            const areaMatches =
              areaSlug === r.crag.area.slug ||
              areaNorm === normalizeName(r.crag.area.name) ||
              (r.crag.area.eight_anu_crag_slugs?.includes(areaSlug) ?? false);

            const cragSlug = sectorSlug(b.crag);
            const cragNorm = normalizeName(b.crag);
            const cragMatches =
              cragSlug === r.crag.slug ||
              cragNorm === normalizeName(r.crag.name) ||
              (r.crag.eight_anu_sector_slugs?.includes(cragSlug) ?? false);

            return areaMatches && cragMatches;
          });

          for (const item of matchingItems) {
            const key = `${slugify(item.area)}|${sectorSlug(item.crag)}|${slugify(item.name)}`;
            if (!resolvedSlugsMap.has(key)) {
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
        const key = `${slugify(item.area)}|${sectorSlug(item.crag)}|${slugify(item.name)}`;
        return !resolvedSlugsMap.has(key);
      });

      if (unresolvedItems.length > 0) {
        const slugByKey = new Map<string, string>();
        const itemsNeedingApi: typeof unresolvedItems = [];

        for (const item of unresolvedItems) {
          const key = `${slugify(item.area)}|${sectorSlug(item.crag)}|${slugify(item.name)}`;
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
              const key = `${slugify(item.area)}|${sectorSlug(item.crag)}|${slugify(item.name)}`;
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
          const routesBySlugs: MatchedRouteRow[] = [];

          for (let i = 0; i < allSlugs.length; i += SLUG_CHUNK_SIZE) {
            const slugChunk = allSlugs.slice(i, i + SLUG_CHUNK_SIZE);
            const [byEightAnu, bySlug] = await Promise.all([
              this.supabase.client
                .from('routes')
                .select(routeSelect)
                .overlaps('eight_anu_route_slugs', slugChunk)
                .overrideTypes<MatchedRouteRow[]>(),
              this.supabase.client
                .from('routes')
                .select(routeSelect)
                .in('slug', slugChunk)
                .overrideTypes<MatchedRouteRow[]>(),
            ]);
            if (byEightAnu.data) routesBySlugs.push(...byEightAnu.data);
            if (bySlug.data) routesBySlugs.push(...bySlug.data);
          }

          const unresolvedByKey = new Map<
            string,
            { area: string; crag: string; name: string }
          >();
          for (const item of unresolvedItems) {
            const itemKey = `${slugify(item.area)}|${sectorSlug(item.crag)}|${slugify(item.name)}`;
            unresolvedByKey.set(itemKey, item);
          }

          for (const [key, slug8a] of slugByKey.entries()) {
            if (resolvedSlugsMap.has(key)) continue;
            const item = unresolvedByKey.get(key);
            if (!item) continue;

            const areaSlug = slugify(item.area);
            const areaNorm = normalizeName(item.area);
            const cragSlug = sectorSlug(item.crag);
            const cragNorm = normalizeName(item.crag);

            const match = routesBySlugs.find((r) => {
              if (
                r.slug !== slug8a &&
                !(r.eight_anu_route_slugs?.includes(slug8a) ?? false)
              ) {
                return false;
              }

              const areaMatches =
                areaSlug === r.crag.area.slug ||
                areaNorm === normalizeName(r.crag.area.name) ||
                (r.crag.area.eight_anu_crag_slugs?.includes(areaSlug) ?? false);

              const cragMatches =
                cragSlug === r.crag.slug ||
                cragNorm === normalizeName(r.crag.name) ||
                (r.crag.eight_anu_sector_slugs?.includes(cragSlug) ?? false);

              return areaMatches && cragMatches;
            });

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
          `${slugify(a.location_name)}|${sectorSlug(a.sector_name)}`,
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
      ...new Set(ascents.map((a) => sectorSlug(a.sector_name))),
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
            const cragSlug = sectorSlug(s.sectorName);

            const searchResult = await this.eightAnuService.searchRoute(
              s.locationName,
              s.sectorName,
              undefined,
            );

            if (searchResult) {
              const realSectorSlug = searchResult.sectorSlug;
              const realAreaSlug = searchResult.cragSlug || area8aSlug;

              sectorToCragSlug.set(`${areaSlug}|${cragSlug}`, realSectorSlug);

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
                sectorTo8aRoutes.set(`${areaSlug}|${cragSlug}`, {
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
      const cragSlug = sectorSlug(cleanSectorName);
      const crag8aSlug =
        sectorToCragSlug.get(`${areaSlug}|${cragSlug}`) || cragSlug;

      const coords = areaToCoords.get(a.location_name);

      const csvKey = `${areaSlug}|${cragSlug}|${slugify(a.name)}`;
      const resolved = resolvedSlugsMap.get(csvKey);

      const route_8a_slug =
        a.route_8a_slug || resolved?.eightAnuSlugs?.[0] || null;
      const eight_anu_route_slugs = [
        ...new Set(
          [
            ...(resolved?.eightAnuSlugs ?? []),
            ...(route_8a_slug ? [route_8a_slug] : []),
            slugify(a.name),
          ].filter(Boolean),
        ),
      ];
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
        crag_slug: cragSlug,
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
        date: this.normalizeDate(a.date),
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
    const hasUnscopedExisting = this.hasUnscopedKeys(existingKeys);
    let skipped = 0;

    for (const ascent of ascents) {
      const areaSlug = slugify(ascent.location_name);
      const cragSlug = sectorSlug(ascent.sector_name);
      const scope = `${areaSlug}|${cragSlug}`;
      const csvKey = `${scope}|${slugify(ascent.name)}`;
      const resolved = resolvedSlugsMap.get(csvKey);

      const scopedKeys: string[] = [];
      const unscopedKeys: string[] = [];
      const addKey = (slug: string | null | undefined, is8aSlug = false) => {
        const scopedKey = this.buildScopedAscentDedupKey(
          ascent.date,
          scope,
          slug,
          is8aSlug,
        );
        if (scopedKey) scopedKeys.push(scopedKey);
        if (hasUnscopedExisting) {
          const unscopedKey = this.buildAscentDedupKey(
            ascent.date,
            slug,
            is8aSlug,
          );
          if (unscopedKey) unscopedKeys.push(unscopedKey);
        }
      };

      if (resolved?.slug) {
        addKey(resolved.slug);
      }

      addKey(ascent.name);
      addKey(slugify(ascent.name), true);

      if (ascent.route_8a_slug) {
        addKey(ascent.route_8a_slug, true);
      }

      if (resolved?.eightAnuSlugs) {
        for (const slug8a of resolved.eightAnuSlugs) {
          addKey(slug8a, true);
        }
      }

      const isDuplicate =
        scopedKeys.some((k) => existingKeys.has(k) || seenInCsv.has(k)) ||
        unscopedKeys.some((k) => existingKeys.has(k));

      if (isDuplicate) {
        skipped++;
        continue;
      }

      for (const k of scopedKeys) {
        seenInCsv.add(k);
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
    const hasUnscopedExisting = this.hasUnscopedKeys(existingKeys);
    let skipped = 0;

    for (const ascent of payload) {
      const areaSlugs = [
        ...new Set([ascent.area_slug, ascent.area_8a_slug].filter(Boolean)),
      ];
      const cragSlugs = [
        ...new Set([ascent.crag_slug, ascent.crag_8a_slug].filter(Boolean)),
      ];
      const scopes = areaSlugs.flatMap((aSlug) =>
        cragSlugs.map((cSlug) => `${aSlug}|${cSlug}`),
      );

      const scopedKeys: string[] = [];
      const unscopedKeys: string[] = [];
      const addKey = (slug: string | null | undefined, is8aSlug = false) => {
        for (const scope of scopes) {
          const scopedKey = this.buildScopedAscentDedupKey(
            ascent.date,
            scope,
            slug,
            is8aSlug,
          );
          if (scopedKey) scopedKeys.push(scopedKey);
        }
        if (hasUnscopedExisting) {
          const unscopedKey = this.buildAscentDedupKey(
            ascent.date,
            slug,
            is8aSlug,
          );
          if (unscopedKey) unscopedKeys.push(unscopedKey);
        }
      };

      addKey(ascent.route_slug);
      addKey(slugify(ascent.route_name), true);

      if (ascent.route_8a_slug) {
        addKey(ascent.route_8a_slug, true);
      }

      for (const slug8a of ascent.eight_anu_route_slugs) {
        addKey(slug8a, true);
      }

      const isDuplicate =
        scopedKeys.some((k) => existingKeys.has(k) || seenInImport.has(k)) ||
        unscopedKeys.some((k) => existingKeys.has(k));

      if (isDuplicate) {
        skipped++;
        continue;
      }

      for (const k of scopedKeys) {
        seenInImport.add(k);
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

    const existingAscents: ExistingUserAscentKey[] = [];
    const PAGE = 1000;

    for (let from = 0; ; from += PAGE) {
      let query = this.supabase.client
        .from('route_ascents')
        .select(
          `
            date,
            route:routes!inner(
              slug,
              name,
              eight_anu_route_slugs,
              crag:crags!inner(
                slug,
                eight_anu_sector_slugs,
                area:areas!inner(
                  slug,
                  eight_anu_crag_slugs
                )
              )
            )
          `,
        )
        .eq('user_id', userId)
        .not('date', 'is', null)
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1);

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

      const pageRows = (data ?? []) as ExistingUserAscentKey[];
      existingAscents.push(...pageRows);
      if (pageRows.length < PAGE) break;
    }

    const existingKeys = new Set<string>();
    for (const ascent of existingAscents) {
      const routeDataRaw = Array.isArray(ascent.route)
        ? ascent.route[0]
        : ascent.route;
      const routeData =
        routeDataRaw && typeof routeDataRaw === 'object' ? routeDataRaw : null;
      if (!routeData) continue;

      const cragRaw = Array.isArray(routeData.crag)
        ? routeData.crag[0]
        : routeData.crag;
      const areaRaw = cragRaw?.area
        ? Array.isArray(cragRaw.area)
          ? cragRaw.area[0]
          : cragRaw.area
        : undefined;

      const areaSlugs = [
        ...new Set(
          [areaRaw?.slug, ...(areaRaw?.eight_anu_crag_slugs ?? [])].filter(
            (s): s is string => !!s,
          ),
        ),
      ];
      const cragSlugs = [
        ...new Set(
          [cragRaw?.slug, ...(cragRaw?.eight_anu_sector_slugs ?? [])].filter(
            (s): s is string => !!s,
          ),
        ),
      ];
      const scopes = areaSlugs.flatMap((aSlug) =>
        cragSlugs.map((cSlug) => `${aSlug}|${cSlug}`),
      );

      const addExistingKey = (
        slug: string | null | undefined,
        is8aSlug = false,
      ) => {
        if (scopes.length > 0) {
          for (const scope of scopes) {
            const scopedKey = this.buildScopedAscentDedupKey(
              ascent.date,
              scope,
              slug,
              is8aSlug,
            );
            if (scopedKey) existingKeys.add(scopedKey);
          }
        } else {
          const key = this.buildAscentDedupKey(ascent.date, slug, is8aSlug);
          if (key) existingKeys.add(key);
        }
      };

      const routeIdentifier = routeData.slug || routeData.name || '';
      addExistingKey(routeIdentifier);

      if (routeData.name) {
        addExistingKey(routeData.name);
      }

      if (ascent.date && routeData.eight_anu_route_slugs) {
        for (const slug of routeData.eight_anu_route_slugs) {
          addExistingKey(slug, true);
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

  private normalizeDate(date: string | null | undefined): string {
    const trimmed = (date ?? '').trim();
    if (!trimmed) return '';
    return trimmed.split(/[T\s]/)[0];
  }

  private hasUnscopedKeys(keys: ReadonlySet<string>): boolean {
    for (const k of keys) {
      if (k.split('|').length === 2) return true;
    }
    return false;
  }

  private buildScopedAscentDedupKey(
    date: string | null | undefined,
    scope: string,
    slug: string | null | undefined,
    is8aSlug = false,
  ): string | null {
    const normalizedDate = this.normalizeDate(date);
    if (!normalizedDate || !slug || !scope) return null;
    const identifier = is8aSlug ? `8a:${slug}` : slugify(slug);
    return `${normalizedDate}|${scope}|${identifier}`;
  }

  private buildAscentDedupKey(
    date: string | null | undefined,
    slug: string | null | undefined,
    is8aSlug = false,
  ): string | null {
    const normalizedDate = this.normalizeDate(date);
    if (!normalizedDate || !slug) return null;
    const identifier = is8aSlug ? `8a:${slug}` : slugify(slug);
    return `${normalizedDate}|${identifier}`;
  }

  private getCsvDateRange(
    ascents: EightAnuAscent[],
  ): { from: string; to: string } | null {
    const normalizedDates = ascents
      .map((a) => this.normalizeDate(a.date))
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
