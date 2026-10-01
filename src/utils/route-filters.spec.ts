import { describe, expect, it } from 'vitest';

import {
  ClimbingKinds,
  ORDERED_GRADE_VALUES,
  RouteWithExtras,
  VERTICAL_LIFE_GRADES,
} from '../models';

import {
  categoryMatchesRoute,
  filterRoutes,
  gradeMatchesRoute,
  routesSortByGrade,
  textMatchesRoute,
} from './route-filters';

describe('route-filters', () => {
  const sampleRoutes: RouteWithExtras[] = [
    {
      id: '1',
      name: 'La Dura Dura',
      grade: VERTICAL_LIFE_GRADES.G9bPlus, // 9b+
      climbing_kind: ClimbingKinds.SPORT,
    } as RouteWithExtras,
    {
      id: '2',
      name: 'Silence',
      grade: VERTICAL_LIFE_GRADES.G9c, // 9c
      climbing_kind: ClimbingKinds.SPORT,
    } as RouteWithExtras,
    {
      id: '3',
      name: 'Burden of Dreams',
      grade: VERTICAL_LIFE_GRADES.G9aPlus, // 9a+
      climbing_kind: ClimbingKinds.BOULDER,
    } as RouteWithExtras,
    {
      id: '4',
      name: 'Multi Pitch Classic',
      grade: VERTICAL_LIFE_GRADES.G6a, // 6a
      climbing_kind: ClimbingKinds.MULTIPITCH,
    } as RouteWithExtras,
  ];

  describe('textMatchesRoute', () => {
    it('returns true when search query is empty', () => {
      expect(textMatchesRoute(sampleRoutes[0], '')).toBe(true);
    });

    it('matches by route name (case and accent insensitive)', () => {
      expect(textMatchesRoute(sampleRoutes[0], 'dura')).toBe(true);
      expect(textMatchesRoute(sampleRoutes[1], 'silence')).toBe(true);
      expect(textMatchesRoute(sampleRoutes[0], 'nonexistent')).toBe(false);
    });

    it('matches by grade label in query', () => {
      expect(textMatchesRoute(sampleRoutes[0], '9b+')).toBe(true);
      expect(textMatchesRoute(sampleRoutes[3], '6a')).toBe(true);
    });
  });

  describe('gradeMatchesRoute', () => {
    it('returns true for default full grade range [0, ORDERED_GRADE_VALUES.length - 1]', () => {
      expect(
        gradeMatchesRoute(sampleRoutes[0], 0, ORDERED_GRADE_VALUES.length - 1),
      ).toBe(true);
    });

    it('filters routes correctly within a partial grade range', () => {
      const idx9bPlus = ORDERED_GRADE_VALUES.indexOf('9b+');
      const idx9c = ORDERED_GRADE_VALUES.indexOf('9c');

      expect(
        gradeMatchesRoute(sampleRoutes[0], idx9bPlus, idx9c), // La Dura Dura (9b+)
      ).toBe(true);
      expect(
        gradeMatchesRoute(sampleRoutes[3], idx9bPlus, idx9c), // 6a route
      ).toBe(false);
    });

    it('supports precomputed allowedLabelsSet', () => {
      const allowedSet = new Set(['9c']);

      expect(
        gradeMatchesRoute(sampleRoutes[1], 1, 5, allowedSet), // Silence (9c)
      ).toBe(true);
      expect(
        gradeMatchesRoute(sampleRoutes[0], 1, 5, allowedSet), // La Dura Dura (9b+)
      ).toBe(false);
    });

    it('allows routes without grade label or with project label', () => {
      const projectRoute = { id: '5', name: 'Project', grade: VERTICAL_LIFE_GRADES.G0 } as RouteWithExtras;
      expect(gradeMatchesRoute(projectRoute, 5, 10)).toBe(true);
    });
  });

  describe('categoryMatchesRoute', () => {
    it('returns true when categories array is empty', () => {
      expect(categoryMatchesRoute(sampleRoutes[0], [])).toBe(true);
    });

    it('filters by category accurately (0: sport, 1: boulder, 2: multipitch)', () => {
      expect(categoryMatchesRoute(sampleRoutes[0], [0])).toBe(true); // Sport
      expect(categoryMatchesRoute(sampleRoutes[0], [1])).toBe(false); // Sport checked against Boulder

      expect(categoryMatchesRoute(sampleRoutes[2], [1])).toBe(true); // Boulder
      expect(categoryMatchesRoute(sampleRoutes[3], [2])).toBe(true); // Multipitch
    });
  });

  describe('filterRoutes', () => {
    it('returns all routes with default options', () => {
      const filtered = filterRoutes(sampleRoutes, {
        query: '',
        gradeRange: [0, ORDERED_GRADE_VALUES.length - 1],
        categories: [],
      });
      expect(filtered).toHaveLength(sampleRoutes.length);
    });

    it('filters routes combining query, grade range, and category', () => {
      const filtered = filterRoutes(sampleRoutes, {
        query: 'dura',
        gradeRange: [0, ORDERED_GRADE_VALUES.length - 1],
        categories: [0], // Sport
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('La Dura Dura');
    });

    it('returns empty array if no routes match category and query', () => {
      const filtered = filterRoutes(sampleRoutes, {
        query: 'dura',
        gradeRange: [0, ORDERED_GRADE_VALUES.length - 1],
        categories: [1], // Boulder only
      });
      expect(filtered).toHaveLength(0);
    });
  });

  describe('routesSortByGrade', () => {
    it('sorts routes ascending by numeric grade', () => {
      const sorted = [...sampleRoutes].sort(routesSortByGrade);
      expect(sorted[0].name).toBe('Multi Pitch Classic'); // grade 6a
      expect(sorted[sorted.length - 1].name).toBe('Silence'); // grade 9c
    });
  });
});
