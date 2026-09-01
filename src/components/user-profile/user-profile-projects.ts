import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { TuiScrollbar } from '@taiga-ui/core';

import { ProfileDataService } from '../../services/profile-data.service';

import { PyramidComponent } from '../charts/pyramid';
import { UserProfileProjectsListComponent } from './projects/projects-list';

@Component({
  selector: 'app-user-profile-projects',
  standalone: true,
  imports: [PyramidComponent, TuiScrollbar, UserProfileProjectsListComponent],
  template: `
    <div
      class="flex flex-col lg:flex-row gap-6 w-full lg:h-full min-w-0 lg:min-h-0 lg:overflow-hidden"
    >
      <!-- Left Column: Pyramid -->
      <div
        class="flex flex-col flex-1 min-w-0 min-h-0 lg:h-full lg:overflow-hidden"
      >
        <tui-scrollbar class="w-full lg:flex-1 lg:min-h-0">
          <div class="w-full min-w-0 pr-2">
            <app-pyramid [userId]="userId()" [startingYear]="startingYear()" />
          </div>
        </tui-scrollbar>
      </div>

      <!-- Right Column: Projects List -->
      <div
        class="w-full lg:w-[460px] xl:w-[500px] 2xl:w-[540px] shrink-0 min-w-0 lg:h-full flex flex-col lg:overflow-hidden"
      >
        <tui-scrollbar class="w-full lg:flex-1 lg:min-h-0">
          <div class="w-full min-w-0 pr-2">
            <app-user-profile-projects-list
              [projects]="projects()"
              [loading]="projectsResource.isLoading()"
            />
          </div>
        </tui-scrollbar>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full min-w-0 lg:flex lg:flex-col lg:h-full lg:min-h-0',
  },
})
export class UserProfileProjectsComponent {
  userId = input.required<string>();
  startingYear = input<number | null | undefined>();

  protected readonly profileData = inject(ProfileDataService);
  readonly projectsResource = this.profileData.userProjectsResource;
  readonly projects = computed(() => this.projectsResource.value() ?? []);
}
