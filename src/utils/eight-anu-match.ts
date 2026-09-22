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

  for (const csv of csvAreas) {
    const bySlug = dbAreas.find((area) => area.slug === csv.slug);
    const csvName = normalizeName(csv.name);
    const byName = dbAreas.find((area) => normalizeName(area.name) === csvName);
    const byEightAnu = dbAreas.find((area) =>
      area.eight_anu_crag_slugs?.includes(csv.slug),
    );
    const match = bySlug ?? byName ?? byEightAnu;

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
  for (const crag of dbCrags) {
    const list = cragsByAreaId.get(crag.area_id);
    if (list) {
      list.push(crag);
    } else {
      cragsByAreaId.set(crag.area_id, [crag]);
    }
  }

  for (const csv of csvCrags) {
    const areaId = dbAreaIdBySlug.get(csv.areaSlug);
    // Unknown area → it will be created, so its sectors will be new too.
    if (areaId === undefined) continue;

    const candidates = cragsByAreaId.get(areaId);
    if (!candidates?.length) continue;

    const csvName = normalizeName(csv.cragName);
    const match =
      candidates.find((crag) => crag.slug === csv.cragSlug) ??
      candidates.find((crag) => normalizeName(crag.name) === csvName) ??
      candidates.find((crag) =>
        crag.eight_anu_sector_slugs?.includes(csv.cragSlug),
      );

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
