import { Component, computed, inject } from '@angular/core';

import { AuthStateService } from '../../services/auth-state.service';

import { ManagedIndoorCentersListComponent } from '../../components/indoor/managed-indoor-centers-list';

@Component({
  selector: 'app-my-indoor-centers',
  imports: [ManagedIndoorCentersListComponent],
  template: `
    <app-managed-indoor-centers-list
      icon="@tui.dumbbell"
      titleKey="myIndoorCenters.title"
      ariaLabelKey="nav.my-indoor-centers"
      notificationKey="myIndoorCenters.notification"
      emptyKey="myIndoorCenters.empty"
      searchInputId="gyms-search"
      [centerIds]="authState.adminIndoorCenters()"
      [roleLoading]="roleLoading()"
    />
  `,
  host: { class: 'flex grow min-h-0' },
})
export class MyIndoorCentersComponent {
  protected readonly authState = inject(AuthStateService);

  protected readonly roleLoading = computed(
    () =>
      this.authState.adminIndoorCentersResource.isLoading() ||
      this.authState.adminIndoorCentersResource.value() === undefined,
  );
}
