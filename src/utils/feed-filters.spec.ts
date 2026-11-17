import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomeFeedFilters, ORDERED_GRADE_VALUES } from '../models';

import {
  applyCategoryFilter,
  applyGradeFilter,
  applyIndoorUserFilter,
  applyUserFilter,
  shouldProceedWithFilter,
} from './feed-filters';

const mockFilterOptions = {
  filter: HomeFeedFilters.ALL,
  userId: 'user-1',
  categories: [],
  gradeRange: [0, ORDERED_GRADE_VALUES.length - 1] as [number, number],
  followedIds: ['user-2', 'user-3'],
  likedAreaIds: [1, 2],
  likedCragIds: [10, 20],
  likedRouteIds: [100, 200],
};

describe('shouldProceedWithFilter', () => {
  it('should proceed for all filter', () => {
    const result = shouldProceedWithFilter(
      HomeFeedFilters.ALL,
      mockFilterOptions,
      [],
    );
    expect(result.shouldProceed).toBe(true);
  });

  it('should not proceed for following with no followed ids and no userId', () => {
    const options = { ...mockFilterOptions, userId: '', followedIds: [] };
    const result = shouldProceedWithFilter(
      HomeFeedFilters.FOLLOWING,
      options,
      [],
    );
    expect(result.shouldProceed).toBe(false);
    expect(result.earlyReturn).toEqual([]);
  });

  it('should proceed for following with userId even if followedIds is empty', () => {
    const options = { ...mockFilterOptions, followedIds: [] };
    const result = shouldProceedWithFilter(
      HomeFeedFilters.FOLLOWING,
      options,
      [],
    );
    expect(result.shouldProceed).toBe(true);
  });

  it('should proceed for following with followed ids', () => {
    const result = shouldProceedWithFilter(
      HomeFeedFilters.FOLLOWING,
      mockFilterOptions,
      [],
    );
    expect(result.shouldProceed).toBe(true);
  });

  it('should not proceed for favorite_areas with no liked areas', () => {
    const options = { ...mockFilterOptions, likedAreaIds: [] };
    const result = shouldProceedWithFilter(
      HomeFeedFilters.FAVORITE_AREAS,
      options,
      null,
    );
    expect(result.shouldProceed).toBe(false);
    expect(result.earlyReturn).toBeNull();
  });

  it('should not proceed for favorite_crags with no liked crags', () => {
    const options = { ...mockFilterOptions, likedCragIds: [] };
    const result = shouldProceedWithFilter(
      HomeFeedFilters.FAVORITE_CRAGS,
      options,
      [],
    );
    expect(result.shouldProceed).toBe(false);
  });

  it('should not proceed for favorite_routes with no liked routes', () => {
    const options = { ...mockFilterOptions, likedRouteIds: [] };
    const result = shouldProceedWithFilter(
      HomeFeedFilters.FAVORITE_ROUTES,
      options,
      [],
    );
    expect(result.shouldProceed).toBe(false);
  });
});

describe('applyCategoryFilter', () => {
  const mockQuery = {
    in: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return query unchanged for empty categories', () => {
    const result = applyCategoryFilter(mockQuery, []);
    expect(result).toBe(mockQuery);
    expect(mockQuery.in).not.toHaveBeenCalled();
  });

  it('should apply sport filter', () => {
    applyCategoryFilter(mockQuery, [0]);
    expect(mockQuery.in).toHaveBeenCalledWith('route.climbing_kind', ['sport']);
  });

  it('should apply boulder filter', () => {
    applyCategoryFilter(mockQuery, [1]);
    expect(mockQuery.in).toHaveBeenCalledWith('route.climbing_kind', [
      'boulder',
    ]);
  });

  it('should apply multipitch filter', () => {
    applyCategoryFilter(mockQuery, [2]);
    expect(mockQuery.in).toHaveBeenCalledWith('route.climbing_kind', [
      'multipitch',
    ]);
  });

  it('should combine multiple categories', () => {
    applyCategoryFilter(mockQuery, [0, 1]);
    expect(mockQuery.in).toHaveBeenCalledWith('route.climbing_kind', [
      'sport',
      'boulder',
    ]);
  });

  it('should filter to none when categories have no matching kinds for the target context', () => {
    applyCategoryFilter(mockQuery, [2], 'route.climbing_kind', false);
    expect(mockQuery.in).toHaveBeenCalledWith('route.climbing_kind', [
      '__none__',
    ]);
  });
});

describe('applyGradeFilter', () => {
  const mockQuery = {
    in: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return query unchanged for full range', () => {
    const fullRange: [number, number] = [0, ORDERED_GRADE_VALUES.length - 1];
    const result = applyGradeFilter(mockQuery, fullRange);
    expect(result).toBe(mockQuery);
    expect(mockQuery.in).not.toHaveBeenCalled();
  });

  it('should apply grade filter for partial range', () => {
    const partialRange: [number, number] = [15, 25];
    applyGradeFilter(mockQuery, partialRange);
    expect(mockQuery.in).toHaveBeenCalled();
  });
});

describe('applyUserFilter & applyIndoorUserFilter', () => {
  const createQueryMock = () => {
    const mock = {
      in: vi.fn(),
      neq: vi.fn(),
    };
    mock.in.mockReturnValue(mock);
    mock.neq.mockReturnValue(mock);
    return mock;
  };

  it('includes followedIds and current userId without neq exclusion in following filter (outdoor)', () => {
    const query = createQueryMock();
    applyUserFilter(query, {
      ...mockFilterOptions,
      filter: HomeFeedFilters.FOLLOWING,
    });
    expect(query.neq).not.toHaveBeenCalled();
    expect(query.in).toHaveBeenCalledWith('user_id', [
      'user-2',
      'user-3',
      'user-1',
    ]);
  });

  it('includes followedIds and current userId without neq exclusion in following filter (indoor)', () => {
    const query = createQueryMock();
    applyIndoorUserFilter(query, {
      ...mockFilterOptions,
      filter: HomeFeedFilters.FOLLOWING,
    });
    expect(query.neq).not.toHaveBeenCalled();
    expect(query.in).toHaveBeenCalledWith('user_id', [
      'user-2',
      'user-3',
      'user-1',
    ]);
  });

  it('excludes current user for favorite_areas filter', () => {
    const query = createQueryMock();
    applyUserFilter(query, {
      ...mockFilterOptions,
      filter: HomeFeedFilters.FAVORITE_AREAS,
    });
    expect(query.neq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(query.in).toHaveBeenCalledWith('routes.crags.area_id', [1, 2]);
  });
});
