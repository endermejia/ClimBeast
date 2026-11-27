import { Injectable } from '@angular/core';

import { STORAGE_KEYS } from '../constants';

import { VisitedItemsBase } from './visited-items.base';

export interface VisitedArea {
  id: number;
  name: string;
  slug: string;
  visitedAt?: number;
}

@Injectable({
  providedIn: 'root',
})
export class VisitedAreasService extends VisitedItemsBase<VisitedArea> {
  readonly visitedAreas = this.items;

  constructor() {
    super(STORAGE_KEYS.visitedAreas);
  }

  addVisitedArea(area: VisitedArea): void {
    this.addItem(area);
  }
}
