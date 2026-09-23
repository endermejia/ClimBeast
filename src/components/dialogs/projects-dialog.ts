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
      :host .projects-dialog-scroll {
        overflow: hidden !important;
      }
      :host .projects-dialog-scroll ::ng-deep > .t-content {
        block-size: 100% !important;
        height: 100% !important;
        overflow: hidden !important;
      }
      :host .projects-dialog-scroll ::ng-deep > tui-scroll-controls {
        display: none !important;
      }
    }
  `,
  template: `
    <div
      class="flex flex-col grow lg:h-[70dvh] max-h-[70dvh] min-h-0 w-full overflow-hidden"
    >
      <tui-scrollbar
        class="projects-dialog-scroll w-full grow lg:h-[70dvh] max-h-[70dvh] min-h-0 overflow-x-hidden!"
      >
        <div class="w-full h-full min-w-0 pr-1">
          <app-user-profile-projects
            [userId]="context.data.userId"
            [startingYear]="context.data.startingYear"
          />
        </div>
      </tui-scrollbar>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col max-h-[70dvh] min-h-0 w-full overflow-hidden' },
})
export class ProjectsDialogComponent {
  protected readonly context =
    injectContext<TuiDialogContext<void, ProjectsDialogData>>();
}
