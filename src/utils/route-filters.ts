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
  const nameMatch = matchesQuery(r.name, query);
  const gradeLabel = GRADE_NUMBER_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES];
  const gradeMatch = matchesQuery(gradeLabel, query);
  return nameMatch || gradeMatch;
}

export function gradeMatchesRoute(
  r: Partial<RouteWithExtras>,
  minIdx: number,
  maxIdx: number,
): boolean {
  const allowedLabels = ORDERED_GRADE_VALUES.slice(minIdx, maxIdx + 1);
  const label = GRADE_NUMBER_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES];
  if (!label || label === PROJECT_GRADE_LABEL) return true;
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

  return routes.filter(
    (r) =>
      textMatchesRoute(r, query) &&
      gradeMatchesRoute(r, minIdx, maxIdx) &&
      categoryMatchesRoute(r, categories),
  );
}

export function routesSortByGrade(
  a: RouteWithExtras,
  b: RouteWithExtras,
): number {
  return (a.grade ?? 0) - (b.grade ?? 0);
}
