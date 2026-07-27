import {
  ClimbingKind,
  ClimbingKinds,
  LABEL_TO_VERTICAL_LIFE,
  ORDERED_GRADE_VALUES,
} from '../models';

/**
 * Options for applying feed filters to a Supabase query.
 */
export interface FeedFilterOptions {
  /** Current feed filter (following, all, favorite_areas, etc.) */
  filter: string;
  /** Current user ID */
  userId: string;
  /** Categories selected (0 = sport, 1 = boulder, 2 = multipitch) */
  categories: number[];
  /** Grade range [minIdx, maxIdx] */
  gradeRange: [number, number];
  /** IDs of followed users */
  followedIds: string[];
  /** IDs of liked areas */
  likedAreaIds: number[];
  /** IDs of liked crags */
  likedCragIds: number[];
  /** IDs of liked routes */
  likedRouteIds: number[];
}

/**
 * Result of applying filters - indicates if the query should proceed
 * and what early return value to use if not.
 */
export interface FeedFilterResult<T> {
  /** Whether to proceed with the query */
  shouldProceed: boolean;
  /** Early return value if shouldProceed is false */
  earlyReturn: T;
}

/**
 * Checks if the filter should proceed based on the filter type and available data.
 * Returns early return value if the query should be skipped.
 */
export function shouldProceedWithFilter<T>(
  filter: string,
  options: FeedFilterOptions,
  emptyReturnValue: T,
): FeedFilterResult<T> {
  if (filter === 'following' && options.followedIds.length === 0) {
    return { shouldProceed: false, earlyReturn: emptyReturnValue };
  }

  if (filter === 'favorite_areas' && options.likedAreaIds.length === 0) {
    return { shouldProceed: false, earlyReturn: emptyReturnValue };
  }

  if (filter === 'favorite_crags' && options.likedCragIds.length === 0) {
    return { shouldProceed: false, earlyReturn: emptyReturnValue };
  }

  if (filter === 'favorite_routes' && options.likedRouteIds.length === 0) {
    return { shouldProceed: false, earlyReturn: emptyReturnValue };
  }

  return { shouldProceed: true, earlyReturn: emptyReturnValue };
}

/**
 * Applies user filter to a Supabase query builder.
 * Excludes current user if filter is not 'all', and includes only followed/liked items if applicable.
 */
export function applyUserFilter<
  T extends {
    in(column: string, values: unknown[]): T;
    neq(column: string, value: unknown): T;
  },
>(
  query: T,
  options: FeedFilterOptions,
  userFilterColumn: string = 'user_id',
): T {
  let q = query;

  // Exclude own ascents unless viewing 'all'
  if (options.filter !== 'all') {
    q = q.neq(userFilterColumn, options.userId);
  }

  // Apply specific filter
  switch (options.filter) {
    case 'following':
      q = q.in(userFilterColumn, options.followedIds);
      break;
    case 'favorite_areas':
      q = q.in('route.crag.area_id', options.likedAreaIds);
      break;
    case 'favorite_crags':
      q = q.in('route.crag_id', options.likedCragIds);
      break;
    case 'favorite_routes':
      q = q.in('route_id', options.likedRouteIds);
      break;
  }

  return q;
}

/**
 * Applies user filter for indoor queries (simplified version).
 */
export function applyIndoorUserFilter<
  T extends {
    in(column: string, values: unknown[]): T;
    neq(column: string, value: unknown): T;
  },
>(
  query: T,
  options: FeedFilterOptions,
  userFilterColumn: string = 'user_id',
): T {
  let q = query;

  if (options.filter !== 'all') {
    q = q.neq(userFilterColumn, options.userId);
  }

  if (options.filter === 'following') {
    q = q.in(userFilterColumn, options.followedIds);
  }

  return q;
}

/**
 * Applies climbing kind/category filter to a query.
 */
export function applyCategoryFilter<
  T extends { in(column: string, values: unknown[]): T },
>(
  query: T,
  categories: number[],
  column: string = 'route.climbing_kind',
  includeMultipitch: boolean = true,
): T {
  if (categories.length === 0) return query;

  const kindsArray: ClimbingKind[] = [];
  if (categories.includes(0)) kindsArray.push(ClimbingKinds.SPORT);
  if (categories.includes(1)) kindsArray.push(ClimbingKinds.BOULDER);
  if (includeMultipitch && categories.includes(2))
    kindsArray.push(ClimbingKinds.MULTIPITCH);

  if (kindsArray.length === 0) return query;
  return query.in(column, kindsArray);
}

/**
 * Applies grade range filter to a query.
 */
export function applyGradeFilter<
  T extends { in(column: string, values: unknown[]): T },
>(query: T, gradeRange: [number, number], column: string = 'route.grade'): T {
  const [loIdx, hiIdx] = gradeRange;
  if (loIdx === 0 && hiIdx === ORDERED_GRADE_VALUES.length - 1) {
    return query; // Full range selected, no filter needed
  }

  const allowedLabels = ORDERED_GRADE_VALUES.slice(loIdx, hiIdx + 1);
  const allowedDbGrades = allowedLabels
    .map((label) => LABEL_TO_VERTICAL_LIFE[label])
    .filter((g): g is number => g !== undefined);

  // Ensure projects (0) are always rendered for partial ranges
  if (!allowedDbGrades.includes(0)) {
    allowedDbGrades.push(0);
  }

  return query.in(column, allowedDbGrades);
}
