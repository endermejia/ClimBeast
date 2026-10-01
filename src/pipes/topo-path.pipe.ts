import { Pipe, PipeTransform } from '@angular/core';

import { PointState, TopoPoint } from '../models';

import {
  getPointStateBadge as getPointStateBadgeUtil,
  getPointStateColor as getPointStateColorUtil,
  getPointStateLabel as getPointStateLabelUtil,
  hasPath as hasPathUtil,
} from '../utils';

@Pipe({
  name: 'topoHasPath',
  standalone: true,
  pure: true,
})
export class TopoHasPathPipe implements PipeTransform {
  transform(
    routeId: string | number,
    pathsMap: Map<
      string | number,
      { points: TopoPoint[] | { x: number; y: number }[] }
    >,
    _version?: number,
  ): boolean {
    return hasPathUtil(routeId, pathsMap);
  }
}

@Pipe({
  name: 'topoPointStateColor',
  standalone: true,
  pure: true,
})
export class TopoPointStateColorPipe implements PipeTransform {
  transform(state: PointState | undefined, defaultColor?: string): string {
    return getPointStateColorUtil(state, defaultColor);
  }
}

@Pipe({
  name: 'topoPointStateBadge',
  standalone: true,
  pure: true,
})
export class TopoPointStateBadgePipe implements PipeTransform {
  transform(state: PointState | undefined): string {
    return getPointStateBadgeUtil(state);
  }
}

@Pipe({
  name: 'topoPointStateLabel',
  standalone: true,
  pure: true,
})
export class TopoPointStateLabelPipe implements PipeTransform {
  transform(state: PointState | undefined): string {
    return getPointStateLabelUtil(state);
  }
}

@Pipe({
  name: 'topoIsTraverse',
  standalone: true,
  pure: true,
})
export class TopoIsTraversePipe implements PipeTransform {
  transform(
    routeId: string | number,
    pathsMap: Map<
      string | number,
      { isTraverse?: boolean; [key: string]: unknown }
    >,
    _version?: number,
  ): boolean {
    return !!pathsMap.get(routeId)?.isTraverse;
  }
}
