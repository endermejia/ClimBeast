import { inject, Signal, signal, WritableSignal } from '@angular/core';

import { LocalStorage } from './local-storage';

export interface VisitedItem {
  id: number | string;
  visitedAt?: number;
}

export abstract class VisitedItemsBase<T extends VisitedItem> {
  private readonly storage = inject(LocalStorage);
  private readonly storageKey: string;
  private readonly maxItems: number;
  private readonly _items: WritableSignal<T[]>;

  readonly items: Signal<T[]>;

  protected constructor(storageKey: string, maxItems = 10) {
    this.storageKey = storageKey;
    this.maxItems = maxItems;
    this._items = signal<T[]>(this.loadItems());
    this.items = this._items.asReadonly();
  }

  protected loadItems(): T[] {
    const data = this.storage.getItem(this.storageKey);
    if (!data) return [];
    try {
      const parsed: unknown = JSON.parse(data);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  protected addItem(item: T): void {
    const current = this.loadItems();
    const filtered = current.filter((existing) => existing.id !== item.id);
    const updated = [{ ...item, visitedAt: Date.now() }, ...filtered].slice(
      0,
      this.maxItems,
    );

    this.storage.setItem(this.storageKey, JSON.stringify(updated));
    this._items.set(updated);
  }
}
