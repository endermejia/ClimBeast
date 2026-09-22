import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'includesId',
  standalone: true,
  pure: true,
})
export class IncludesIdPipe implements PipeTransform {
  transform<T extends { id?: string | number } | string | number>(
    items: (T | null | undefined)[] | null | undefined,
    id: string | number | null | undefined,
  ): boolean {
    if (!items || items.length === 0 || id === null || id === undefined) {
      return false;
    }

    const len = items.length;
    for (let i = 0; i < len; i++) {
      const item = items[i];
      if (item === null || item === undefined) continue;
      if (typeof item === 'object') {
        if ('id' in item && item.id === id) return true;
      } else if (item === id) {
        return true;
      }
    }

    return false;
  }
}
