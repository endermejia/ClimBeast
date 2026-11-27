import { Injectable } from '@angular/core';

import { STORAGE_KEYS } from '../constants';

import { VisitedItemsBase } from './visited-items.base';

export interface VisitedIndoorCenter {
  id: string;
  name: string;
  slug: string;
  visitedAt?: number;
}

@Injectable({
  providedIn: 'root',
})
export class VisitedIndoorCentersService extends VisitedItemsBase<VisitedIndoorCenter> {
  readonly visitedCenters = this.items;

  constructor() {
    super(STORAGE_KEYS.visitedIndoorCenters);
  }

  addVisitedCenter(center: VisitedIndoorCenter): void {
    this.addItem(center);
  }
}
