import { inject, Pipe, PipeTransform } from '@angular/core';

import { ThemeService } from '../services/theme.service';

import { IconName } from '../models';

@Pipe({
  name: 'iconSrc',
  standalone: true,
  pure: true,
})
export class IconSrcPipe implements PipeTransform {
  private readonly themeService = inject(ThemeService);

  transform(name: IconName | string): string {
    const theme = this.themeService.theme();
    return `/image/${name}-${theme}.svg`;
  }
}
