import { Component, input, output } from '@angular/core';

import {
  TuiAppearance,
  TuiButton,
  TuiSizeL,
  TuiSizeS,
  TuiSizeXS,
} from '@taiga-ui/core';
import { TuiBadgedContent, TuiBadgeNotification } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-filter-button',
  imports: [
    TranslatePipe,
    TuiAppearance,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiButton,
  ],
  template: `
    <tui-badged-content class="rounded-2xl">
      @if (hasActiveFilters()) {
        <tui-badge-notification tuiAppearance="accent" size="s" tuiSlot="top" />
      }
      <button
        tuiButton
        appearance="textfield"
        [size]="size()"
        type="button"
        iconStart="@tui.sliders-horizontal"
        [attr.aria-label]="'filters' | translate"
        (click.zoneless)="clicked.emit()"
      ></button>
    </tui-badged-content>
  `,
  host: { class: 'inline-flex shrink-0' },
})
export class FilterButtonComponent {
  readonly hasActiveFilters = input<boolean>(false);
  readonly size = input<TuiSizeL | TuiSizeS | TuiSizeXS>('l');
  readonly clicked = output<void>();
}
