import { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { Database, UserProfileBasicDto } from '../models';

import {
  addLoadedTab,
  hydrateOutdoorAscentsFeed,
  mergePaginatedItems,
} from './ascent-feed-helpers';

function createMockSupabaseClient(profiles: UserProfileBasicDto[] | null) {
  const inMock = vi.fn().mockResolvedValue({ data: profiles, error: null });
  const selectMock = vi.fn().mockReturnValue({ in: inMock });
  const fromMock = vi.fn().mockReturnValue({ select: selectMock });

  return {
    client: { from: fromMock } as unknown as SupabaseClient<Database>,
    fromMock,
    selectMock,
    inMock,
  };
}

describe('hydrateOutdoorAscentsFeed', () => {
  it('returns empty array and skips profile query when rawAscents is empty or nullish', async () => {
    const { client, fromMock } = createMockSupabaseClient([]);

    expect(await hydrateOutdoorAscentsFeed(client, [])).toEqual([]);
    expect(await hydrateOutdoorAscentsFeed(client, null)).toEqual([]);
    expect(await hydrateOutdoorAscentsFeed(client, undefined)).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('hydrates deduplicated user profiles and maps route crag/area fields', async () => {
    const profiles: UserProfileBasicDto[] = [
      { id: 'u1', name: 'Alice', avatar: 'alice.png' },
      { id: 'u2', name: 'Bob', avatar: null },
    ];
    const { client, fromMock, selectMock, inMock } =
      createMockSupabaseClient(profiles);

    const rawAscents = [
      {
        id: 101,
        user_id: 'u1',
        date: '2026-01-10',
        route: {
          id: 10,
          name: 'La Rambla',
          slug: 'la-rambla',
          crag: {
            id: 2,
            slug: 'el-pati',
            name: 'El Pati',
            area: { slug: 'siurana', name: 'Siurana' },
          },
        },
      },
      {
        id: 102,
        user_id: 'u1',
        date: '2026-01-09',
        route: {
          id: 11,
          name: 'Kale Borroka',
          slug: 'kale-borroka',
          crag: {
            id: 2,
            slug: 'el-pati',
            name: 'El Pati',
            area: { slug: 'siurana', name: 'Siurana' },
          },
        },
      },
      {
        id: 103,
        user_id: 'u2',
        date: '2026-01-08',
        route: null,
      },
    ];

    const result = await hydrateOutdoorAscentsFeed(client, rawAscents);

    expect(fromMock).toHaveBeenCalledWith('user_profiles');
    expect(selectMock).toHaveBeenCalledWith('id, name, avatar');
    expect(inMock).toHaveBeenCalledWith('id', ['u1', 'u2']);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      id: 101,
      user_id: 'u1',
      kind: 'ascent',
      user: profiles[0],
      route: {
        id: 10,
        name: 'La Rambla',
        crag_slug: 'el-pati',
        crag_name: 'El Pati',
        area_slug: 'siurana',
        area_name: 'Siurana',
      },
    });
    expect(result[1]).toMatchObject({
      id: 102,
      user_id: 'u1',
      kind: 'ascent',
      user: profiles[0],
    });
    expect(result[2]).toMatchObject({
      id: 103,
      user_id: 'u2',
      kind: 'ascent',
      user: profiles[1],
      route: undefined,
    });
  });

  it('sets user to undefined when profile is missing or profiles response is null', async () => {
    const { client } = createMockSupabaseClient([
      { id: 'u1', name: 'Alice', avatar: null },
    ]);

    const result = await hydrateOutdoorAscentsFeed(client, [
      {
        id: 201,
        user_id: 'missing-user',
        route: {
          id: 5,
          crag: { slug: 'sector-a', name: 'Sector A', area: null },
        },
      },
    ]);

    expect(result[0]).toMatchObject({
      id: 201,
      user_id: 'missing-user',
      kind: 'ascent',
      user: undefined,
      route: {
        id: 5,
        crag_slug: 'sector-a',
        crag_name: 'Sector A',
        area_slug: undefined,
        area_name: undefined,
      },
    });

    const nullClient = createMockSupabaseClient(null).client;
    const nullResult = await hydrateOutdoorAscentsFeed(nullClient, [
      { id: 202, user_id: 'u1', route: undefined },
    ]);
    expect(nullResult[0]).toMatchObject({
      id: 202,
      kind: 'ascent',
      user: undefined,
      route: undefined,
    });
  });

  it('skips querying user_profiles when no ascent has a user_id', async () => {
    const { client, fromMock } = createMockSupabaseClient([]);

    const result = await hydrateOutdoorAscentsFeed(client, [
      { id: 301, user_id: null, route: null },
    ]);

    expect(fromMock).not.toHaveBeenCalled();
    expect(result[0]).toMatchObject({
      id: 301,
      user_id: null,
      kind: 'ascent',
      user: undefined,
    });
  });
});

describe('mergePaginatedItems', () => {
  it('replaces previous items on page 0', () => {
    const prev = [{ id: 1 }, { id: 2 }];
    const incoming = [{ id: 10 }, { id: 11 }];

    const merged = mergePaginatedItems(prev, incoming, 0);
    expect(merged).toEqual([{ id: 10 }, { id: 11 }]);
    expect(merged).not.toBe(incoming);
  });

  it('appends only non-duplicate items on page > 0 (comparing ids as strings)', () => {
    const prev = [{ id: 1 }, { id: '2' }];
    const incoming = [{ id: '1' }, { id: 2 }, { id: 3 }, { id: '4' }];

    const merged = mergePaginatedItems(prev, incoming, 1);
    expect(merged).toEqual([{ id: 1 }, { id: '2' }, { id: 3 }, { id: '4' }]);
  });

  it('returns the same prev reference on page > 0 when incoming is empty or all duplicates', () => {
    const prev = [{ id: 1 }, { id: 2 }];

    expect(mergePaginatedItems(prev, [], 1)).toBe(prev);
    expect(mergePaginatedItems(prev, [{ id: 1 }, { id: 2 }], 2)).toBe(prev);
  });
});

describe('addLoadedTab', () => {
  it('returns the exact same Set reference when tab is already present', () => {
    const current = new Set([0, 1]);
    const next = addLoadedTab(current, 1);

    expect(next).toBe(current);
    expect([...next]).toEqual([0, 1]);
  });

  it('returns a new cloned Set containing the added tab without mutating the original', () => {
    const current = new Set([0]);
    const next = addLoadedTab(current, 2);

    expect(next).not.toBe(current);
    expect(current.has(2)).toBe(false);
    expect([...next]).toEqual([0, 2]);
  });
});
