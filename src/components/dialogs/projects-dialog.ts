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
  styles: `
    @media (min-width: 1024px) {
      :host > tui-scrollbar {
        overflow: hidden !important;
      }
      :host > tui-scrollbar ::ng-deep > .t-content {
        block-size: 100% !important;
        height: 100% !important;
        overflow: hidden !important;
      }
      :host > tui-scrollbar ::ng-deep > tui-scroll-controls {
        display: none !important;
      }
    }
  `,
  template: `
    <tui-scrollbar class="w-full h-[80dvh] min-h-[500px] max-h-[850px]">
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
