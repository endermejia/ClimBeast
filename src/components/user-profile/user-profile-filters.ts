import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  TuiButton,
  TuiDataList,
  TuiInput,
  TuiLabel,
  TuiTextfield,
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
import { ProfileDataService } from '../../services/profile-data.service';

import { ORDERED_GRADE_VALUES } from '../../models';

import { getAscentDateFilterOptions } from '../../utils';

@Component({
  selector: 'app-user-profile-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslatePipe,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiButton,
    TuiDataList,
    TuiDataListWrapper,
    TuiInput,
    TuiLabel,
    TuiSelect,
    TuiTextfield,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-2 mb-4 shrink-0 w-full min-w-0 px-1 pt-1">
      <!-- Primary Date Filter (Top) -->
      <tui-textfield
        class="w-full font-bold"
        [tuiTextfieldCleaner]="false"
        [stringify]="dateValueContent"
        tuiTextfieldSize="l"
      >
        <input
          tuiSelect
          id="date-filter"
          class="font-bold!"
          [ngModel]="dateFilterValue()"
          (ngModelChange)="dateFilterValue.set($event)"
          autocomplete="off"
        />
        <tui-data-list *tuiDropdown>
          <tui-data-list-wrapper new [items]="dateFilterOptions()" />
        </tui-data-list>
      </tui-textfield>

      <!-- Search Query + Modal Filters Button + Sort By -->
      <div class="flex flex-wrap items-center gap-2 w-full min-w-0">
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
          class="grow min-w-0 basis-32 sm:basis-36"
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
    </div>
  `,
})
export class UserProfileFiltersComponent {
  protected readonly profileData = inject(ProfileDataService);
  protected readonly filterState = inject(FilterStateService);
  protected readonly filtersService = inject(FiltersService);
  private readonly translate = inject(TranslateService);

  private readonly querySubject = new Subject<string>();
  protected readonly query = toSignal(
    this.querySubject.pipe(debounceTime(400)),
    { initialValue: '' },
  );

  protected readonly sortFilterValue = linkedSignal<'grade' | 'date'>(() =>
    this.profileData.ascentsSort(),
  );

  protected readonly dateFilterValue = this.profileData.ascentsDateFilter;

  protected readonly dateFilterOptions = computed(() => {
    return getAscentDateFilterOptions(
      this.profileData.effectiveStartingClimbingYear(),
    );
  });

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

  protected readonly dateValueContent = (option: string): string => {
    if (option === 'last12' || option === 'last_12_months') {
      return this.translate.instant('last12Months');
    }
    if (option === 'all' || option === 'all_time') {
      return this.translate.instant('allTime');
    }
    return option;
  };

  constructor() {
    effect(() => {
      const query = this.query();
      const sort = this.sortFilterValue();

      this.profileData.ascentsPage.set(0);
      this.profileData.ascentsQuery.set(query || null);
      this.profileData.ascentsSort.set(sort as 'grade' | 'date');
    });
  }

  onQuery(v: string) {
    this.querySubject.next(v);
  }

  protected openFilters(): void {
    this.filtersService.openFilters({ showShade: false });
  }
}
