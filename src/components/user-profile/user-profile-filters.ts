import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  TuiAppearance,
  TuiButton,
  TuiDataList,
  TuiDialogService,
  TuiDropdownOptionsDirective,
  TuiInput,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  TuiBadgedContent,
  TuiBadgeNotification,
  TuiDataListWrapper,
  TuiSelect,
} from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { FilterStateService } from '../../services/filter-state.service';
import { LayoutService } from '../../services/layout.service';
import { ProfileDataService } from '../../services/profile-data.service';

import { ORDERED_GRADE_VALUES } from '../../models';

import { getAscentDateFilterOptions } from '../../utils';

import { FilterDialog, FilterDialogComponent } from '../dialogs/filter-dialog';

@Component({
  selector: 'app-user-profile-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslatePipe,
    TuiAppearance,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiButton,
    TuiDataList,
    TuiDataListWrapper,
    TuiDropdownOptionsDirective,
    TuiInput,
    TuiSelect,
    TuiTextfield,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex flex-col gap-2 mb-4 shrink-0 w-full min-w-0 px-0 lg:px-1 pt-2"
    >
      <!-- Indoor/Outdoor + Date Filter + Filters Button -->
      <div class="flex items-center gap-2 w-full min-w-0">
        <tui-textfield
          class="basis-28 sm:basis-32 grow-0 shrink-0 min-w-0 font-bold"
          [tuiDropdownLimitWidth]="'min'"
          [tuiTextfieldCleaner]="false"
          [stringify]="ioValueContent"
          [tuiTextfieldSize]="textFieldSize()"
        >
          <input
            tuiSelect
            id="io-filter"
            class="font-bold!"
            [ngModel]="ioFilterValue()"
            (ngModelChange)="onIoFilterChange($event)"
            autocomplete="off"
          />
          <tui-data-list *tuiDropdown>
            <tui-data-list-wrapper new [items]="ioOptions" />
          </tui-data-list>
        </tui-textfield>

        <tui-textfield
          class="grow min-w-0 font-bold"
          [tuiDropdownLimitWidth]="'min'"
          [tuiTextfieldCleaner]="false"
          [stringify]="dateValueContent"
          [tuiTextfieldSize]="textFieldSize()"
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
            [size]="textFieldSize()"
            type="button"
            iconStart="@tui.sliders-horizontal"
            [attr.aria-label]="'filters' | translate"
            (click.zoneless)="openFilters()"
          ></button>
        </tui-badged-content>
      </div>
    </div>
  `,
})
export class UserProfileFiltersComponent {
  protected readonly profileData = inject(ProfileDataService);
  protected readonly filterState = inject(FilterStateService);
  protected readonly layout = inject(LayoutService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  protected readonly textFieldSize = computed(() =>
    this.layout.isMobile() ? 'm' : 'l',
  );

  protected readonly showIndoor = this.filterState.profileAscentsShowIndoor;
  protected readonly showOutdoor = this.filterState.profileAscentsShowOutdoor;

  protected readonly ioOptions = ['outdoor', 'indoor', 'both'] as const;

  protected readonly ioFilterValue = computed(() => {
    const indoor = this.showIndoor();
    const outdoor = this.showOutdoor();
    if (indoor && outdoor) return 'both';
    if (indoor) return 'indoor';
    return 'outdoor';
  });

  protected readonly ioValueContent = (option: string): string => {
    if (option === 'both')
      return this.translate.instant('filters.indoorOutdoor.all');
    if (option === 'outdoor') return this.translate.instant('outdoor.button');
    if (option === 'indoor') return this.translate.instant('indoor.button');
    return option;
  };

  onIoFilterChange(value: string) {
    if (value === 'both') {
      this.filterState.profileAscentsShowOutdoor.set(true);
      this.filterState.profileAscentsShowIndoor.set(true);
    } else if (value === 'indoor') {
      this.filterState.profileAscentsShowOutdoor.set(false);
      this.filterState.profileAscentsShowIndoor.set(true);
    } else {
      this.filterState.profileAscentsShowOutdoor.set(true);
      this.filterState.profileAscentsShowIndoor.set(false);
    }
  }

  protected readonly selectedGradeRange =
    this.filterState.profileAscentsGradeRange;
  protected readonly selectedCategories =
    this.filterState.profileAscentsCategories;

  protected readonly hasActiveFilters = computed(() => {
    const [lo, hi] = this.selectedGradeRange();
    const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
    const categoriesActive = this.selectedCategories().length > 0;
    return gradeActive || categoriesActive;
  });

  protected readonly sortFilterValue = linkedSignal<'grade' | 'date'>(() =>
    this.profileData.ascentsSort(),
  );

  protected readonly dateFilterValue = this.profileData.ascentsDateFilter;

  protected readonly dateFilterOptions = computed(() => {
    return getAscentDateFilterOptions(
      this.profileData.effectiveStartingClimbingYear(),
    );
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

  protected openFilters(): void {
    const data: FilterDialog = {
      categories: this.filterState.profileAscentsCategories(),
      gradeRange: this.filterState.profileAscentsGradeRange(),
      showCategories: true,
      showGradeRange: true,
      showShade: false,
      showIndoorOutdoor: false,
    };

    void firstValueFrom(
      this.dialogs.open<FilterDialog>(
        new PolymorpheusComponent(FilterDialogComponent),
        {
          label: this.translate.instant('filters'),
          size: 'l',
          data,
          dismissible: false,
        },
      ),
      { defaultValue: null },
    ).then((result) => {
      if (!result) return;
      this.filterState.profileAscentsCategories.set(result.categories ?? []);
      if (result.gradeRange) {
        this.filterState.profileAscentsGradeRange.set(result.gradeRange);
      }
    });
  }
}
