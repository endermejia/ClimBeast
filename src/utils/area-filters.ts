import {
  AmountByEveryGrade,
  ClimbingKinds,
  normalizeRoutesByGrade,
  ORDERED_GRADE_VALUES,
  RoutesByGrade,
} from '../models';

import { matchesQuery } from './slugify';

export interface AreaFilterable {
  name?: string | null;
  slug?: string | null;
  grades?: AmountByEveryGrade | RoutesByGrade;
  climbing_kind?: readonly string[] | null;
  shade_morning?: boolean | null;
  shade_afternoon?: boolean | null;
  shade_all_day?: boolean | null;
  sun_all_day?: boolean | null;
  topos_count?: number | null;
}

export interface AreaActiveFiltersOptions {
  gradeRange: [number, number];
  categories: readonly number[];
  shade: readonly string[];
  toposOnly?: boolean;
}

export interface AreaFilterCriteria extends AreaActiveFiltersOptions {
  query: string;
}

const CATEGORY_INDEX_TO_KIND: Readonly<Record<number, string>> = {
  0: ClimbingKinds.SPORT,
  1: ClimbingKinds.BOULDER,
  2: ClimbingKinds.MULTIPITCH,
};

export function hasActiveAreaFilters(
  options: AreaActiveFiltersOptions,
): boolean {
  const [lo, hi] = options.gradeRange;
  const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
  return (
    gradeActive ||
    options.categories.length > 0 ||
    options.shade.length > 0 ||
    Boolean(options.toposOnly)
  );
}

export function filterAreas<T extends AreaFilterable>(
  areas: readonly T[],
  criteria: AreaFilterCriteria,
): T[] {
  const { query, gradeRange, categories, shade, toposOnly = false } = criteria;
  const [minIdx, maxIdx] = gradeRange;
  const allowedLabels = ORDERED_GRADE_VALUES.slice(minIdx, maxIdx + 1);
  const isFullGradeRange = allowedLabels.length === ORDERED_GRADE_VALUES.length;
  const allowedKinds = categories
    .map((i) => CATEGORY_INDEX_TO_KIND[i])
    .filter((k): k is string => Boolean(k));

  return areas.filter((a) => {
    const textMatches =
      matchesQuery(a.name, query) || matchesQuery(a.slug, query);
    if (!textMatches) return false;

    if (!isFullGradeRange) {
      const grades = normalizeRoutesByGrade(a.grades);
      let gradeMatches = false;
      for (const label of allowedLabels) {
        if (grades[label] && Number(grades[label]) > 0) {
          gradeMatches = true;
          break;
        }
      }
      if (!gradeMatches) return false;
    }

    if (categories.length > 0) {
      const kindMatches = Boolean(
        a.climbing_kind?.some((k) => allowedKinds.includes(k)),
      );
      if (!kindMatches) return false;
    }

    if (shade.length > 0) {
      const shadeMatches = shade.some((key) => {
        switch (key) {
          case 'shade_morning':
            return Boolean(a.shade_morning);
          case 'shade_afternoon':
            return Boolean(a.shade_afternoon);
          case 'shade_all_day':
            return Boolean(a.shade_all_day);
          case 'sun_all_day':
            return Boolean(a.sun_all_day);
          default:
            return true;
        }
      });
      if (!shadeMatches) return false;
    }

    if (toposOnly && (a.topos_count || 0) <= 0) {
      return false;
    }

    return true;
  });
}
