import { describe, expect, it } from 'vitest';

import { TopoPath, TopoPoint, TopoRouteWithRoute } from '../../models';

import {
  areTopoPathsEqual,
  buildPathsToUpdate,
  buildRoutePathsMeta,
  clampNormalized,
  clampPoint,
  clonePathsMap,
  cloneTopoPath,
  cloneTopoPoint,
  computeCenteredTranslation,
  computeFitScale,
  computePathCentroid,
  distanceSquared,
  type EditorPathEntry,
  filterModifiedIndoorRoutes,
  findNearestPointIndex,
  findNearestSegmentIndex,
  formatSvgPoints,
  insertPointAtSegment,
  normalizeClientPoint,
  parseRouteId,
  pointToSegmentDistanceSquared,
  serializeTopoPath,
} from './topo-path-editor.utils';

function makeTopoRoute(
  routeId: string | number,
  color?: string | null,
): TopoRouteWithRoute {
  return {
    topo_id: 1,
    route_id: routeId,
    number: 1,
    path: null,
    route: {
      id: routeId,
      name: `Route ${routeId}`,
      slug: `route-${routeId}`,
      grade: 14,
      climbing_kind: 'sport',
      color: color ?? undefined,
    } as TopoRouteWithRoute['route'],
  };
}

describe('topo-path-editor.utils', () => {
  describe('clamping & normalization', () => {
    it('clampNormalized clamps values to [0, 1] and guards non-finite numbers', () => {
      expect(clampNormalized(0.5)).toBe(0.5);
      expect(clampNormalized(-0.25)).toBe(0);
      expect(clampNormalized(1.8)).toBe(1);
      expect(clampNormalized(Number.NaN)).toBe(0);
      expect(clampNormalized(Number.POSITIVE_INFINITY)).toBe(0);
      expect(clampNormalized(Number.NEGATIVE_INFINITY)).toBe(0);
    });

    it('clampPoint clamps coordinates immutably while preserving optional state', () => {
      const original: TopoPoint = { x: -0.5, y: 1.5, state: 'top' };
      const clamped = clampPoint(original);
      expect(clamped).toEqual({ x: 0, y: 1, state: 'top' });
      expect(clamped).not.toBe(original);
      expect(clampPoint({ x: 0.2, y: 0.8 })).toEqual({ x: 0.2, y: 0.8 });
    });

    it('normalizeClientPoint converts screen coords into clamped [0, 1] points', () => {
      const rect = { left: 100, top: 50, width: 200, height: 100 };
      expect(normalizeClientPoint(200, 75, rect)).toEqual({
        x: 0.5,
        y: 0.25,
        state: 'neutral',
      });
      expect(normalizeClientPoint(50, 300, rect)).toEqual({
        x: 0,
        y: 1,
        state: 'neutral',
      });
      expect(
        normalizeClientPoint(100, 100, {
          left: 0,
          top: 0,
          width: 0,
          height: 0,
        }),
      ).toEqual({ x: 0, y: 0, state: 'neutral' });
    });
  });

  describe('geometry, hit-testing & segment insertion', () => {
    it('computeFitScale fits content without exceeding maxScale', () => {
      expect(computeFitScale(500, 400, 1000, 1000)).toBe(0.4);
      expect(computeFitScale(1200, 900, 600, 400)).toBe(1);
      expect(computeFitScale(1200, 900, 600, 400, 2)).toBe(2);
      expect(computeFitScale(0, 400, 1000, 1000)).toBe(1);
    });

    it('computePathCentroid returns bounding-box center or null when empty', () => {
      expect(computePathCentroid([])).toBeNull();
      expect(computePathCentroid([{ x: 0.3, y: 0.7 }])).toEqual({
        x: 0.3,
        y: 0.7,
      });
      expect(
        computePathCentroid([
          { x: 0.1, y: 0.2 },
          { x: 0.9, y: 0.4 },
          { x: 0.5, y: 0.8 },
        ]),
      ).toEqual({ x: 0.5, y: 0.5 });
    });

    it('computeCenteredTranslation centers small content and clamps zoomed content to viewport edges', () => {
      // Content smaller than area -> centered regardless of point
      expect(
        computeCenteredTranslation(
          { x: 0.1, y: 0.1 },
          {
            areaWidth: 800,
            areaHeight: 600,
            contentWidth: 400,
            contentHeight: 300,
            scale: 1,
          },
        ),
      ).toEqual({ x: 200, y: 150 });

      // Content larger than area -> center on midpoint
      expect(
        computeCenteredTranslation(
          { x: 0.5, y: 0.5 },
          {
            areaWidth: 400,
            areaHeight: 300,
            contentWidth: 1000,
            contentHeight: 800,
            scale: 1,
          },
        ),
      ).toEqual({ x: -300, y: -250 });

      // Near top-left corner -> clamped at max (0, 0)
      expect(
        computeCenteredTranslation(
          { x: 0.01, y: 0.01 },
          {
            areaWidth: 400,
            areaHeight: 300,
            contentWidth: 1000,
            contentHeight: 800,
            scale: 1,
          },
        ),
      ).toEqual({ x: 0, y: 0 });

      // Near bottom-right corner -> clamped at min (-600, -500)
      expect(
        computeCenteredTranslation(
          { x: 0.99, y: 0.99 },
          {
            areaWidth: 400,
            areaHeight: 300,
            contentWidth: 1000,
            contentHeight: 800,
            scale: 1,
          },
        ),
      ).toEqual({ x: -600, y: -500 });
    });

    it('computes point and segment distances accurately', () => {
      expect(distanceSquared({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25);
      // Perpendicular distance from (0.5, 0.2) to horizontal segment (0,0)-(1,0) is 0.2 -> sq = 0.04
      expect(
        pointToSegmentDistanceSquared(
          { x: 0.5, y: 0.2 },
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ),
      ).toBeCloseTo(0.04, 10);
      // Degenerate zero-length segment
      expect(
        pointToSegmentDistanceSquared(
          { x: 3, y: 4 },
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ),
      ).toBe(25);
    });

    it('findNearestPointIndex respects distance threshold and empty input', () => {
      const pts: TopoPoint[] = [
        { x: 0.1, y: 0.1 },
        { x: 0.5, y: 0.5 },
        { x: 0.9, y: 0.9 },
      ];
      expect(findNearestPointIndex([], { x: 0.5, y: 0.5 })).toBe(-1);
      expect(findNearestPointIndex(pts, { x: 0.48, y: 0.52 })).toBe(1);
      expect(findNearestPointIndex(pts, { x: 0.48, y: 0.52 }, 0.05)).toBe(1);
      expect(findNearestPointIndex(pts, { x: 0.48, y: 0.52 }, 0.01)).toBe(-1);
      expect(findNearestPointIndex(pts, { x: 0.5, y: 0.5 }, -1)).toBe(-1);
    });

    it('findNearestSegmentIndex finds closest segment and handles <2 points', () => {
      const pts: TopoPoint[] = [
        { x: 0, y: 0 },
        { x: 0.5, y: 0 },
        { x: 0.5, y: 1 },
      ];
      expect(findNearestSegmentIndex([], { x: 0.2, y: 0.2 })).toBe(-1);
      expect(findNearestSegmentIndex([pts[0]], { x: 0.2, y: 0.2 })).toBe(-1);
      expect(findNearestSegmentIndex(pts, { x: 0.25, y: 0.05 }, 0.1)).toBe(0);
      expect(findNearestSegmentIndex(pts, { x: 0.52, y: 0.6 }, 0.1)).toBe(1);
      expect(findNearestSegmentIndex(pts, { x: 0.9, y: 0.9 }, 0.05)).toBe(-1);
    });

    it('insertPointAtSegment inserts clamped copy immutably at segmentIndex + 1', () => {
      const pts: TopoPoint[] = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ];
      const next = insertPointAtSegment(
        pts,
        { x: 0.5, y: 1.4, state: 'match' },
        0,
      );
      expect(next).toEqual([
        { x: 0, y: 0 },
        { x: 0.5, y: 1, state: 'match' },
        { x: 1, y: 1 },
      ]);
      expect(pts).toHaveLength(2);
      expect(next[0]).not.toBe(pts[0]);

      // Out of bounds index clamps cleanly
      expect(insertPointAtSegment(pts, { x: 0.2, y: 0.2 }, -5)).toHaveLength(3);
      expect(insertPointAtSegment(pts, { x: 0.2, y: 0.2 }, 99)[2]).toEqual({
        x: 0.2,
        y: 0.2,
      });
    });

    it('formatSvgPoints scales normalized points into SVG points string', () => {
      expect(formatSvgPoints([], 100, 200)).toBe('');
      expect(
        formatSvgPoints(
          [
            { x: 0.25, y: 0.5 },
            { x: 0.75, y: 1 },
          ],
          100,
          200,
        ),
      ).toBe('25,100 75,200');
    });
  });

  describe('IDs, cloning, comparison & serialization', () => {
    it('parseRouteId converts numeric strings while preserving UUIDs and blanks', () => {
      expect(parseRouteId(42)).toBe(42);
      expect(parseRouteId('42')).toBe(42);
      expect(parseRouteId('uuid-abc-123')).toBe('uuid-abc-123');
      expect(parseRouteId('')).toBe('');
      expect(parseRouteId('   ')).toBe('   ');
    });

    it('clones points, paths, and pathsMap deeply without sharing point references', () => {
      const pt: TopoPoint = { x: 0.2, y: 0.4, state: 'start' };
      const ptCopy = cloneTopoPoint(pt);
      ptCopy.x = 0.9;
      expect(pt.x).toBe(0.2);

      expect(cloneTopoPath(null)).toBeNull();
      const path: TopoPath = { points: [pt], type: 'circle', isTraverse: true };
      const pathCopy = cloneTopoPath(path)!;
      pathCopy.points[0].y = 0.99;
      expect(path.points[0].y).toBe(0.4);

      const tr = makeTopoRoute(1);
      const map = new Map<string | number, EditorPathEntry>([
        [1, { points: [pt], type: 'line', _ref: tr }],
      ]);
      const mapCopy = clonePathsMap(map);
      mapCopy.get(1)!.points[0].x = 0.77;
      expect(map.get(1)!.points[0].x).toBe(0.2);
      expect(mapCopy.get(1)!._ref).toBe(tr);
    });

    it('serializeTopoPath and areTopoPathsEqual normalize defaults and empty paths', () => {
      expect(serializeTopoPath(null)).toBe('');
      expect(serializeTopoPath({ points: [] })).toBe('');

      const a: TopoPath = { points: [{ x: 0.1, y: 0.2 }] };
      const b: TopoPath = {
        points: [{ x: 0.1, y: 0.2 }],
        type: 'line',
        isTraverse: false,
      };
      const c: TopoPath = {
        points: [{ x: 0.1, y: 0.2, state: 'top' }],
        type: 'line',
      };
      expect(areTopoPathsEqual(a, b)).toBe(true);
      expect(areTopoPathsEqual(a, c)).toBe(false);
    });

    it('buildRoutePathsMeta summarizes hasPath and isTraverse flags', () => {
      const tr1 = makeTopoRoute(1);
      const tr2 = makeTopoRoute(2);
      const map = new Map<string | number, EditorPathEntry>([
        [1, { points: [{ x: 0.1, y: 0.2 }], isTraverse: true, _ref: tr1 }],
        [2, { points: [], isTraverse: false, _ref: tr2 }],
      ]);
      const meta = buildRoutePathsMeta(map);
      expect(meta.get(1)).toEqual({ hasPath: true, isTraverse: true });
      expect(meta.get(2)).toEqual({ hasPath: false, isTraverse: false });
    });

    it('buildPathsToUpdate maps indoor/outdoor colors and empties to null', () => {
      const tr1 = makeTopoRoute('r-1', '#ff0000');
      const tr2 = makeTopoRoute('r-2', '#00ff00');
      const map = new Map<string | number, EditorPathEntry>([
        [
          'r-1',
          {
            points: [{ x: 0.2, y: 0.3 }],
            color: '#111111',
            type: 'circle',
            isTraverse: true,
            _ref: tr1,
          },
        ],
        ['r-2', { points: [], _ref: tr2 }],
      ]);

      const indoorPayload = buildPathsToUpdate([tr1, tr2], map, 3, true);
      expect(indoorPayload[0]).toEqual({
        routeId: 'r-1',
        path: {
          points: [{ x: 0.2, y: 0.3 }],
          color: '#ff0000',
          width: 3,
          type: 'circle',
          isTraverse: true,
        },
      });
      expect(indoorPayload[1]).toEqual({ routeId: 'r-2', path: null });

      const outdoorPayload = buildPathsToUpdate([tr1], map, 2, false);
      expect(outdoorPayload[0].path?.color).toBe('#111111');
    });

    it('filterModifiedIndoorRoutes only keeps dirty, new, linked, or reordered routes', () => {
      const tr1 = makeTopoRoute('r-1');
      const tr2 = makeTopoRoute('r-2');
      const tr3 = makeTopoRoute('r-3');
      const unchangedPath: TopoPath = {
        points: [{ x: 0.1, y: 0.1 }],
        type: 'circle',
        isTraverse: false,
      };
      const modifiedPath: TopoPath = {
        points: [{ x: 0.2, y: 0.2 }],
        type: 'circle',
        isTraverse: false,
      };
      const initial = new Map<string, string>([
        ['r-1', serializeTopoPath(unchangedPath)],
        ['r-2', serializeTopoPath(unchangedPath)],
        ['r-3', ''],
      ]);
      const updates = [
        { routeId: 'r-1', path: unchangedPath },
        { routeId: 'r-2', path: modifiedPath },
        { routeId: 'r-3', path: null },
      ];

      const dirty = filterModifiedIndoorRoutes(
        [tr1, tr2, tr3],
        updates,
        initial,
        {
          routesReordered: false,
          newRouteIds: new Set(),
          newlyLinkedRouteIds: new Set(['r-3']),
        },
      );
      expect(dirty.map((r) => r.route_id)).toEqual(['r-2', 'r-3']);

      const allWhenReordered = filterModifiedIndoorRoutes(
        [tr1, tr2, tr3],
        updates,
        initial,
        {
          routesReordered: true,
          newRouteIds: new Set(),
          newlyLinkedRouteIds: new Set(),
        },
      );
      expect(allWhenReordered).toHaveLength(3);
    });
  });
});
