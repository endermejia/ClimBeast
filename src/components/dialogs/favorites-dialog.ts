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
    <tui-scrollbar class="w-full h-[80dvh] min-h-[400px] max-h-[850px]">
      <div class="w-full min-w-0 pr-2">
        <app-user-profile-likes [userId]="context.data.userId" />
      </div>
    </tui-scrollbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoritesDialogComponent {
  protected readonly context =
    injectContext<TuiDialogContext<void, FavoritesDialogData>>();
}
