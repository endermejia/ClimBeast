import { Component } from '@angular/core';

import { TuiDialogContext, TuiScrollbar } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

import { UserProfileLikesComponent } from '../user-profile/user-profile-likes';

export interface FavoritesDialogData {
  userId: string;
}

@Component({
  selector: 'app-favorites-dialog',
  standalone: true,
  imports: [TuiScrollbar, UserProfileLikesComponent],
  styles: `
    :host tui-scrollbar {
      max-block-size: 70dvh !important;
      overflow-x: hidden !important;
    }
    :host tui-scrollbar ::ng-deep > .t-content {
      min-inline-size: 0 !important;
      max-inline-size: 100% !important;
      overflow-x: clip !important;
    }
  `,
  template: `
    <tui-scrollbar class="w-full max-h-[70dvh] min-h-0 min-w-0">
      <div class="w-full min-w-0 pr-2">
        <app-user-profile-likes [userId]="context.data.userId" />
      </div>
    </tui-scrollbar>
  `,
  host: {
    class: 'block w-full min-w-0',
  },
})
export class FavoritesDialogComponent {
  protected readonly context =
    injectContext<TuiDialogContext<void, FavoritesDialogData>>();
}
