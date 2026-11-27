import { describe, expect, it } from 'vitest';

import {
  ClimbingKinds,
  ORDERED_GRADE_VALUES,
  VERTICAL_LIFE_GRADES,
} from '../models';

import {
  AreaFilterable,
  filterAreas,
  hasActiveAreaFilters,
} from './area-filters';

const FULL_GRADE_RANGE: [number, number] = [0, ORDERED_GRADE_VALUES.length - 1];

interface MockArea extends AreaFilterable {
  id: number;
  name: string;
  slug: string;
}

const AREAS: MockArea[] = [
  {
    id: 1,
    name: 'El Chorro',
    slug: 'el-chorro',
    grades: {
      [VERTICAL_LIFE_GRADES.G6a]: 12,
      [VERTICAL_LIFE_GRADES.G7a]: 5,
    },
    climbing_kind: [ClimbingKinds.SPORT, ClimbingKinds.MULTIPITCH],
    shade_morning: true,
    shade_afternoon: false,
    shade_all_day: false,
    sun_all_day: false,
    topos_count: 4,
  },
  {
    id: 2,
    name: 'Albarracín',
    slug: 'albarracin',
    grades: {
      [VERTICAL_LIFE_GRADES.G6b]: 20,
      [VERTICAL_LIFE_GRADES.G8a]: 3,
    },
    climbing_kind: [ClimbingKinds.BOULDER],
    shade_morning: false,
    shade_afternoon: true,
    shade_all_day: false,
    sun_all_day: false,
    topos_count: 0,
  },
  {
    id: 3,
    name: 'Margalef',
    slug: 'margalef',
    grades: {
      [VERTICAL_LIFE_GRADES.G7c]: 15,
      [VERTICAL_LIFE_GRADES.G9a]: 2,
    },
    climbing_kind: [ClimbingKinds.SPORT],
    shade_morning: false,
    shade_afternoon: false,
    shade_all_day: true,
    sun_all_day: false,
    topos_count: 10,
  },
  {
    id: 4,
    name: 'Siurana',
    slug: 'siurana-sector-sur',
    grades: {},
    climbing_kind: [ClimbingKinds.MULTIPITCH],
    shade_morning: false,
    shade_afternoon: false,
    shade_all_day: false,
    sun_all_day: true,
    topos_count: 1,
  },
];

describe('hasActiveAreaFilters', () => {
  it('returns false when all filters are at default values', () => {
    expect(
      hasActiveAreaFilters({
        gradeRange: FULL_GRADE_RANGE,
        categories: [],
        shade: [],
        toposOnly: false,
      }),
    ).toBe(false);
  });

  it('returns false when toposOnly is omitted and other filters are default', () => {
    expect(
      hasActiveAreaFilters({
        gradeRange: FULL_GRADE_RANGE,
        categories: [],
        shade: [],
      }),
    ).toBe(false);
  });

  it('returns true when gradeRange lower bound is narrowed', () => {
    expect(
      hasActiveAreaFilters({
        gradeRange: [1, ORDERED_GRADE_VALUES.length - 1],
        categories: [],
        shade: [],
      }),
    ).toBe(true);
  });

  it('returns true when gradeRange upper bound is narrowed', () => {
    expect(
      hasActiveAreaFilters({
        gradeRange: [0, ORDERED_GRADE_VALUES.length - 2],
        categories: [],
        shade: [],
      }),
    ).toBe(true);
  });

  it('returns true when categories are selected', () => {
    expect(
      hasActiveAreaFilters({
        gradeRange: FULL_GRADE_RANGE,
        categories: [0],
        shade: [],
      }),
    ).toBe(true);
  });

  it('returns true when shade filters are selected', () => {
    expect(
      hasActiveAreaFilters({
        gradeRange: FULL_GRADE_RANGE,
        categories: [],
        shade: ['shade_morning'],
      }),
    ).toBe(true);
  });

  it('returns true when toposOnly is true', () => {
    expect(
      hasActiveAreaFilters({
        gradeRange: FULL_GRADE_RANGE,
        categories: [],
        shade: [],
        toposOnly: true,
      }),
    ).toBe(true);
  });
});

describe('filterAreas', () => {
  const defaultCriteria = {
    query: '',
    gradeRange: FULL_GRADE_RANGE,
    categories: [] as number[],
    shade: [] as string[],
    toposOnly: false,
  };

  it('returns all areas including ones without grades when no filters are active', () => {
    const result = filterAreas(AREAS, defaultCriteria);
    expect(result.map((a) => a.id)).toEqual([1, 2, 3, 4]);
  });

  it('filters by query matching name (accent and case insensitive)', () => {
    const result = filterAreas(AREAS, {
      ...defaultCriteria,
      query: 'albarracin',
    });
    expect(result.map((a) => a.id)).toEqual([2]);
  });

  it('filters by query matching slug', () => {
    const result = filterAreas(AREAS, {
      ...defaultCriteria,
      query: 'sector sur',
    });
    expect(result.map((a) => a.id)).toEqual([4]);
  });

  it('filters by grade range and excludes areas without matching grades', () => {
    const idx7c = ORDERED_GRADE_VALUES.indexOf('7c');
    const idx8a = ORDERED_GRADE_VALUES.indexOf('8a');
    const result = filterAreas(AREAS, {
      ...defaultCriteria,
      gradeRange: [idx7c, idx8a],
    });
    expect(result.map((a) => a.id)).toEqual([2, 3]);
  });

  it('supports label-keyed grade objects in addition to enum-keyed objects', () => {
    const labelArea: MockArea = {
      id: 99,
      name: 'Labelled Crag',
      slug: 'labelled-crag',
      grades: { '6a': 3 },
      topos_count: 1,
    };
    const idx6a = ORDERED_GRADE_VALUES.indexOf('6a');
    const result = filterAreas([labelArea], {
      ...defaultCriteria,
      gradeRange: [idx6a, idx6a],
    });
    expect(result.map((a) => a.id)).toEqual([99]);
  });

  it('filters by climbing category indices (0=sport, 1=boulder, 2=multipitch)', () => {
    expect(
      filterAreas(AREAS, { ...defaultCriteria, categories: [0] }).map(
        (a) => a.id,
      ),
    ).toEqual([1, 3]);

    expect(
      filterAreas(AREAS, { ...defaultCriteria, categories: [1] }).map(
        (a) => a.id,
      ),
    ).toEqual([2]);

    expect(
      filterAreas(AREAS, { ...defaultCriteria, categories: [2] }).map(
        (a) => a.id,
      ),
    ).toEqual([1, 4]);

    expect(
      filterAreas(AREAS, { ...defaultCriteria, categories: [1, 2] }).map(
        (a) => a.id,
      ),
    ).toEqual([1, 2, 4]);
  });

  it('filters by each shade option and matches ANY selected shade', () => {
    expect(
      filterAreas(AREAS, { ...defaultCriteria, shade: ['shade_morning'] }).map(
        (a) => a.id,
      ),
    ).toEqual([1]);

    expect(
      filterAreas(AREAS, {
        ...defaultCriteria,
        shade: ['shade_afternoon'],
      }).map((a) => a.id),
    ).toEqual([2]);

    expect(
      filterAreas(AREAS, { ...defaultCriteria, shade: ['shade_all_day'] }).map(
        (a) => a.id,
      ),
    ).toEqual([3]);

    expect(
      filterAreas(AREAS, { ...defaultCriteria, shade: ['sun_all_day'] }).map(
        (a) => a.id,
      ),
    ).toEqual([4]);

    expect(
      filterAreas(AREAS, {
        ...defaultCriteria,
        shade: ['shade_morning', 'sun_all_day'],
      }).map((a) => a.id),
    ).toEqual([1, 4]);
  });

  it('allows areas when an unknown shade key is provided', () => {
    const result = filterAreas(AREAS, {
      ...defaultCriteria,
      shade: ['unknown_shade'],
    });
    expect(result.map((a) => a.id)).toEqual([1, 2, 3, 4]);
  });

  it('filters by toposOnly when enabled', () => {
    const result = filterAreas(AREAS, {
      ...defaultCriteria,
      toposOnly: true,
    });
    expect(result.map((a) => a.id)).toEqual([1, 3, 4]);
  });

  it('combines query, grade range, categories, shade, and toposOnly together', () => {
    const idx6a = ORDERED_GRADE_VALUES.indexOf('6a');
    const idx7a = ORDERED_GRADE_VALUES.indexOf('7a');
    const result = filterAreas(AREAS, {
      query: 'chorro',
      gradeRange: [idx6a, idx7a],
      categories: [0],
      shade: ['shade_morning', 'shade_all_day'],
      toposOnly: true,
    });
    expect(result.map((a) => a.id)).toEqual([1]);
  });
});
