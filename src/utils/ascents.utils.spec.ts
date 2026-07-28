import { describe, it, expect, vi, afterEach } from 'vitest';

import {
  markDuplicateAscents,
  getAscentDateFilterOptions,
  processAscentsToFeed,
  isNewsItem,
  isAscentItem,
} from './ascents.utils';
import type { RouteAscentWithExtras } from '../models';

interface TestAscent {
  date: string | null;
  route?: { name?: string };
  is_duplicate?: boolean;
}

describe('markDuplicateAscents', () => {
  it('marks no duplicates for unique ascents', () => {
    const ascents: TestAscent[] = [
      { date: '2024-01-01', route: { name: 'Route A' } },
      { date: '2024-01-01', route: { name: 'Route B' } },
    ];
    const result = markDuplicateAscents(ascents);
    expect(result[0].is_duplicate).toBe(false);
    expect(result[1].is_duplicate).toBe(false);
  });

  it('marks duplicate ascents on same date and normalized name', () => {
    const ascents: TestAscent[] = [
      { date: '2024-01-01', route: { name: 'Route A' } },
      { date: '2024-01-01', route: { name: 'Route A' } },
    ];
    const result = markDuplicateAscents(ascents);
    expect(result[0].is_duplicate).toBe(false);
    expect(result[1].is_duplicate).toBe(true);
  });

  it('does not mark duplicates on different dates', () => {
    const ascents: TestAscent[] = [
      { date: '2024-01-01', route: { name: 'Route A' } },
      { date: '2024-01-02', route: { name: 'Route A' } },
    ];
    const result = markDuplicateAscents(ascents);
    expect(result[0].is_duplicate).toBe(false);
    expect(result[1].is_duplicate).toBe(false);
  });

  it('handles empty array', () => {
    expect(markDuplicateAscents([])).toEqual([]);
  });

  it('handles ascents with undefined route name', () => {
    const ascents: TestAscent[] = [
      { date: '2024-01-01', route: undefined },
      { date: '2024-01-01', route: undefined },
    ];
    const result = markDuplicateAscents(ascents);
    expect(result[0].is_duplicate).toBe(false);
    expect(result[1].is_duplicate).toBe(true);
  });

  it('handles ascents with null date', () => {
    const ascents: TestAscent[] = [
      { date: null, route: { name: 'A' } },
      { date: null, route: { name: 'A' } },
    ];
    const result = markDuplicateAscents(ascents);
    expect(result[0].is_duplicate).toBe(false);
    expect(result[1].is_duplicate).toBe(true);
  });

  it('handles empty route name', () => {
    const ascents: TestAscent[] = [
      { date: '2024-01-01', route: { name: '' } },
      { date: '2024-01-01', route: { name: '' } },
    ];
    const result = markDuplicateAscents(ascents);
    expect(result[1].is_duplicate).toBe(true);
  });
});

describe('getAscentDateFilterOptions', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns last12, all, and years from current year down to 2020', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15'));

    const result = getAscentDateFilterOptions();
    expect(result[0]).toBe('last12');
    expect(result[1]).toBe('all');
    expect(result).toContain('2024');
    expect(result).toContain('2020');
    expect(result).not.toContain('2019');
  });

  it('clamps startingYear to min 2020 when less than 2020', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15'));

    const result = getAscentDateFilterOptions(2018);
    expect(result).toContain('2020');
    expect(result).toContain('2024');
    expect(result).toContain('2018');
  });

  it('uses startingYear directly if greater than 2020', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15'));

    const result = getAscentDateFilterOptions(2022);
    expect(result).toContain('2024');
    expect(result).toContain('2022');
    expect(result).toContain('2020');
  });
});

describe('processAscentsToFeed', () => {
  it('wraps ascents with kind: ascent', () => {
    const ascents = [{ id: 1, date: '2024-01-01' }] as RouteAscentWithExtras[];
    const result = processAscentsToFeed(ascents, false);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('kind', 'ascent');
  });

  it('marks duplicates by default', () => {
    const ascents = [
      { date: '2024-01-01', route: { name: 'A' } },
      { date: '2024-01-01', route: { name: 'A' } },
    ] as RouteAscentWithExtras[];
    const result = processAscentsToFeed(ascents) as (RouteAscentWithExtras & {
      kind: 'ascent';
    })[];
    expect(result[0].is_duplicate).toBe(false);
    expect(result[1].is_duplicate).toBe(true);
  });

  it('skips duplicate marking when markDuplicates=false', () => {
    const ascents = [
      { date: '2024-01-01', route: { name: 'A' } },
      { date: '2024-01-01', route: { name: 'A' } },
    ] as RouteAscentWithExtras[];
    const result = processAscentsToFeed(
      ascents,
      false,
    ) as (RouteAscentWithExtras & { kind: 'ascent' })[];
    expect(result[0].is_duplicate).toBeUndefined();
    expect(result[1].is_duplicate).toBeUndefined();
  });
});

describe('isNewsItem', () => {
  it('returns true for news items', () => {
    expect(isNewsItem({ kind: 'news' } as never)).toBe(true);
  });

  it('returns false for ascent items', () => {
    expect(isNewsItem({ kind: 'ascent' } as never)).toBe(false);
  });
});

describe('isAscentItem', () => {
  it('returns true for ascent items', () => {
    expect(isAscentItem({ kind: 'ascent' } as never)).toBe(true);
  });

  it('returns false for news items', () => {
    expect(isAscentItem({ kind: 'news' } as never)).toBe(false);
  });
});
