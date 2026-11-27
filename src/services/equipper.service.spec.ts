import { TestBed } from '@angular/core/testing';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EquipperDto } from '../models';

import { IS_BROWSER } from '../app/is-browser';
import { MockSupabaseService } from '../testing/mock-supabase.service';
import { EquipperService } from './equipper.service';
import { SupabaseService } from './supabase.service';

function makeEquipper(id: number, name: string): EquipperDto {
  return {
    id,
    name,
    created_at: '',
    description: null,
    user_id: null,
  };
}

describe('EquipperService', () => {
  let service: EquipperService;
  let mockSupabase: MockSupabaseService;

  beforeEach(() => {
    mockSupabase = new MockSupabaseService();
    TestBed.configureTestingModule({
      providers: [
        EquipperService,
        { provide: IS_BROWSER, useValue: true },
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    });
    service = TestBed.inject(EquipperService);
  });

  describe('syncRouteEquippers', () => {
    it('returns empty array on server platform without querying Supabase', async () => {
      TestBed.resetTestingModule();
      const fromSpy = vi.fn();
      mockSupabase.client.from =
        fromSpy as unknown as typeof mockSupabase.client.from;
      TestBed.configureTestingModule({
        providers: [
          EquipperService,
          { provide: IS_BROWSER, useValue: false },
          { provide: SupabaseService, useValue: mockSupabase },
        ],
      });
      const serverService = TestBed.inject(EquipperService);

      const res = await serverService.syncRouteEquippers('route_equippers', 1, [
        'Alice',
      ]);

      expect(res).toEqual([]);
      expect(fromSpy).not.toHaveBeenCalled();
    });

    it('resolves existing equippers, escapes PostgREST quotes/backslashes/commas, creates missing deduplicated, and syncs route_equippers', async () => {
      let capturedOr = '';
      let createdPayloads: { name: string }[] = [];
      let deletedEq: [string, unknown] | null = null;
      let insertedJoinRows: unknown[] = [];

      mockSupabase.client.from = ((table: string) => {
        if (table === 'equippers') {
          return {
            select: () => ({
              or: (query: string) => {
                capturedOr = query;
                return Promise.resolve({
                  data: [makeEquipper(10, 'Ana "La Pro", Jr\\1')],
                  error: null,
                });
              },
            }),
            insert: (payloads: { name: string }[]) => {
              createdPayloads = payloads;
              return {
                select: () =>
                  Promise.resolve({
                    data: payloads.map((p, idx) =>
                      makeEquipper(50 + idx, p.name),
                    ),
                    error: null,
                  }),
              };
            },
          };
        }
        if (table === 'route_equippers') {
          return {
            delete: () => ({
              eq: (col: string, val: unknown) => {
                deletedEq = [col, val];
                return Promise.resolve({ data: null, error: null });
              },
            }),
            insert: (rows: unknown[]) => {
              insertedJoinRows = rows;
              return Promise.resolve({ data: null, error: null });
            },
          };
        }
        return {};
      }) as unknown as typeof mockSupabase.client.from;

      const resolved = await service.syncRouteEquippers('route_equippers', 42, [
        '  Ana "La Pro", Jr\\1 ',
        'Carlos Ruiz',
        'carlos ruiz',
        makeEquipper(-1, 'Bea Nuevo'),
        makeEquipper(10, 'Ana "La Pro", Jr\\1'),
        '   ',
      ]);

      expect(capturedOr).toBe(
        'name.ilike."Ana \\"La Pro\\", Jr\\\\1",name.ilike."Carlos Ruiz",name.ilike."carlos ruiz",name.ilike."Bea Nuevo"',
      );
      expect(createdPayloads).toEqual([
        { name: 'Carlos Ruiz' },
        { name: 'Bea Nuevo' },
      ]);
      expect(resolved.map((e) => ({ id: e.id, name: e.name }))).toEqual([
        { id: 10, name: 'Ana "La Pro", Jr\\1' },
        { id: 50, name: 'Carlos Ruiz' },
        { id: 51, name: 'Bea Nuevo' },
      ]);
      expect(deletedEq).toEqual(['route_id', 42]);
      expect(insertedJoinRows).toEqual([
        { route_id: 42, equipper_id: 10 },
        { route_id: 42, equipper_id: 50 },
        { route_id: 42, equipper_id: 51 },
      ]);
    });

    it('syncs indoor_route_equippers with string routeId and preserves existing DTOs without querying equippers when no strings are passed', async () => {
      const equippersTableSpy = vi.fn();
      let deletedEq: [string, unknown] | null = null;
      let insertedJoinRows: unknown[] = [];

      mockSupabase.client.from = ((table: string) => {
        if (table === 'equippers') {
          equippersTableSpy();
          return {};
        }
        if (table === 'indoor_route_equippers') {
          return {
            delete: () => ({
              eq: (col: string, val: unknown) => {
                deletedEq = [col, val];
                return Promise.resolve({ data: null, error: null });
              },
            }),
            insert: (rows: unknown[]) => {
              insertedJoinRows = rows;
              return Promise.resolve({ data: null, error: null });
            },
          };
        }
        return {};
      }) as unknown as typeof mockSupabase.client.from;

      const eq1 = makeEquipper(7, 'Elena');
      const eq2 = makeEquipper(9, 'Marcos');
      const resolved = await service.syncRouteEquippers(
        'indoor_route_equippers',
        'indoor-uuid-123',
        [eq1, eq2, makeEquipper(7, 'Elena Duplicate')],
      );

      expect(equippersTableSpy).not.toHaveBeenCalled();
      expect(resolved).toEqual([eq1, eq2]);
      expect(deletedEq).toEqual(['route_id', 'indoor-uuid-123']);
      expect(insertedJoinRows).toEqual([
        { route_id: 'indoor-uuid-123', equipper_id: 7 },
        { route_id: 'indoor-uuid-123', equipper_id: 9 },
      ]);
    });

    it('clears the junction table and skips insert when equippers list is empty', async () => {
      const insertSpy = vi.fn();
      let deletedEq: [string, unknown] | null = null;

      mockSupabase.client.from = ((table: string) => {
        if (table === 'indoor_route_equippers') {
          return {
            delete: () => ({
              eq: (col: string, val: unknown) => {
                deletedEq = [col, val];
                return Promise.resolve({ data: null, error: null });
              },
            }),
            insert: insertSpy,
          };
        }
        return {};
      }) as unknown as typeof mockSupabase.client.from;

      const resolved = await service.syncRouteEquippers(
        'indoor_route_equippers',
        'indoor-empty-1',
        [],
      );

      expect(resolved).toEqual([]);
      expect(deletedEq).toEqual(['route_id', 'indoor-empty-1']);
      expect(insertSpy).not.toHaveBeenCalled();
    });

    it('propagates errors from Supabase queries', async () => {
      const dbError = new Error('DB failure');
      mockSupabase.client.from = ((table: string) => {
        if (table === 'equippers') {
          return {
            select: () => ({
              or: () => Promise.resolve({ data: null, error: dbError }),
            }),
          };
        }
        return {};
      }) as unknown as typeof mockSupabase.client.from;

      await expect(
        service.syncRouteEquippers('route_equippers', 1, ['FailSetter']),
      ).rejects.toThrow('DB failure');
    });
  });
});
