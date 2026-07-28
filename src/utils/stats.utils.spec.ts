import { describe, it, expect } from 'vitest';
import {
  getScore,
  getMaxGrade,
  calculateAscentTypeDistribution,
  calculateGradeDistribution,
  calculatePeriodScore,
  filterAscentsByDate,
} from './stats.utils';
import { AscentTypes, VERTICAL_LIFE_GRADES } from '../models';
import type { UserAscentStatRecord } from '../models/route-ascent.model';

function makeAscent(
  overrides: Partial<UserAscentStatRecord> = {},
): UserAscentStatRecord {
  return {
    id: 1,
    route_id: 1,
    route_name: 'Test Route',
    route_grade: VERTICAL_LIFE_GRADES.G8a,
    ascent_type: AscentTypes.RP,
    ascent_grade: null,
    ascent_date: '2024-06-15',
    rate: null,
    user_id: 'user-1',
    area_slug: '',
    crag_slug: '',
    route_slug: '',
    ...overrides,
  } as unknown as UserAscentStatRecord;
}

describe('getScore', () => {
  it('should return 0 for grade 0', () => {
    expect(getScore(0, 'rp')).toBe(0);
  });

  it('should calculate base RP score for 8a (gradeId=29)', () => {
    expect(getScore(29, 'rp')).toBe(1000);
  });

  it('should add OS bonus of 125', () => {
    expect(getScore(29, 'os')).toBe(1125);
  });

  it('should add Flash bonus of 60', () => {
    expect(getScore(29, 'f')).toBe(1060);
  });

  it('should handle onsight string', () => {
    expect(getScore(29, 'onsight')).toBe(1125);
  });

  it('should handle flash string', () => {
    expect(getScore(29, 'flash')).toBe(1060);
  });

  it('should scale by 50 per grade step', () => {
    expect(getScore(30, 'rp')).toBe(1050);
    expect(getScore(28, 'rp')).toBe(950);
  });

  it('should return 0 for negative grade', () => {
    expect(getScore(-1, 'rp')).toBe(0);
  });
});

describe('getMaxGrade', () => {
  it('should return max grade for matching types', () => {
    const ascents = [
      makeAscent({ route_grade: 29, ascent_type: 'rp' }),
      makeAscent({ route_grade: 27, ascent_type: 'rp' }),
    ];
    const result = getMaxGrade(ascents, ['rp']);
    expect(result).toBe('8a');
  });

  it('should return null for empty ascents', () => {
    expect(getMaxGrade([], ['rp'])).toBeNull();
  });

  it('should filter by type', () => {
    const ascents = [
      makeAscent({ route_grade: 29, ascent_type: 'os' }),
      makeAscent({ route_grade: 31, ascent_type: 'rp' }),
    ];
    const result = getMaxGrade(ascents, ['os']);
    expect(result).toBe('8a');
  });
});

describe('calculateAscentTypeDistribution', () => {
  it('should count ascents by type', () => {
    const ascents = [
      makeAscent({ ascent_type: 'os' }),
      makeAscent({ ascent_type: 'os' }),
      makeAscent({ ascent_type: 'f' }),
      makeAscent({ ascent_type: 'rp' }),
      makeAscent({ ascent_type: 'rp' }),
      makeAscent({ ascent_type: 'rp' }),
    ];
    const result = calculateAscentTypeDistribution(ascents);
    expect(result).toEqual({ os: 2, flash: 1, rp: 3, total: 6 });
  });

  it('should handle empty ascents', () => {
    expect(calculateAscentTypeDistribution([])).toEqual({
      os: 0,
      flash: 0,
      rp: 0,
      total: 0,
    });
  });
});

describe('calculatePeriodScore', () => {
  it('should calculate score from top 10 routes', () => {
    const ascents = Array.from({ length: 15 }, (_, i) =>
      makeAscent({ id: i, route_grade: 29 + (i % 5), ascent_type: 'rp' }),
    );
    const result = calculatePeriodScore(ascents);
    expect(result.score).toBeGreaterThan(0);
    expect(result.topRoutes.length).toBeLessThanOrEqual(10);
  });

  it('should return 0 for empty ascents', () => {
    const result = calculatePeriodScore([]);
    expect(result.score).toBe(0);
    expect(result.topRoutes).toEqual([]);
  });
});

describe('filterAscentsByDate', () => {
  it('should return all for all_time', () => {
    const ascents = [makeAscent()];
    expect(filterAscentsByDate(ascents, 'all_time')).toEqual(ascents);
  });

  it('should return all for empty filter', () => {
    const ascents = [makeAscent()];
    expect(filterAscentsByDate(ascents, '')).toEqual(ascents);
  });

  it('should filter by specific year', () => {
    const ascents = [
      makeAscent({ ascent_date: '2024-06-15' }),
      makeAscent({ ascent_date: '2023-06-15' }),
    ];
    const result = filterAscentsByDate(ascents, '2024');
    expect(result.length).toBe(1);
    expect(result[0].ascent_date).toBe('2024-06-15');
  });

  it('should filter by this_year', () => {
    const currentYear = new Date().getFullYear();
    const ascents = [
      makeAscent({ ascent_date: `${currentYear}-06-15` }),
      makeAscent({ ascent_date: '2020-06-15' }),
    ];
    const result = filterAscentsByDate(ascents, 'this_year');
    expect(result.length).toBe(1);
  });
});
