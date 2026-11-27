import { LowerCasePipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';

import {
  TuiAppearance,
  TuiInput,
  TuiLoader,
  TuiNotification,
  TuiScrollbar,
  TuiTitle,
} from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiBadgedContent,
  TuiBadgeNotification,
} from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe } from '@ngx-translate/core';

import { AreasService } from '../../services/areas.service';
import { AuthStateService } from '../../services/auth-state.service';
import { FilterStateService } from '../../services/filter-state.service';
import { FiltersService } from '../../services/filters.service';
import { OnlineStatusService } from '../../services/online-status.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';

import { ChartRoutesByGradeComponent } from '../../components/charts/chart-routes-by-grade';
import { EmptyStateComponent } from '../../components/ui/empty-state';
import { FilterButtonComponent } from '../../components/ui/filter-button';
import { OfflineNotCachedComponent } from '../../components/ui/offline-not-cached';

import { IconSrcPipe } from '../../pipes';
import { filterAreas, hasActiveAreaFilters } from '../../utils';

@Component({
  selector: 'app-my-areas',
  imports: [
    ChartRoutesByGradeComponent,
    EmptyStateComponent,
    FilterButtonComponent,
    IconSrcPipe,
    LowerCasePipe,
    OfflineNotCachedComponent,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiHeader,
    TuiInput,
    TuiLoader,
    TuiNotification,
    TuiScrollbar,
    TuiTitle,
  ],
  template: `
    <tui-scrollbar class="flex grow">
      <section class="w-full max-w-[1600px] mx-auto p-4">
        <header class="flex items-center justify-between gap-2">
          @let areasCount = filtered().length;
          <h1
            class="text-2xl font-bold w-full sm:w-auto flex items-center gap-2"
          >
            <tui-badged-content [style.--tui-radius.%]="50">
              @if (areasCount > 0) {
                <tui-badge-notification
                  tuiAppearance="accent"
                  size="s"
                  tuiSlot="top"
                >
                  {{ areasCount }}
                </tui-badge-notification>
              }
              <span
                [tuiAvatar]="'zone' | iconSrc"
                tuiThumbnail
                size="l"
                class="self-center"
                [attr.aria-label]="'nav.my-areas' | translate"
              ></span>
            </tui-badged-content>
            <span>{{ 'nav.my-areas' | translate }}</span>
          </h1>
        </header>

        <div tuiNotification size="m" class="my-4">
          {{ 'myAreas.notification' | translate }}
        </div>

        <div class="sticky top-0 z-10 py-4 flex items-end gap-2">
          <tui-textfield
            class="grow block bg-(--tui-background-base)"
            tuiTextfieldSize="l"
          >
            <label tuiLabel for="areas-search">
              {{ 'searchPlaceholder' | translate }}
            </label>
            <input
              tuiInput
              #areasSearch
              id="areas-search"
              autocomplete="off"
              [value]="query()"
              (input.zoneless)="onQuery(areasSearch.value)"
            />
          </tui-textfield>
          <app-filter-button
            class="bg-(--tui-background-base) rounded-2xl"
            [hasActiveFilters]="hasActiveFilters()"
            (clicked)="openFilters()"
          />
        </div>

        <!-- Areas list -->
        @if (!loading()) {
          <div
            class="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            @for (a of filtered(); track a.id) {
              <button
                class="p-6 rounded-3xl"
                [tuiAppearance]="a.liked ? 'outline-destructive' : 'outline'"
                (click.zoneless)="router.navigate(['/area', a.slug])"
              >
                <div class="flex flex-col min-w-0 grow">
                  <header tuiHeader>
                    <h2 tuiTitle>{{ a.name }}</h2>
                  </header>
                  <section class="flex items-center justify-between gap-2">
                    <div class="text-xl">
                      {{ a.crags_count }}
                      {{
                        (a.crags_count === 1 ? 'crag' : 'crags')
                          | translate
                          | lowercase
                      }}
                    </div>
                    <app-chart-routes-by-grade
                      (click.zoneless)="$event.stopPropagation()"
                      [grades]="a.grades"
                    />
                  </section>
                </div>
              </button>
            } @empty {
              <div class="col-span-full">
                @if (onlineStatus.isOffline()) {
                  <!-- Sin red no hay nada que filtrar: ofrecemos volver. -->
                  <app-offline-not-cached fallbackUrl="/home" />
                } @else {
                  <app-empty-state icon="@tui.map" message="myAreas.empty" />
                }
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
  host: { class: 'flex grow min-h-0' },
})
export class MyAreasComponent {
  protected readonly authState = inject(AuthStateService);
  protected readonly router = inject(Router);
  protected readonly areasService = inject(AreasService);
  protected readonly onlineStatus = inject(OnlineStatusService);
  protected readonly outdoorData = inject(OutdoorDataService);
  private readonly filterState = inject(FilterStateService);
  private readonly filtersService = inject(FiltersService);

  readonly loading = computed(
    () =>
      this.areasService.loading() ||
      this.outdoorData.areasListResource.isLoading() ||
      this.outdoorData.areasListResource.value() === undefined ||
      this.authState.userProfileResource.isLoading() ||
      this.authState.userProfileResource.value() === undefined ||
      (!this.authState.isAdmin() &&
        (this.authState.adminAreasResource.isLoading() ||
          this.authState.adminAreasResource.value() === undefined)),
  );
  readonly myAreaIds = this.authState.adminAreas;
  readonly areas = computed(() => {
    if (this.authState.isAdmin()) {
      return this.outdoorData.areasList();
    }
    const ids = new Set(this.myAreaIds().map((id) => Number(id)));
    return this.outdoorData.areasList().filter((a) => ids.has(Number(a.id)));
  });

  readonly query: WritableSignal<string> = signal('');
  readonly selectedGradeRange = this.filterState.areaListGradeRange;
  readonly selectedCategories = this.filterState.areaListCategories;
  readonly selectedShade = this.filterState.areaListShade;

  readonly hasActiveFilters = computed(() =>
    hasActiveAreaFilters({
      gradeRange: this.selectedGradeRange(),
      categories: this.selectedCategories(),
      shade: this.selectedShade(),
      toposOnly: this.filterState.areaListToposOnly(),
    }),
  );
  readonly filtered = computed(() =>
    filterAreas(this.areas(), {
      query: this.query(),
      gradeRange: this.selectedGradeRange(),
      categories: this.selectedCategories(),
      shade: this.selectedShade(),
      toposOnly: this.filterState.areaListToposOnly(),
    }),
  );

  onQuery(v: string) {
    this.query.set(v);
  }

  openFilters(): void {
    this.filtersService.openFilters({ showToposOnly: true });
  }
}

export default MyAreasComponent;
