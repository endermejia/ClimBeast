import { signal } from '@angular/core';

import { EquipperDto } from '../../models';

export interface EnqueueEquippersUpdateOptions {
  routeId: number | string;
  equippers: readonly (EquipperDto | string)[];
  save: (payload: (EquipperDto | string)[]) => Promise<EquipperDto[]>;
  onSaved?: (saved: EquipperDto[]) => void;
  onError?: (err: unknown) => void;
}

export function createOptimisticEquippers(
  equippers: readonly (EquipperDto | string)[],
): EquipperDto[] {
  return equippers.map((item, idx) =>
    typeof item === 'string'
      ? {
          id: -(idx + 1),
          name: item,
          created_at: '',
          description: null,
          user_id: null,
        }
      : item,
  );
}

export function toEquippersPayload(
  equippers: readonly (EquipperDto | string)[],
): (EquipperDto | string)[] {
  return equippers.map((item) =>
    typeof item === 'string' ? item : item.id > 0 ? item : item.name,
  );
}

/**
 * Coordinates optimistic equipper updates for route tables.
 * Preserves sequential persistence per route, suppresses stale responses
 * when newer edits are queued, and rolls back failed saves.
 */
export class RouteEquippersQueue {
  private readonly _overrides = signal<Record<string, EquipperDto[]>>({});
  private readonly saveSeq = new Map<string, number>();
  private readonly saveChain = new Map<string, Promise<void>>();
  private readonly inFlightRoutes = new Set<string>();

  readonly overrides = this._overrides.asReadonly();

  getOverride(routeId: number | string): EquipperDto[] | undefined {
    return this._overrides()[String(routeId)];
  }

  isInFlight(routeId: number | string): boolean {
    return this.inFlightRoutes.has(String(routeId));
  }

  reconcileWithData(): void {
    if (this.inFlightRoutes.size === 0) {
      this._overrides.set({});
    } else {
      this._overrides.update((prev) => {
        const next: Record<string, EquipperDto[]> = {};
        for (const [id, list] of Object.entries(prev)) {
          if (this.inFlightRoutes.has(id)) {
            next[id] = list;
          }
        }
        return next;
      });
    }
  }

  enqueue(options: EnqueueEquippersUpdateOptions): Promise<void> {
    const key = String(options.routeId);
    const seq = (this.saveSeq.get(key) ?? 0) + 1;
    this.saveSeq.set(key, seq);
    this.inFlightRoutes.add(key);

    const optimisticEquippers = createOptimisticEquippers(options.equippers);
    this._overrides.update((prev) => ({
      ...prev,
      [key]: optimisticEquippers,
    }));

    const payload = toEquippersPayload(options.equippers);

    const prev = this.saveChain.get(key) ?? Promise.resolve();
    const nextTask = prev
      .then(async () => {
        try {
          const saved = await options.save(payload);
          if (this.saveSeq.get(key) === seq) {
            this._overrides.update((curr) => ({
              ...curr,
              [key]: saved,
            }));
            this.inFlightRoutes.delete(key);
            options.onSaved?.(saved);
          }
        } catch (err: unknown) {
          if (this.saveSeq.get(key) === seq) {
            this.inFlightRoutes.delete(key);
            this._overrides.update((curr) => {
              const copy = { ...curr };
              delete copy[key];
              return copy;
            });
          }
          options.onError?.(err);
        }
      })
      .finally(() => {
        if (this.saveChain.get(key) === nextTask) {
          this.saveChain.delete(key);
        }
      });
    this.saveChain.set(key, nextTask);
    return nextTask;
  }
}
