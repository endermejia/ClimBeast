import { inject, Pipe, PipeTransform } from '@angular/core';

import { AscentsService } from '../services/ascents.service';

@Pipe({
  name: 'ascentInfo',
  standalone: true,
  pure: true,
})
export class AscentInfoPipe implements PipeTransform {
  private readonly ascentsService = inject(AscentsService);

  transform(type: string | undefined | null): { icon: string; background: string } {
    const infoMap = this.ascentsService.ascentInfo();
    const key = type || 'default';
    return infoMap[key] || infoMap['default'];
  }
}
