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
    <div
      class="flex flex-col grow max-h-[70dvh] min-h-0 w-full overflow-hidden"
    >
      <tui-scrollbar class="grow min-h-0 overflow-x-hidden!">
        <div class="w-full min-w-0 pr-2">
          <app-user-profile-likes [userId]="context.data.userId" />
        </div>
      </tui-scrollbar>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col max-h-[70dvh] min-h-0 w-full overflow-hidden' },
})
export class FavoritesDialogComponent {
  protected readonly context =
    injectContext<TuiDialogContext<void, FavoritesDialogData>>();
}
