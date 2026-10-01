import {
  ClimbingKinds,
  GRADE_NUMBER_TO_LABEL,
  ORDERED_GRADE_VALUES,
  PROJECT_GRADE_LABEL,
  RouteWithExtras,
  VERTICAL_LIFE_GRADES,
} from '../models';

import { matchesQuery } from './slugify';

export interface RouteFilterOptions {
  query: string;
  gradeRange: [number, number];
  categories: number[];
}

export function textMatchesRoute(
  r: Partial<RouteWithExtras>,
  query: string,
): boolean {
  // Fast path: empty search query matches everything instantly
  if (!query) return true;
  const nameMatch = matchesQuery(r.name, query);
  const gradeLabel = GRADE_NUMBER_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES];
  const gradeMatch = matchesQuery(gradeLabel, query);
  return nameMatch || gradeMatch;
}

export function gradeMatchesRoute(
  r: Partial<RouteWithExtras>,
  minIdx: number,
  maxIdx: number,
  allowedLabelsSet?: Set<string>,
): boolean {
  // Fast path: full grade range matches all routes instantly without array/set allocations
  if (minIdx === 0 && maxIdx >= ORDERED_GRADE_VALUES.length - 1) {
    return true;
  }
  const label = GRADE_NUMBER_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES];
  if (!label || label === PROJECT_GRADE_LABEL) return true;

  // Use precomputed Set if provided by filter loop for O(1) membership check
  if (allowedLabelsSet) {
    return allowedLabelsSet.has(label);
  }

  const allowedLabels = ORDERED_GRADE_VALUES.slice(minIdx, maxIdx + 1);
  return (allowedLabels as readonly string[]).includes(label);
}

export function categoryMatchesRoute(
  r: Partial<RouteWithExtras>,
  categories: number[],
): boolean {
  if (categories.length === 0) return true;
  const kind = r.climbing_kind;
  if (!kind) return true;
  if (categories.includes(0) && kind === ClimbingKinds.SPORT) return true;
  if (categories.includes(1) && kind === ClimbingKinds.BOULDER) return true;
  return categories.includes(2) && kind === ClimbingKinds.MULTIPITCH;
}

export function filterRoutes<T extends Partial<RouteWithExtras>>(
  routes: T[],
  options: RouteFilterOptions,
): T[] {
  const { query, gradeRange, categories } = options;
  const [minIdx, maxIdx] = gradeRange;

  // Pre-allocate Set once outside filter loop to eliminate per-element array slice allocations
  const isFullGradeRange =
    minIdx === 0 && maxIdx >= ORDERED_GRADE_VALUES.length - 1;
  const allowedLabelsSet = !isFullGradeRange
    ? new Set<string>(ORDERED_GRADE_VALUES.slice(minIdx, maxIdx + 1))
    : undefined;

  // Re-ordered predicates: cheap boolean/kind check first, then O(1) grade check, then expensive text matching
  return routes.filter(
    (r) =>
      categoryMatchesRoute(r, categories) &&
      gradeMatchesRoute(r, minIdx, maxIdx, allowedLabelsSet) &&
      textMatchesRoute(r, query),
  );
}

export function routesSortByGrade(
  a: RouteWithExtras,
  b: RouteWithExtras,
): number {
  return (a.grade ?? 0) - (b.grade ?? 0);
}
