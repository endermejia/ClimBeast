import { Pipe, PipeTransform } from '@angular/core';

import { ClimbingKind, ClimbingKinds } from '../models';

/**
 * Pure pipe to map translated climbing category labels back to ClimbingKind enum values.
 * Replaces direct template function invocations to leverage Angular pipe memoization.
 */
@Pipe({
  name: 'climbingKindByLabel',
  standalone: true,
  pure: true,
})
export class ClimbingKindByLabelPipe implements PipeTransform {
  transform(label: string, items: string[]): ClimbingKind | null {
    if (!label || !items || items.length < 3) return null;
    if (label === items[0]) return ClimbingKinds.SPORT;
    if (label === items[1]) return ClimbingKinds.BOULDER;
    if (label === items[2]) return ClimbingKinds.MULTIPITCH;
    return null;
  }
}
