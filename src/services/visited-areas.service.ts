import { inject, Injectable, signal } from '@angular/core';

import { LocalStorage } from './local-storage';

export interface VisitedArea {
  id: number;
  name: string;
  slug: string;
  visitedAt?: number;
}

@Injectable({
  providedIn: 'root',
})
export class VisitedAreasService {
  private readonly storage = inject(LocalStorage);
  private readonly STORAGE_KEY = 'visited_areas';
  private readonly MAX_AREAS = 10;

  private readonly _visitedAreas = signal<VisitedArea[]>(
    this.loadVisitedAreas(),
  );
  readonly visitedAreas = this._visitedAreas.asReadonly();

  private loadVisitedAreas(): VisitedArea[] {
    const data = this.storage.getItem(this.STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  addVisitedArea(area: VisitedArea) {
    const current = this.loadVisitedAreas();
    // Remove if already exists to move it to the front
    const filtered = current.filter((a) => a.id !== area.id);
    const updated = [{ ...area, visitedAt: Date.now() }, ...filtered].slice(
      0,
      this.MAX_AREAS,
    );

    this.storage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    this._visitedAreas.set(updated);
  }
}
