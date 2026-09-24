import { inject, Injectable, signal } from '@angular/core';

import { STORAGE_KEYS } from '../constants';

import { LocalStorage } from './local-storage';

export interface VisitedIndoorCenter {
  id: string;
  name: string;
  slug: string;
  visitedAt?: number;
}

@Injectable({
  providedIn: 'root',
})
export class VisitedIndoorCentersService {
  private readonly storage = inject(LocalStorage);
  private readonly STORAGE_KEY = STORAGE_KEYS.visitedIndoorCenters;
  private readonly MAX_CENTERS = 10;

  private readonly _visitedCenters = signal<VisitedIndoorCenter[]>(
    this.loadVisitedCenters(),
  );
  readonly visitedCenters = this._visitedCenters.asReadonly();

  private loadVisitedCenters(): VisitedIndoorCenter[] {
    const data = this.storage.getItem(this.STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  addVisitedCenter(center: VisitedIndoorCenter) {
    const current = this.loadVisitedCenters();
    const filtered = current.filter((c) => c.id !== center.id);
    const updated = [{ ...center, visitedAt: Date.now() }, ...filtered].slice(
      0,
      this.MAX_CENTERS,
    );

    this.storage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    this._visitedCenters.set(updated);
  }
}
