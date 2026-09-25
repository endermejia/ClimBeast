// Pure matching logic for the 8a.nu import preview step: decides which areas
// and sectors (crags) from the CSV already exist in the database.
//
// Everything is keyed with slugs derived from the CSV names (slugify /
// sectorSlug) so the preview component can compare them directly, while the
// database rows are matched by slug OR by normalised name — otherwise areas
// whose stored name/slug differs from the CSV label make every sector below
// them look brand new.

import { normalizeName, sectorSlug, slugify } from './slugify';

export interface DbAreaRecord {
  id: number;
  slug: string;
  name: string;
  eight_anu_crag_slugs: string[] | null;
}

export interface DbCragRecord {
  id: number;
  area_id: number;
  slug: string;
  name: string;
  eight_anu_sector_slugs: string[] | null;
}

export interface CsvAreaInput {
  slug: string;
  name: string;
}

export interface CsvCragPair {
  /** slugify(location_name) of the CSV row */
  areaSlug: string;
  /** sectorSlug(sector_name) of the CSV row */
  cragSlug: string;
  /** trimmed sector name, defaulting to "General" like the import payload */
  cragName: string;
}

export interface ExistingAreaMatch {
  /** CSV area slug -> database area id (only for areas that already exist) */
  dbAreaIdBySlug: Map<string, number>;
  /** CSV area slugs recognised as existing (plus stored 8a slugs) */
  existingAreaSlugs: Set<string>;
}

/**
 * Matches CSV areas against database areas by exact slug first, then by
 * normalised name, then by the stored 8a.nu slugs.
 */
export function matchExistingAreas(
  csvAreas: readonly CsvAreaInput[],
  dbAreas: readonly DbAreaRecord[],
): ExistingAreaMatch {
  const dbAreaIdBySlug = new Map<string, number>();
  const existingAreaSlugs = new Set<string>();

  // One normalization pass over the database rows: the lookups below are plain
  // Map gets instead of re-running normalizeName on every area for every CSV
  // row (O(csv × db) → O(csv + db)).
  const areaBySlug = new Map<string, DbAreaRecord>();
  const areaByNormalizedName = new Map<string, DbAreaRecord>();
  const areaByEightAnuSlug = new Map<string, DbAreaRecord>();
  // "First row wins", mirroring Array.find over dbAreas in its original order.
  const setIfAbsent = (
    map: Map<string, DbAreaRecord>,
    key: string,
    area: DbAreaRecord,
  ): void => {
    if (!map.has(key)) map.set(key, area);
  };

  for (const area of dbAreas) {
    setIfAbsent(areaBySlug, area.slug, area);
    setIfAbsent(areaByNormalizedName, normalizeName(area.name), area);
    for (const s of area.eight_anu_crag_slugs ?? []) {
      setIfAbsent(areaByEightAnuSlug, s, area);
    }
  }

  for (const csv of csvAreas) {
    const match =
      areaBySlug.get(csv.slug) ??
      areaByNormalizedName.get(normalizeName(csv.name)) ??
      areaByEightAnuSlug.get(csv.slug);

    if (!match) continue;

    existingAreaSlugs.add(csv.slug);
    dbAreaIdBySlug.set(csv.slug, match.id);
    for (const s of match.eight_anu_crag_slugs ?? []) {
      existingAreaSlugs.add(s);
    }
  }

  return {
    dbAreaIdBySlug,
    existingAreaSlugs,
  };
}

/**
 * Matches CSV sectors against the database crags *of their matched area*, by
 * exact slug first, then by normalised name, then by stored 8a.nu slugs.
 * Returns keys of the form `${areaSlug}|${cragSlug}` (CSV terms).
 */
export function matchExistingCrags(
  csvCrags: readonly CsvCragPair[],
  dbAreaIdBySlug: ReadonlyMap<string, number>,
  dbCrags: readonly DbCragRecord[],
): Set<string> {
  const existing = new Set<string>();

  const cragsByAreaId = new Map<number, DbCragRecord[]>();
  // Normalized-name / 8a-slug indexes scoped by area, built once per dataset so
  // the CSV loop below never re-normalizes a database row.
  const cragByNameKey = new Map<string, DbCragRecord>();
  const cragByEightAnuKey = new Map<string, DbCragRecord>();
  const scoped = (areaId: number, term: string): string =>
    `${areaId}\u0000${term}`;

  for (const crag of dbCrags) {
    const list = cragsByAreaId.get(crag.area_id);
    if (list) {
      list.push(crag);
    } else {
      cragsByAreaId.set(crag.area_id, [crag]);
    }

    const nameKey = scoped(crag.area_id, normalizeName(crag.name));
    if (!cragByNameKey.has(nameKey)) cragByNameKey.set(nameKey, crag);

    for (const s of crag.eight_anu_sector_slugs ?? []) {
      const slugKey = scoped(crag.area_id, s);
      if (!cragByEightAnuKey.has(slugKey)) cragByEightAnuKey.set(slugKey, crag);
    }
  }

  for (const csv of csvCrags) {
    const areaId = dbAreaIdBySlug.get(csv.areaSlug);
    // Unknown area → it will be created, so its sectors will be new too.
    if (areaId === undefined) continue;

    const candidates = cragsByAreaId.get(areaId);
    if (!candidates?.length) continue;

    const match =
      candidates.find((crag) => crag.slug === csv.cragSlug) ??
      cragByNameKey.get(scoped(areaId, normalizeName(csv.cragName))) ??
      cragByEightAnuKey.get(scoped(areaId, csv.cragSlug));

    if (match) {
      existing.add(`${csv.areaSlug}|${csv.cragSlug}`);
    }
  }

  return existing;
}

/** Builds the unique CSV area/sector inputs used by the matchers above. */
export function collectCsvMatchInputs(
  ascents: readonly {
    location_name: string;
    sector_name: string;
  }[],
): { csvAreas: CsvAreaInput[]; csvCrags: CsvCragPair[] } {
  const areaBySlug = new Map<string, CsvAreaInput>();
  const cragByKey = new Map<string, CsvCragPair>();

  for (const a of ascents) {
    const areaSlug = slugify(a.location_name);
    if (!areaBySlug.has(areaSlug)) {
      areaBySlug.set(areaSlug, { slug: areaSlug, name: a.location_name });
    }

    const cragName = a.sector_name?.trim() || 'General';
    const cragSlug = sectorSlug(cragName);
    const key = `${areaSlug}|${cragSlug}`;
    if (!cragByKey.has(key)) {
      cragByKey.set(key, { areaSlug, cragSlug, cragName });
    }
  }

  return {
    csvAreas: [...areaBySlug.values()],
    csvCrags: [...cragByKey.values()],
  };
}
