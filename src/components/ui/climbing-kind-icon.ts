import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { TuiHint, TuiIcon } from '@taiga-ui/core';

import { TranslateService } from '@ngx-translate/core';

import { CLIMBING_ICONS, ClimbingKind } from '../../models';

@Component({
  selector: 'app-climbing-kind-icon',
  imports: [TuiHint, TuiIcon],
  template: `
    <tui-icon [icon]="icon()" [tuiHint]="hint()" [class]="iconClass()" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex items-center',
  },
})
export class ClimbingKindIconComponent {
  private readonly translate = inject(TranslateService);

  kind = input<ClimbingKind | string | null | undefined>(null);
  showHint = input(true);
  iconClass = input<string>('');

  protected readonly icon = computed(() => {
    const k = this.kind();
    if (!k) return '@tui.mountain';
    return CLIMBING_ICONS[k as ClimbingKind] || '@tui.mountain';
  });

  protected readonly hint = computed(() => {
    if (!this.showHint()) return null;
    const k = this.kind();
    if (!k) return null;
    return this.translate.instant('climbingKinds.' + k);
  });
}
