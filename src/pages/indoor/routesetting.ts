import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';

import {
  TuiAppearance,
  TuiInput,
  TuiLabel,
  TuiLoader,
  TuiNotification,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiBadgedContent,
  TuiBadgeNotification,
} from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { AuthStateService } from '../../services/auth-state.service';
import { IndoorCentersDataService } from '../../services/indoor-centers-data.service';

import { IndoorCenterCardComponent } from '../../components/indoor/indoor-center-card';
import { EmptyStateComponent } from '../../components/ui/empty-state';

import { matchesQuery } from '../../utils';

@Component({
  selector: 'app-routesetting',
  standalone: true,
  imports: [
    EmptyStateComponent,
    IndoorCenterCardComponent,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiInput,
    TuiLabel,
    TuiLoader,
    TuiNotification,
    TuiScrollbar,
    TuiTextfield,
  ],
  template: `
    <tui-scrollbar class="flex grow">
      <section class="w-full max-w-[1600px] mx-auto p-4 pb-32">
        <header class="flex items-center justify-between gap-2">
          @let centersCount = filtered().length;
          <h1
            class="text-2xl font-bold w-full sm:w-auto flex items-center gap-2"
          >
            <tui-badged-content [style.--tui-radius.%]="50">
              @if (centersCount > 0) {
                <tui-badge-notification
                  tuiAppearance="accent"
                  size="s"
                  tuiSlot="top"
                >
                  {{ centersCount }}
                </tui-badge-notification>
              }
              <span
                tuiAvatar="@tui.wrench"
                tuiThumbnail
                size="l"
                class="self-center"
                [attr.aria-label]="'nav.routesetting' | translate"
              ></span>
            </tui-badged-content>
            <span>{{ 'routesetting.title' | translate }}</span>
          </h1>
        </header>

        <div tuiNotification size="m" class="my-4">
          {{ 'routesetting.notification' | translate }}
        </div>

        <div class="sticky top-0 z-10 py-4 flex items-end gap-2">
          <tui-textfield
            class="grow block bg-(--tui-background-base)"
            tuiTextfieldSize="l"
          >
            <label tuiLabel for="routesetting-gyms-search">
              {{ 'searchPlaceholder' | translate }}
            </label>
            <input
              tuiInput
              #routesettingSearch
              id="routesetting-gyms-search"
              autocomplete="off"
              [value]="query()"
              (input.zoneless)="onQuery(routesettingSearch.value)"
            />
          </tui-textfield>
        </div>

        <!-- Routesetter Centers list -->
        @if (!loading()) {
          <div class="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            @for (center of filtered(); track center.id) {
              <app-indoor-center-card [item]="center" />
            } @empty {
              <div class="col-span-full">
                <app-empty-state
                  icon="@tui.wrench"
                  message="routesetting.empty"
                />
              </div>
            }
          </div>
        } @else {
          <div class="flex items-center justify-center py-8">
            <tui-loader size="xxl" />
          </div>
        }
      </section>
    </tui-scrollbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class RoutesettingComponent {
  protected readonly authState = inject(AuthStateService);
  protected readonly indoorCentersData = inject(IndoorCentersDataService);

  readonly loading = computed(
    () =>
      this.indoorCentersData.indoorCentersResource.isLoading() ||
      this.indoorCentersData.indoorCentersResource.value() === undefined ||
      this.authState.userProfileResource.isLoading() ||
      this.authState.userProfileResource.value() === undefined ||
      (!this.authState.isAdmin() &&
        (this.authState.routesetterIndoorCentersResource?.isLoading?.() ??
          false)),
  );

  readonly query: WritableSignal<string> = signal('');

  readonly myRoutesetterCenterIds = this.authState.routesetterIndoorCenters;

  readonly centers = computed(() => {
    if (this.authState.isAdmin()) {
      return this.indoorCentersData.indoorCentersList();
    }
    const ids = new Set(this.myRoutesetterCenterIds().map((id) => String(id)));
    return this.indoorCentersData
      .indoorCentersList()
      .filter((c) => ids.has(String(c.id)));
  });

  readonly filtered = computed(() => {
    const q = this.query().trim();
    const list = this.centers();
    if (!q) return list;
    return list.filter(
      (c) =>
        matchesQuery(c.name, q) ||
        (c.slug && matchesQuery(c.slug, q)) ||
        (c.city && matchesQuery(c.city, q)),
    );
  });

  protected onQuery(val: string): void {
    this.query.set(val);
  }
}
