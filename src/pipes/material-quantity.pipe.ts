import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pure pipe to retrieve the quantity of a specific material item from a quantities map.
 * Replaces direct method calls in template loops to optimize change detection performance.
 */
@Pipe({
  name: 'materialQuantity',
  standalone: true,
  pure: true,
})
export class MaterialQuantityPipe implements PipeTransform {
  transform(
    quantities: Record<number, number> | null | undefined,
    materialId: number,
  ): number {
    if (!quantities) {
      return 0;
    }
    return quantities[materialId] ?? 0;
  }
}
