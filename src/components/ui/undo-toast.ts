import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { TuiPortalContext } from '@taiga-ui/cdk';
import { TuiButton } from '@taiga-ui/core';
import { TuiToast, TuiToastOptions } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

export interface UndoToastData {
  message: string;
  undoCallback: () => void;
}

@Component({
  standalone: true,
  selector: 'app-undo-toast',
  imports: [TranslatePipe, TuiButton, TuiToast],
  template: `
    <div tuiToast iconStart="@tui.info">
      <span class="truncate">{{
        context.data?.message || '' | translate
      }}</span>
      <button tuiButton size="s" type="button" (click)="onUndo()">
        {{ 'undo' | translate }}
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UndoToastComponent {
  protected readonly context =
    inject<TuiPortalContext<TuiToastOptions<UndoToastData>, boolean>>(
      POLYMORPHEUS_CONTEXT,
    );

  onUndo(): void {
    this.context.data?.undoCallback();
    this.context.completeWith(true);
  }
}
