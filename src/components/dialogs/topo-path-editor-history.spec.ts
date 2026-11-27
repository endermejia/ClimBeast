import { describe, expect, it } from 'vitest';

import { TopoRouteWithRoute } from '../../models';

import {
  applyPathsSnapshot,
  arePathsSnapshotsEqual,
  canRedo,
  canUndo,
  clearHistory,
  createHistoryState,
  createPathsSnapshot,
  DEFAULT_HISTORY_MAX_SIZE,
  pushHistory,
  redoHistory,
  undoHistory,
} from './topo-path-editor-history';
import { type EditorPathEntry } from './topo-path-editor.utils';

function makeRoute(id: number): TopoRouteWithRoute {
  return {
    topo_id: 1,
    route_id: id,
    number: id,
    path: null,
    route: {
      id,
      name: `Route ${id}`,
      slug: `route-${id}`,
      grade: 14,
      climbing_kind: 'sport',
    } as TopoRouteWithRoute['route'],
  };
}

describe('topo-path-editor-history', () => {
  describe('generic immutable history stack', () => {
    it('initializes with empty past and future and default maxSize', () => {
      const state = createHistoryState('v0');
      expect(state.present).toBe('v0');
      expect(state.past).toEqual([]);
      expect(state.future).toEqual([]);
      expect(state.maxSize).toBe(DEFAULT_HISTORY_MAX_SIZE);
      expect(canUndo(state)).toBe(false);
      expect(canRedo(state)).toBe(false);
    });

    it('pushes states immutably and supports undo/redo traversal', () => {
      const s0 = createHistoryState('v0');
      const s1 = pushHistory(s0, 'v1');
      const s2 = pushHistory(s1, 'v2');

      expect(s0.past).toEqual([]);
      expect(s2.past).toEqual(['v0', 'v1']);
      expect(s2.present).toBe('v2');
      expect(canUndo(s2)).toBe(true);
      expect(canRedo(s2)).toBe(false);

      const u1 = undoHistory(s2);
      expect(u1.present).toBe('v1');
      expect(u1.past).toEqual(['v0']);
      expect(u1.future).toEqual(['v2']);
      expect(canRedo(u1)).toBe(true);

      const u2 = undoHistory(u1);
      expect(u2.present).toBe('v0');
      expect(u2.past).toEqual([]);
      expect(u2.future).toEqual(['v1', 'v2']);
      expect(canUndo(u2)).toBe(false);

      // No-op at start boundary
      expect(undoHistory(u2)).toBe(u2);

      const r1 = redoHistory(u2);
      expect(r1.present).toBe('v1');
      expect(r1.past).toEqual(['v0']);
      expect(r1.future).toEqual(['v2']);

      const r2 = redoHistory(r1);
      expect(r2.present).toBe('v2');
      expect(r2.future).toEqual([]);
      expect(redoHistory(r2)).toBe(r2);
    });

    it('clears redo future when pushing after undo', () => {
      let state = createHistoryState(0);
      state = pushHistory(state, 1);
      state = pushHistory(state, 2);
      state = undoHistory(state);
      expect(canRedo(state)).toBe(true);

      const branched = pushHistory(state, 99);
      expect(branched.present).toBe(99);
      expect(branched.past).toEqual([0, 1]);
      expect(branched.future).toEqual([]);
      expect(canRedo(branched)).toBe(false);
    });

    it('skips push when isEqual reports unchanged state', () => {
      const s0 = createHistoryState({ value: 1 });
      const same = pushHistory(s0, { value: 1 }, (a, b) => a.value === b.value);
      expect(same).toBe(s0);
      expect(canUndo(same)).toBe(false);
    });

    it('enforces maxSize by discarding oldest past entries', () => {
      let state = createHistoryState(0, 3);
      for (let i = 1; i <= 5; i++) {
        state = pushHistory(state, i);
      }
      expect(state.present).toBe(5);
      expect(state.past).toEqual([2, 3, 4]);
      expect(state.past).toHaveLength(3);
    });

    it('handles maxSize = 0 and negative maxSize safely', () => {
      let state = createHistoryState('a', -5);
      expect(state.maxSize).toBe(0);
      state = pushHistory(state, 'b');
      expect(state.present).toBe('b');
      expect(state.past).toEqual([]);
      expect(canUndo(state)).toBe(false);
    });

    it('clearHistory empties past and future and optionally replaces present', () => {
      let state = createHistoryState('a');
      state = pushHistory(state, 'b');
      state = undoHistory(state);

      const kept = clearHistory(state);
      expect(kept.present).toBe('a');
      expect(kept.past).toEqual([]);
      expect(kept.future).toEqual([]);

      const replaced = clearHistory(state, 'z');
      expect(replaced.present).toBe('z');
    });
  });

  describe('paths snapshot helpers', () => {
    it('creates deep-cloned snapshots isolated from subsequent in-place mutations', () => {
      const tr = makeRoute(1);
      const map = new Map<string | number, EditorPathEntry>([
        [
          1,
          {
            points: [{ x: 0.2, y: 0.8, state: 'start' }],
            type: 'line',
            isTraverse: false,
            _ref: tr,
          },
        ],
      ]);

      const snap1 = createPathsSnapshot(map);
      // Mutate original point in place (simulating mouse drag)
      map.get(1)!.points[0].x = 0.6;
      const snap2 = createPathsSnapshot(map);

      expect(snap1.get(1)!.points[0].x).toBe(0.2);
      expect(snap2.get(1)!.points[0].x).toBe(0.6);
      expect(arePathsSnapshotsEqual(snap1, snap2)).toBe(false);
      expect(arePathsSnapshotsEqual(snap1, snap1)).toBe(true);
    });

    it('detects metadata differences in arePathsSnapshotsEqual', () => {
      const tr = makeRoute(1);
      const mapA = new Map<string | number, EditorPathEntry>([
        [1, { points: [{ x: 0.1, y: 0.1 }], type: 'line', _ref: tr }],
      ]);
      const mapB = new Map<string | number, EditorPathEntry>([
        [1, { points: [{ x: 0.1, y: 0.1 }], type: 'circle', _ref: tr }],
      ]);

      expect(
        arePathsSnapshotsEqual(
          createPathsSnapshot(mapA),
          createPathsSnapshot(mapB),
        ),
      ).toBe(false);
    });

    it('applyPathsSnapshot restores pathsMap and synchronizes topoRoutes .path references', () => {
      const tr1 = makeRoute(1);
      const tr2 = makeRoute(2);
      tr2.path = { points: [{ x: 0.9, y: 0.9 }], type: 'line' };

      const snapshot = new Map([
        [
          1,
          {
            points: [{ x: 0.3, y: 0.7, state: 'top' as const }],
            type: 'circle' as const,
            isTraverse: true,
          },
        ],
        [
          999,
          {
            points: [{ x: 0.1, y: 0.1 }],
            type: 'line' as const,
          },
        ],
      ]);

      const restored = applyPathsSnapshot(snapshot, [tr1, tr2]);

      expect(restored.has(1)).toBe(true);
      expect(restored.has(999)).toBe(false);
      expect(restored.get(1)!._ref).toBe(tr1);
      expect(tr1.path).toEqual({
        points: [{ x: 0.3, y: 0.7, state: 'top' }],
        color: undefined,
        width: undefined,
        type: 'circle',
        isTraverse: true,
      });
      // Route 2 wasn't in snapshot -> its path must be reset to null
      expect(tr2.path).toBeNull();
    });
  });
});
