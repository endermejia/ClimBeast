import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TuiDialogService } from '@taiga-ui/core';

import { TranslateService, TranslateStore } from '@ngx-translate/core';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { IS_BROWSER } from '../app/is-browser';
import { MockSupabaseService } from '../testing/mock-supabase.service';
import { CacheService } from './cache.service';
import { RoutesService } from './routes.service';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

const MOCK_TRANSLATE = {
  instant: (k: string) => k,
  get: (k: string) => k,
  onTranslationChange: {
    subscribe: () => ({
      unsubscribe: () => {
        /* noop */
      },
    }),
  },
};

function createMockToast() {
  return {
    success: vi.fn(),
    error: vi.fn(),
    showWithUndo: vi.fn(),
  };
}

describe('RoutesService', () => {
  let service: RoutesService;
  let mockSupabase: MockSupabaseService;
  let mockToast: ReturnType<typeof createMockToast>;

  beforeEach(() => {
    mockSupabase = new MockSupabaseService();
    mockSupabase.setSession({
      access_token: 'tok',
      refresh_token: 'ref',
      expires_in: 3600,
      expires_at: Date.now() + 3600000,
      token_type: 'bearer',
      user: { id: 'user-1', email: 'test@test.com' } as never,
    });
    mockToast = createMockToast();

    TestBed.configureTestingModule({
      providers: [
        RoutesService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        { provide: SupabaseService, useValue: mockSupabase },
        {
          provide: CacheService,
          useValue: {
            fetchOrCache: vi.fn((_k: string, fn: () => Promise<unknown>) =>
              fn(),
            ),
          },
        },
        { provide: ToastService, useValue: mockToast },
        { provide: TuiDialogService, useValue: { open: vi.fn() } },
        { provide: TranslateService, useValue: MOCK_TRANSLATE },
        { provide: TranslateStore, useValue: {} },
      ],
    });
    service = TestBed.inject(RoutesService);
  });

  describe('loading signal', () => {
    it('defaults to false', () => {
      expect(service.loading()).toBe(false);
    });
  });

  describe('getRoutesByAreaSimple', () => {
    it('returns empty on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          RoutesService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: IS_BROWSER, useValue: false },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: CacheService, useValue: { fetchOrCache: vi.fn() } },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(RoutesService);
      expect(await svc.getRoutesByAreaSimple(1)).toEqual([]);
    });
  });

  describe('searchRoutes', () => {
    it('returns empty for short query', async () => {
      const result = await service.searchRoutes('a');
      expect(result).toEqual([]);
    });

    it('returns empty on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          RoutesService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: IS_BROWSER, useValue: false },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: CacheService, useValue: { fetchOrCache: vi.fn() } },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(RoutesService);
      expect(await svc.searchRoutes('test')).toEqual([]);
    });
  });

  describe('create', () => {
    it('returns null on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          RoutesService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: IS_BROWSER, useValue: false },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: CacheService, useValue: { fetchOrCache: vi.fn() } },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(RoutesService);
      expect(
        await svc.create({
          name: 'test',
          crag_id: 1,
          slug: 'test',
          grade: 1,
          climbing_kind: 'sport',
        }),
      ).toBeNull();
    });
  });

  describe('update', () => {
    it('returns null on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          RoutesService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: IS_BROWSER, useValue: false },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: CacheService, useValue: { fetchOrCache: vi.fn() } },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(RoutesService);
      expect(await svc.update(1, { name: 'updated' })).toBeNull();
    });
  });

  describe('delete', () => {
    it('returns false on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          RoutesService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: IS_BROWSER, useValue: false },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: CacheService, useValue: { fetchOrCache: vi.fn() } },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(RoutesService);
      expect(await svc.delete(1)).toBe(false);
    });
  });

  describe('getById', () => {
    it('returns null data on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          RoutesService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: IS_BROWSER, useValue: false },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: CacheService, useValue: { fetchOrCache: vi.fn() } },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(RoutesService);
      const result = await svc.getById(1);
      expect(result.data).toBeNull();
    });
  });

  describe('unify', () => {
    it('returns false on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          RoutesService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: IS_BROWSER, useValue: false },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: CacheService, useValue: { fetchOrCache: vi.fn() } },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(RoutesService);
      expect(await svc.unify(1, [2, 3], 'merged')).toBe(false);
    });
  });

  describe('setRouteEquippers', () => {
    it('resolves existing and newly created equippers, quotes PostgREST filters, deduplicates, and returns resolved DTOs', async () => {
      let capturedOr = '';
      let insertedJoinRows: unknown[] = [];

      mockSupabase.client.from = ((table: string) => {
        if (table === 'equippers') {
          return {
            select: () => ({
              or: (query: string) => {
                capturedOr = query;
                return Promise.resolve({
                  data: [
                    {
                      id: 10,
                      name: 'Juan (Pro)',
                      created_at: '',
                      description: null,
                      user_id: null,
                    },
                  ],
                  error: null,
                });
              },
            }),
            insert: (payloads: { name: string }[]) => ({
              select: () =>
                Promise.resolve({
                  data: payloads.map((p, idx) => ({
                    id: 20 + idx,
                    name: p.name,
                    created_at: '',
                    description: null,
                    user_id: null,
                  })),
                  error: null,
                }),
            }),
          };
        }
        if (table === 'route_equippers') {
          return {
            delete: () => ({
              eq: () => Promise.resolve({ data: null, error: null }),
            }),
            insert: (rows: unknown[]) => {
              insertedJoinRows = rows;
              return Promise.resolve({ data: null, error: null });
            },
          };
        }
        return {};
      }) as unknown as typeof mockSupabase.client.from;

      const resolved = await service.setRouteEquippers(42, [
        'Juan (Pro)',
        'Nueva Equipadora',
        {
          id: 10,
          name: 'Juan (Pro)',
          created_at: '',
          description: null,
          user_id: null,
        },
      ]);

      expect(capturedOr).toBe(
        'name.ilike."Juan (Pro)",name.ilike."Nueva Equipadora"',
      );
      expect(resolved.map((e) => ({ id: e.id, name: e.name }))).toEqual([
        { id: 10, name: 'Juan (Pro)' },
        { id: 20, name: 'Nueva Equipadora' },
      ]);
      expect(insertedJoinRows).toEqual([
        { route_id: 42, equipper_id: 10 },
        { route_id: 42, equipper_id: 20 },
      ]);
    });
  });

  describe('getRoutesByAreaWithDetails', () => {
    it('maps topos, equippers, and user-specific ascent/like/project fields', async () => {
      let capturedSelect = '';

      mockSupabase.client.from = ((table: string) => {
        if (table === 'routes') {
          return {
            select: (cols: string) => {
              capturedSelect = cols;
              return {
                eq: () => ({
                  range: () =>
                    Promise.resolve({
                      data: [
                        {
                          id: 101,
                          name: 'Vía Otro Sector',
                          slug: 'via-otro-sector',
                          grade: 14,
                          climbing_kind: 'sport',
                          height: 22,
                          crag_id: 20,
                          eight_anu_route_slugs: null,
                          liked: [
                            { id: 1, user_id: 'user-1' },
                            { id: 2, user_id: 'other-user' },
                          ],
                          project: [{ id: 3, user_id: 'other-user' }],
                          ascents: [
                            { rate: 4, type: 'rp' },
                            { rate: 5, type: 'os' },
                            { rate: null, type: 'attempt' },
                          ],
                          own_ascent: [
                            {
                              id: 9,
                              user_id: 'user-1',
                              type: 'rp',
                              rate: 4,
                              date: '2026-01-01',
                            },
                            {
                              id: 10,
                              user_id: 'other-user',
                              type: 'os',
                              rate: 5,
                              date: '2026-01-02',
                            },
                          ],
                          topo_routes: [
                            {
                              topo: {
                                id: 50,
                                name: 'Muro Sur',
                                slug: 'muro-sur',
                              },
                            },
                          ],
                          route_equippers: [
                            {
                              equipper: {
                                id: 7,
                                name: 'Equi Pador',
                                created_at: '',
                                description: null,
                                user_id: null,
                              },
                            },
                          ],
                          crag: {
                            id: 20,
                            name: 'Otro Sector',
                            slug: 'otro-sector',
                            area_id: 5,
                            area: { id: 5, name: 'Mi Area', slug: 'mi-area' },
                          },
                        },
                      ],
                      error: null,
                    }),
                }),
              };
            },
          };
        }
        return {};
      }) as unknown as typeof mockSupabase.client.from;

      const routes = await service.getRoutesByAreaWithDetails(5);

      expect(capturedSelect).toContain(
        'topo_routes(path, topo:topos(id, name, slug))',
      );
      expect(capturedSelect).toContain(
        'route_equippers(equipper:equippers(*))',
      );
      expect(routes).toHaveLength(1);
      expect(routes[0].topos).toEqual([
        { id: 50, name: 'Muro Sur', slug: 'muro-sur' },
      ]);
      expect(routes[0].equippers?.map((e) => e.name)).toEqual(['Equi Pador']);
      expect(routes[0].liked).toBe(true);
      expect(routes[0].project).toBe(false);
      expect(routes[0].climbed).toBe(true);
      expect(routes[0].ascent_count).toBe(2);
      expect(routes[0].rating).toBe(4.5);

      const filtered = await service.getRoutesByAreaWithDetails(5, {
        filterTopos: true,
      });
      expect(filtered[0].topos).toEqual([]);
    });
  });

  describe('unify', () => {
    it('copies drawn topo path from source route to target route when target has no line on the same topo', async () => {
      const drawnPath = {
        points: [
          { x: 0.2, y: 0.8 },
          { x: 0.4, y: 0.2 },
        ],
      };
      const updateCalls: { payload: unknown; id: number }[] = [];
      const deletedIds: number[][] = [];
      const rpcCalls: { fn: string; params: unknown }[] = [];

      mockSupabase.client.from = vi.fn((table: string) => {
        if (table === 'topo_routes') {
          return {
            select: () => ({
              in: () =>
                Promise.resolve({
                  data: [
                    {
                      id: 100,
                      topo_id: 10,
                      route_id: 1,
                      number: 0,
                      path: null,
                    },
                    {
                      id: 101,
                      topo_id: 10,
                      route_id: 2,
                      number: 3,
                      path: drawnPath,
                    },
                  ],
                  error: null,
                }),
            }),
            update: (payload: unknown) => ({
              eq: (_col: string, id: number) => {
                updateCalls.push({ payload, id });
                return Promise.resolve({ error: null });
              },
            }),
            delete: () => ({
              in: (_col: string, ids: number[]) => {
                deletedIds.push(ids);
                return Promise.resolve({ error: null });
              },
            }),
          };
        }
        return {};
      }) as unknown as typeof mockSupabase.client.from;

      mockSupabase.client.rpc = vi.fn((fn: string, params: unknown) => {
        rpcCalls.push({ fn, params });
        return Promise.resolve({ data: null, error: null });
      }) as unknown as typeof mockSupabase.client.rpc;

      const ok = await service.unify(1, [2], 'Unified Route');

      expect(ok).toBe(true);
      expect(updateCalls).toEqual([
        { id: 100, payload: { path: drawnPath, number: 3 } },
      ]);
      expect(deletedIds).toEqual([]);
      expect(rpcCalls).toEqual([
        {
          fn: 'unify_routes',
          params: {
            p_target_route_id: 1,
            p_source_route_ids: [2],
            p_new_name: 'Unified Route',
          },
        },
      ]);
    });

    it('deduplicates multiple source routes in the same topo by keeping the drawn line', async () => {
      const drawnPath = {
        points: [
          { x: 0.5, y: 0.9 },
          { x: 0.5, y: 0.1 },
        ],
      };
      const updateCalls: { payload: unknown; id: number }[] = [];
      const deletedIds: number[][] = [];

      mockSupabase.client.from = vi.fn((table: string) => {
        if (table === 'topo_routes') {
          return {
            select: () => ({
              in: () =>
                Promise.resolve({
                  data: [
                    {
                      id: 200,
                      topo_id: 20,
                      route_id: 2,
                      number: 0,
                      path: { points: [] },
                    },
                    {
                      id: 201,
                      topo_id: 20,
                      route_id: 3,
                      number: 4,
                      path: drawnPath,
                    },
                  ],
                  error: null,
                }),
            }),
            update: (payload: unknown) => ({
              eq: (_col: string, id: number) => {
                updateCalls.push({ payload, id });
                return Promise.resolve({ error: null });
              },
            }),
            delete: () => ({
              in: (_col: string, ids: number[]) => {
                deletedIds.push(ids);
                return Promise.resolve({ error: null });
              },
            }),
          };
        }
        return {};
      }) as unknown as typeof mockSupabase.client.from;

      mockSupabase.client.rpc = vi.fn(() =>
        Promise.resolve({ data: null, error: null }),
      ) as unknown as typeof mockSupabase.client.rpc;

      const ok = await service.unify(1, [2, 3], 'Unified Route');

      expect(ok).toBe(true);
      expect(updateCalls).toEqual([]);
      expect(deletedIds).toEqual([[200]]);
    });

    it('keeps target drawn line untouched when both target and source have drawn paths on the same topo', async () => {
      const targetPath = {
        points: [
          { x: 0.1, y: 0.9 },
          { x: 0.1, y: 0.1 },
        ],
      };
      const sourcePath = {
        points: [
          { x: 0.8, y: 0.9 },
          { x: 0.8, y: 0.1 },
        ],
      };
      const updateCalls: unknown[] = [];

      mockSupabase.client.from = vi.fn((table: string) => {
        if (table === 'topo_routes') {
          return {
            select: () => ({
              in: () =>
                Promise.resolve({
                  data: [
                    {
                      id: 300,
                      topo_id: 30,
                      route_id: 1,
                      number: 1,
                      path: targetPath,
                    },
                    {
                      id: 301,
                      topo_id: 30,
                      route_id: 2,
                      number: 2,
                      path: sourcePath,
                    },
                  ],
                  error: null,
                }),
            }),
            update: (payload: unknown) => ({
              eq: () => {
                updateCalls.push(payload);
                return Promise.resolve({ error: null });
              },
            }),
          };
        }
        return {};
      }) as unknown as typeof mockSupabase.client.from;

      mockSupabase.client.rpc = vi.fn(() =>
        Promise.resolve({ data: null, error: null }),
      ) as unknown as typeof mockSupabase.client.rpc;

      const ok = await service.unify(1, [2], 'Unified Route');

      expect(ok).toBe(true);
      expect(updateCalls).toEqual([]);
    });
  });
});
