import { Pipe, PipeTransform } from '@angular/core';

import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { tuiDefaultSort } from '@taiga-ui/cdk';

import type { TopoRouteRow } from '../models';

export type { TopoRouteRow } from '../models';

export const TOPO_ROUTE_SORTERS: Record<string, TuiComparator<TopoRouteRow>> = {
  index: (a, b) => tuiDefaultSort(a.index, b.index),
  name: (a, b) => tuiDefaultSort(a.name, b.name),
  grade: (a, b) => tuiDefaultSort(a.grade, b.grade),
  height: (a, b) => tuiDefaultSort(a.height ?? 0, b.height ?? 0),
  moves: (a, b) =>
    tuiDefaultSort(a.moves ?? 0, b.moves ?? 0) ||
    tuiDefaultSort(a.name, b.name),
};

@Pipe({
  name: 'tableSorter',
})
export class TableSorterPipe implements PipeTransform {
  transform(col: string): TuiComparator<TopoRouteRow> | null {
    if (col === 'actions' || col === 'admin_actions' || col === 'visibility') {
      return null;
    }
    return TOPO_ROUTE_SORTERS[col] ?? null;
  }
}
