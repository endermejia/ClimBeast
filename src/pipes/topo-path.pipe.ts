import { Pipe, PipeTransform } from '@angular/core';

import { PointState } from '../models';

import {
  getPointStateBadge as getPointStateBadgeUtil,
  getPointStateColor as getPointStateColorUtil,
  getPointStateLabel as getPointStateLabelUtil,
} from '../utils';

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
