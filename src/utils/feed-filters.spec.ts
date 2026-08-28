import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ORDERED_GRADE_VALUES } from '../models';

import {
  shouldProceedWithFilter,
  applyCategoryFilter,
  applyGradeFilter,
} from './feed-filters';

const mockFilterOptions = {
  filter: 'all',
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
    const result = shouldProceedWithFilter('all', mockFilterOptions, []);
    expect(result.shouldProceed).toBe(true);
  });

  it('should not proceed for following with no followed ids', () => {
    const options = { ...mockFilterOptions, followedIds: [] };
    const result = shouldProceedWithFilter('following', options, []);
    expect(result.shouldProceed).toBe(false);
    expect(result.earlyReturn).toEqual([]);
  });

  it('should proceed for following with followed ids', () => {
    const result = shouldProceedWithFilter('following', mockFilterOptions, []);
    expect(result.shouldProceed).toBe(true);
  });

  it('should not proceed for favorite_areas with no liked areas', () => {
    const options = { ...mockFilterOptions, likedAreaIds: [] };
    const result = shouldProceedWithFilter('favorite_areas', options, null);
    expect(result.shouldProceed).toBe(false);
    expect(result.earlyReturn).toBeNull();
  });

  it('should not proceed for favorite_crags with no liked crags', () => {
    const options = { ...mockFilterOptions, likedCragIds: [] };
    const result = shouldProceedWithFilter('favorite_crags', options, []);
    expect(result.shouldProceed).toBe(false);
  });

  it('should not proceed for favorite_routes with no liked routes', () => {
    const options = { ...mockFilterOptions, likedRouteIds: [] };
    const result = shouldProceedWithFilter('favorite_routes', options, []);
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
