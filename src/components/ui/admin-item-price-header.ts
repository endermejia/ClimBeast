import { DecimalPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';

import { TuiButton, TuiIcon } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-admin-item-price-header',
  imports: [DecimalPipe, TranslatePipe, TuiButton, TuiIcon],
  template: `
    @if (isAdmin()) {
      <div class="flex gap-2">
        <button
          tuiIconButton
          appearance="accent"
          size="s"
          type="button"
          class="rounded-xl!"
          (click)="editClicked.emit()"
          [attr.aria-label]="'edit' | translate"
        >
          <tui-icon icon="@tui.pencil" />
        </button>

        <button
          tuiIconButton
          appearance="negative"
          size="s"
          type="button"
          class="rounded-xl!"
          (click)="deleteClicked.emit()"
          [attr.aria-label]="'delete' | translate"
        >
          <tui-icon icon="@tui.trash" />
        </button>
      </div>
    }
    <div class="text-2xl font-black tabular-nums">
      {{ price() | number: '1.2-2' }}€
    </div>
  `,
  host: { class: 'flex items-center gap-3 shrink-0' },
})
export class AdminItemPriceHeaderComponent {
  readonly isAdmin = input(false);
  readonly price = input.required<number>();
  readonly editClicked = output<void>();
  readonly deleteClicked = output<void>();
}
