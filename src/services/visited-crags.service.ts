import { Injectable } from '@angular/core';

import { STORAGE_KEYS } from '../constants';

import { VisitedItemsBase } from './visited-items.base';

export interface VisitedCrag {
  id: number;
  name: string;
  slug: string;
  area_slug: string;
  visitedAt?: number;
}

@Injectable({
  providedIn: 'root',
})
export class VisitedCragsService extends VisitedItemsBase<VisitedCrag> {
  readonly visitedCrags = this.items;

  constructor() {
    super(STORAGE_KEYS.visitedCrags);
  }

  addVisitedCrag(crag: VisitedCrag): void {
    this.addItem(crag);
  }
}
