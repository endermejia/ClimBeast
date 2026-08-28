import { ChangeDetectionStrategy, Component } from '@angular/core';

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
  template: `
    <tui-scrollbar class="max-h-[80dvh] -m-4 p-4">
      <app-user-profile-likes [userId]="context.data.userId" />
    </tui-scrollbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoritesDialogComponent {
  protected readonly context =
    injectContext<TuiDialogContext<void, FavoritesDialogData>>();
}
