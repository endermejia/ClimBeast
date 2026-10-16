import { inject, Pipe, PipeTransform } from '@angular/core';

import { AscentsService } from '../services/ascents.service';

@Pipe({
  name: 'ascentInfo',
  standalone: true,
  pure: true,
})
export class AscentInfoPipe implements PipeTransform {
  private readonly ascentsService = inject(AscentsService);

  transform(type: string | undefined | null): {
    icon: string;
    background: string;
    backgroundSubtle: string;
  } {
    const infoMap = this.ascentsService.ascentInfo();
    if (type && type in infoMap) {
      return infoMap[type as keyof typeof infoMap];
    }
    return infoMap.default;
  }
}
