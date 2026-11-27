import { Component, computed, inject } from '@angular/core';

import { AuthStateService } from '../../services/auth-state.service';

import { ManagedIndoorCentersListComponent } from '../../components/indoor/managed-indoor-centers-list';

@Component({
  selector: 'app-routesetting',
  imports: [ManagedIndoorCentersListComponent],
  template: `
    <app-managed-indoor-centers-list
      icon="@tui.wrench"
      titleKey="routesetting.title"
      ariaLabelKey="nav.routesetting"
      notificationKey="routesetting.notification"
      emptyKey="routesetting.empty"
      searchInputId="routesetting-gyms-search"
      [centerIds]="authState.routesetterIndoorCenters()"
      [roleLoading]="roleLoading()"
    />
  `,
  host: { class: 'flex grow min-h-0' },
})
export class RoutesettingComponent {
  protected readonly authState = inject(AuthStateService);

  protected readonly roleLoading = computed(
    () =>
      this.authState.routesetterIndoorCentersResource?.isLoading?.() ?? false,
  );
}
