import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TuiIcon } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-empty-state',
  imports: [TranslatePipe, TuiIcon],
  template: `
    <div
      class="flex flex-col items-center justify-center gap-4 opacity-50 py-10 text-center"
    >
      <tui-icon [icon]="icon()" [style.fontSize]="iconSize()" />
      <p class="text-xl font-medium text-center m-0">
        {{ message() | translate }}
      </p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  message = input<string>('empty');
  icon = input<string>('@tui.package-open');
  /**
   * Tamaño del icono. `tui-icon` mide 1em, así que su font-size es su caja:
   * 3.75rem (60px) es lo habitual para `@tui.*`, pero los SVG ilustrativos
   * necesitan más (8rem = 128px).
   */
  iconSize = input<string>('3.75rem');
}
