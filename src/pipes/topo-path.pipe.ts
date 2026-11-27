import { Pipe, PipeTransform } from '@angular/core';

import { PointState } from '../models';

import {
  computeTopoPointPillRect,
  getPointStateBadge as getPointStateBadgeUtil,
  getPointStateColor as getPointStateColorUtil,
  getPointStateLabel as getPointStateLabelUtil,
  TopoPointPillGeometry,
} from '../utils';

@Pipe({
  name: 'topoPointStateColor',
  pure: true,
})
export class TopoPointStateColorPipe implements PipeTransform {
  transform(state: PointState | undefined, defaultColor?: string): string {
    return getPointStateColorUtil(state, defaultColor);
  }
}

@Pipe({
  name: 'topoPointStateBadge',
  pure: true,
})
export class TopoPointStateBadgePipe implements PipeTransform {
  transform(state: PointState | undefined): string {
    return getPointStateBadgeUtil(state);
  }
}

@Pipe({
  name: 'topoPointStateLabel',
  pure: true,
})
export class TopoPointStateLabelPipe implements PipeTransform {
  transform(state: PointState | undefined): string {
    return getPointStateLabelUtil(state);
  }
}

@Pipe({
  name: 'topoPointPillGeometry',
  pure: true,
})
export class TopoPointPillGeometryPipe implements PipeTransform {
  transform(
    state: PointState | undefined,
    cx: number,
    cy: number,
    anchorRadius: number,
    strokeWidth: number,
    position: 'below' | 'above' = 'below',
  ): TopoPointPillGeometry {
    return computeTopoPointPillRect(
      cx,
      cy,
      anchorRadius,
      strokeWidth,
      state,
      position,
    );
  }
}
