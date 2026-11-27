import { describe, expect, it, vi } from 'vitest';

import { EquipperDto } from '../../models';

import {
  createOptimisticEquippers,
  RouteEquippersQueue,
  toEquippersPayload,
} from './route-equippers-queue';

function makeEquipper(id: number, name: string): EquipperDto {
  return {
    id,
    name,
    created_at: '',
    description: null,
    user_id: null,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('route-equippers-queue', () => {
  describe('createOptimisticEquippers', () => {
    it('maps strings to negative-ID DTOs and keeps existing DTOs intact', () => {
      const existing = makeEquipper(5, 'Alice');
      const result = createOptimisticEquippers([existing, 'Bob', 'Charlie']);

      expect(result).toEqual([
        existing,
        {
          id: -2,
          name: 'Bob',
          created_at: '',
          description: null,
          user_id: null,
        },
        {
          id: -3,
          name: 'Charlie',
          created_at: '',
          description: null,
          user_id: null,
        },
      ]);
    });
  });

  describe('toEquippersPayload', () => {
    it('keeps strings and positive-ID DTOs and converts optimistic DTOs back to names', () => {
      const saved = makeEquipper(5, 'Alice');
      const optimistic = makeEquipper(-1, 'Temp');

      expect(toEquippersPayload([saved, optimistic, 'Raw'])).toEqual([
        saved,
        'Temp',
        'Raw',
      ]);
    });
  });

  describe('RouteEquippersQueue', () => {
    it('applies optimistic override immediately and replaces with saved result on completion', async () => {
      const queue = new RouteEquippersQueue();
      const deferred = createDeferred<EquipperDto[]>();
      const onSaved = vi.fn();
      const saved = [makeEquipper(101, 'Pedro')];

      const task = queue.enqueue({
        routeId: 1,
        equippers: ['Pedro'],
        save: () => deferred.promise,
        onSaved,
      });

      expect(queue.isInFlight(1)).toBe(true);
      expect(queue.getOverride(1)).toEqual([
        expect.objectContaining({ id: -1, name: 'Pedro' }),
      ]);
      expect(onSaved).not.toHaveBeenCalled();

      deferred.resolve(saved);
      await task;

      expect(queue.isInFlight(1)).toBe(false);
      expect(queue.getOverride(1)).toEqual(saved);
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(onSaved).toHaveBeenCalledWith(saved);
    });

    it('chains saves sequentially for the same route and suppresses stale results', async () => {
      const queue = new RouteEquippersQueue();
      const first = createDeferred<EquipperDto[]>();
      const second = createDeferred<EquipperDto[]>();
      const saveOrder: string[] = [];
      const onSaved1 = vi.fn();
      const onSaved2 = vi.fn();

      const task1 = queue.enqueue({
        routeId: 'route-a',
        equippers: ['First'],
        save: async (payload) => {
          saveOrder.push(`start-1:${String(payload[0])}`);
          const res = await first.promise;
          saveOrder.push('end-1');
          return res;
        },
        onSaved: onSaved1,
      });

      const task2 = queue.enqueue({
        routeId: 'route-a',
        equippers: ['First', 'Second'],
        save: async (payload) => {
          saveOrder.push(`start-2:${payload.length}`);
          const res = await second.promise;
          saveOrder.push('end-2');
          return res;
        },
        onSaved: onSaved2,
      });

      // Optimistic override reflects the latest queued edit
      expect(queue.getOverride('route-a')?.map((e) => e.name)).toEqual([
        'First',
        'Second',
      ]);
      // Second save has not started yet while first is in flight
      await Promise.resolve();
      expect(saveOrder).toEqual(['start-1:First']);

      first.resolve([makeEquipper(1, 'First')]);
      await task1;

      // Stale first save did NOT overwrite newer optimistic state or call onSaved1
      expect(onSaved1).not.toHaveBeenCalled();
      expect(queue.isInFlight('route-a')).toBe(true);
      expect(queue.getOverride('route-a')?.map((e) => e.name)).toEqual([
        'First',
        'Second',
      ]);

      const finalSaved = [makeEquipper(1, 'First'), makeEquipper(2, 'Second')];
      second.resolve(finalSaved);
      await task2;

      expect(saveOrder).toEqual([
        'start-1:First',
        'end-1',
        'start-2:2',
        'end-2',
      ]);
      expect(queue.isInFlight('route-a')).toBe(false);
      expect(queue.getOverride('route-a')).toEqual(finalSaved);
      expect(onSaved2).toHaveBeenCalledWith(finalSaved);
    });

    it('rolls back override and notifies onError when the latest save fails', async () => {
      const queue = new RouteEquippersQueue();
      const err = new Error('network error');
      const onError = vi.fn();

      await queue.enqueue({
        routeId: 7,
        equippers: ['Broken'],
        save: () => Promise.reject(err),
        onError,
      });

      expect(queue.isInFlight(7)).toBe(false);
      expect(queue.getOverride(7)).toBeUndefined();
      expect(onError).toHaveBeenCalledWith(err);
    });

    it('does not roll back a newer queued save when an earlier save fails', async () => {
      const queue = new RouteEquippersQueue();
      const first = createDeferred<EquipperDto[]>();
      const second = createDeferred<EquipperDto[]>();
      const onError1 = vi.fn();
      const onSaved2 = vi.fn();

      const task1 = queue.enqueue({
        routeId: 9,
        equippers: ['Old'],
        save: () => first.promise,
        onError: onError1,
      });

      const task2 = queue.enqueue({
        routeId: 9,
        equippers: ['New'],
        save: () => second.promise,
        onSaved: onSaved2,
      });

      first.reject(new Error('stale failure'));
      await task1;

      expect(onError1).toHaveBeenCalledTimes(1);
      expect(queue.isInFlight(9)).toBe(true);
      expect(queue.getOverride(9)?.map((e) => e.name)).toEqual(['New']);

      const saved = [makeEquipper(99, 'New')];
      second.resolve(saved);
      await task2;

      expect(queue.isInFlight(9)).toBe(false);
      expect(queue.getOverride(9)).toEqual(saved);
      expect(onSaved2).toHaveBeenCalledWith(saved);
    });

    it('reconcileWithData clears completed overrides while preserving in-flight ones', async () => {
      const queue = new RouteEquippersQueue();
      const inFlightDeferred = createDeferred<EquipperDto[]>();

      await queue.enqueue({
        routeId: 1,
        equippers: ['Done'],
        save: () => Promise.resolve([makeEquipper(10, 'Done')]),
      });

      const task2 = queue.enqueue({
        routeId: 2,
        equippers: ['Pending'],
        save: () => inFlightDeferred.promise,
      });

      queue.reconcileWithData();
      expect(queue.getOverride(1)).toBeUndefined();
      expect(queue.getOverride(2)?.map((e) => e.name)).toEqual(['Pending']);

      inFlightDeferred.resolve([makeEquipper(20, 'Pending')]);
      await task2;

      queue.reconcileWithData();
      expect(queue.overrides()).toEqual({});
    });
  });
});
