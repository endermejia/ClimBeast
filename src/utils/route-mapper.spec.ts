import { describe, expect, it } from 'vitest';

import { hasTopoPath, mapRouteTopos } from './route-mapper';

describe('hasTopoPath & mapRouteTopos', () => {
  it('detects whether a topo path contains drawn points', () => {
    expect(hasTopoPath(null)).toBe(false);
    expect(hasTopoPath(undefined)).toBe(false);
    expect(hasTopoPath({})).toBe(false);
    expect(hasTopoPath({ points: [] })).toBe(false);
    expect(hasTopoPath({ points: [{ x: 0.2, y: 0.8 }] })).toBe(true);
  });

  it('maps topo entries with has_path and deduplicates by id', () => {
    const result = mapRouteTopos([
      { path: null, topo: { id: 1, name: 'Sin linea', slug: 'sin-linea' } },
      {
        path: { points: [{ x: 0.1, y: 0.9 }] },
        topo: { id: 2, name: 'Con linea', slug: 'con-linea' },
      },
      {
        path: null,
        topo: { id: 2, name: 'Con linea', slug: 'con-linea' },
      },
      { topo: { id: 3, name: 'Legacy sin campo path', slug: 'legacy' } },
      { path: null, topo: null },
    ]);

    expect(result).toEqual([
      { id: 1, name: 'Sin linea', slug: 'sin-linea', has_path: false },
      { id: 2, name: 'Con linea', slug: 'con-linea', has_path: true },
      { id: 3, name: 'Legacy sin campo path', slug: 'legacy' },
    ]);
  });
});
