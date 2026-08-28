import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TuiDialogContext, TuiScrollbar } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

import { UserProfileProjectsComponent } from '../user-profile/user-profile-projects';

export interface ProjectsDialogData {
  userId: string;
  startingYear?: number | null;
}

@Component({
  selector: 'app-projects-dialog',
  standalone: true,
  imports: [TuiScrollbar, UserProfileProjectsComponent],
  template: `
    <tui-scrollbar class="max-h-[80dvh] -m-4 p-4">
      <app-user-profile-projects
        [userId]="context.data.userId"
        [startingYear]="context.data.startingYear"
      />
    </tui-scrollbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsDialogComponent {
  protected readonly context =
    injectContext<TuiDialogContext<void, ProjectsDialogData>>();
}
