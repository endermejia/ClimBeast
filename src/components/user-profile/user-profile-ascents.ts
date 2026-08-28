import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  TuiAppearance,
  TuiButton,
  TuiDataList,
  TuiInput,
  TuiLabel,
  TuiScrollbar,
} from '@taiga-ui/core';
import {
  TuiBadgedContent,
  TuiBadgeNotification,
  TuiDataListWrapper,
  TuiSelect,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { debounceTime, Subject } from 'rxjs';

import { FilterStateService } from '../../services/filter-state.service';
import { FiltersService } from '../../services/filters.service';
import { FollowsService } from '../../services/follows.service';
import { ProfileDataService } from '../../services/profile-data.service';
import { SupabaseService } from '../../services/supabase.service';
import { UserProfilesService } from '../../services/user-profiles.service';

import {
  FeedItem,
  ORDERED_GRADE_VALUES,
  RouteAscentWithExtras,
  UserProfileDto,
} from '../../models';

import { processAscentsToFeed } from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

import { AscentsFeedComponent } from '../ascent/ascents-feed';
import { EmptyStateComponent } from '../ui/empty-state';

@Component({
  selector: 'app-user-profile-ascents',
  standalone: true,
  imports: [
    AscentsFeedComponent,
    CommonModule,
    EmptyStateComponent,
    FormsModule,
    ReactiveFormsModule,
    TranslatePipe,
    TuiAppearance,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiButton,
    TuiDataList,
    TuiDataListWrapper,
    TuiInput,
    TuiLabel,
    TuiScrollbar,
    TuiSelect,
  ],
  template: `
    @if (
      profileData.userTotalAscentsCountResource.isLoading() ||
      hasAscents() ||
      query() ||
      hasActiveFilters()
    ) {
      <div class="flex flex-col w-full lg:h-full min-w-0 lg:min-h-0">
        @if (!profileData.userTotalAscentsCountResource.isLoading()) {
          <div
            class="flex flex-wrap items-center gap-2 mb-4 shrink-0 w-full min-w-0"
          >
            <tui-textfield
              class="grow min-w-0 basis-44"
              [tuiTextfieldCleaner]="true"
              tuiTextfieldSize="l"
            >
              <label tuiLabel for="route-search">{{
                'searchPlaceholder' | translate
              }}</label>
              <input
                tuiInput
                #routeSearch
                id="route-search"
                autocomplete="off"
                [value]="query()"
                (input.zoneless)="onQuery(routeSearch.value)"
              />
            </tui-textfield>

            <tui-badged-content class="shrink-0">
              @if (hasActiveFilters()) {
                <tui-badge-notification
                  tuiAppearance="accent"
                  size="s"
                  tuiSlot="top"
                />
              }
              <button
                tuiButton
                appearance="textfield"
                size="l"
                type="button"
                iconStart="@tui.sliders-horizontal"
                [attr.aria-label]="'filters' | translate"
                (click.zoneless)="openFilters()"
              ></button>
            </tui-badged-content>

            <tui-textfield
              class="grow min-w-0 basis-36 sm:w-48 sm:grow-0"
              [tuiTextfieldCleaner]="false"
              [stringify]="sortValueContent"
              tuiTextfieldSize="l"
            >
              <label tuiLabel for="sort-filter">
                {{ 'sortBy' | translate }}
              </label>
              <input
                tuiSelect
                id="sort-filter"
                [ngModel]="sortFilterValue()"
                (ngModelChange)="sortFilterValue.set($event)"
                autocomplete="off"
              />
              <tui-data-list *tuiDropdown>
                <tui-data-list-wrapper [items]="['grade', 'date']" />
              </tui-data-list>
            </tui-textfield>
          </div>
        }

        <tui-scrollbar class="w-full lg:flex-1 lg:min-h-0">
          <div class="w-full min-w-0 p-1 pr-3 sm:pr-4 pb-6">
            <app-ascents-feed
              [ascents]="accumulatedAscents()"
              [isLoading]="
                isLoading() ||
                ascentsResource.isLoading() ||
                profileData.userTotalAscentsCountResource.isLoading()
              "
              [hasMore]="hasMore()"
              [showUser]="false"
              [followedIds]="followedIds()"
              [columns]="1"
              [groupByGrade]="sortFilter() === 'grade'"
              (loadMore)="loadMore()"
              (follow)="onFollow($event)"
              (unfollow)="onUnfollow($event)"
            />
          </div>
        </tui-scrollbar>
      </div>
    } @else if (isOwnProfile()) {
      <div class="mt-8 flex flex-col items-center gap-4">
        <button
          tuiButton
          type="button"
          appearance="secondary"
          iconStart="@tui.download"
          (click.zoneless)="openImport8aDialog()"
        >
          {{ 'import' | translate }} 8a.nu
        </button>
      </div>
    } @else {
      <div class="flex flex-col items-center gap-3">
        <app-empty-state icon="@tui.list" />
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full min-w-0 lg:flex lg:flex-col lg:h-full lg:min-h-0',
  },
})
export class UserProfileAscentsComponent {
  userId = input.required<string>();
  isOwnProfile = input(false);
  profile = input<UserProfileDto | null | undefined>();

  protected readonly profileData = inject(ProfileDataService);
  protected readonly filterState = inject(FilterStateService);
  protected readonly supabase = inject(SupabaseService);
  protected readonly translate = inject(TranslateService);
  protected readonly followsService = inject(FollowsService);
  protected readonly filtersService = inject(FiltersService);
  protected readonly userProfilesService = inject(UserProfilesService);
  private readonly isBrowser = inject(IS_BROWSER);

  private readonly querySubject = new Subject<string>();
  protected readonly query = toSignal(
    this.querySubject.pipe(debounceTime(400)),
    { initialValue: '' },
  );

  protected readonly sortFilterValue = linkedSignal<'grade' | 'date'>(() =>
    this.profileData.ascentsSort(),
  );
  protected readonly sortFilter = this.sortFilterValue;

  protected readonly selectedGradeRange = this.filterState.areaListGradeRange;
  protected readonly selectedCategories = this.filterState.areaListCategories;

  protected readonly hasActiveFilters = computed(() => {
    const [lo, hi] = this.selectedGradeRange();
    const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
    return gradeActive || this.selectedCategories().length > 0;
  });

  protected readonly sortValueContent = (option: 'grade' | 'date'): string => {
    return this.translate.instant(
      option === 'grade' ? 'orderByGrade' : 'orderByDate',
    );
  };

  protected readonly accumulatedAscents = signal<FeedItem[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly followedIds = signal<Set<string>>(new Set());

  readonly ascentsResource = this.profileData.userAscentsResource;
  readonly totalAscents = computed(
    () => this.ascentsResource.value()?.total ?? 0,
  );
  readonly hasMore = computed(() => {
    return this.accumulatedAscents().length < this.totalAscents();
  });
  readonly hasAscents = computed(() => {
    const count = this.profileData.userTotalAscentsCountResource.value();
    return count !== undefined && count !== 0;
  });

  constructor() {
    effect(() => {
      this.followsService.followChange();
      if (this.isBrowser) {
        void this.followsService
          .getFollowedIds()
          .then((ids) => this.followedIds.set(new Set(ids)));
      }
    });

    effect(() => {
      const res = this.ascentsResource.value();
      if (res) {
        const page = untracked(() => this.profileData.ascentsPage());
        if (page === 0) {
          const processed = processAscentsToFeed(res.items);
          this.accumulatedAscents.set(processed);
        } else {
          this.accumulatedAscents.update((prev) => {
            const prevAscents = prev as RouteAscentWithExtras[];
            return processAscentsToFeed([...prevAscents, ...res.items]);
          });
        }
        this.isLoading.set(false);
      } else if (this.ascentsResource.error()) {
        this.isLoading.set(false);
      }
    });

    effect(() => {
      const query = this.query();
      const sort = this.sortFilter();
      this.selectedGradeRange();
      this.selectedCategories();
      this.profileData.ascentsDateFilter();

      this.isLoading.set(true);
      this.profileData.ascentsPage.set(0);

      this.profileData.ascentsQuery.set(query || null);
      this.profileData.ascentsSort.set(sort as 'grade' | 'date');
    });
  }

  loadMore() {
    if (this.hasMore() && !this.isLoading()) {
      this.isLoading.set(true);
      this.profileData.ascentsPage.update((p) => p + 1);
    }
  }

  onQuery(v: string) {
    this.querySubject.next(v);
  }

  onFollow(userId: string) {
    this.followedIds.update((s) => {
      const next = new Set(s);
      next.add(userId);
      return next;
    });
  }

  onUnfollow(userId: string) {
    this.followedIds.update((s) => {
      const next = new Set(s);
      next.delete(userId);
      return next;
    });
  }

  protected openFilters(): void {
    this.filtersService.openFilters({ showShade: false });
  }

  protected openImport8aDialog(): void {
    this.userProfilesService.openImport8aDialog();
  }
}
