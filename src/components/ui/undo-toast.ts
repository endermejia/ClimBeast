import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { TuiPortalContext } from '@taiga-ui/cdk';
import { TuiButton, TuiButtonX } from '@taiga-ui/core';
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
  imports: [TranslatePipe, TuiButton, TuiButtonX, TuiToast],
  template: `
    <div
      tuiToast
      iconStart="@tui.info"
      tuiShrinkWrap="min(calc(100vw - 4rem), 38rem)"
    >
      <span>{{ context.data?.message || '' | translate }}</span>
      <button tuiButton appearance="accent" type="button" (click)="onUndo()">
        {{ 'undo' | translate }}
      </button>
      <button tuiButtonX type="button" (click)="onClose()">Close</button>
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

  onClose(): void {
    this.context.$implicit.complete();
  }
}
