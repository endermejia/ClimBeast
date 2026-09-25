import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'includesId',
  standalone: true,
})
export class IncludesIdPipe implements PipeTransform {
  transform<T extends { id?: string | number } | string | number>(
    items: (T | null | undefined)[] | null | undefined,
    id: string | number | null | undefined,
  ): boolean {
    if (!items || id === null || id === undefined) return false;
    // Use an indexed for loop instead of items.some() to avoid closure/callback allocations
    // during template change detection evaluations.
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (typeof item === 'object' && item !== null && 'id' in item) {
        if (item.id === id) return true;
      } else if (item === id) {
        return true;
      }
    }
    return false;
  }
}
