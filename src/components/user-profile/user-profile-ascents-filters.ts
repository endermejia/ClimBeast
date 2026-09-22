import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  linkedSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import {
  TuiDataList,
  TuiDropdown,
  TuiInput,
  TuiLabel,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiSelect, TuiDataListWrapper } from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { debounceTime, Subject } from 'rxjs';

import { ProfileDataService } from '../../services/profile-data.service';

@Component({
  selector: 'app-user-profile-ascents-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    TuiDataList,
    TuiDataListWrapper,
    TuiDropdown,
    TuiInput,
    TuiLabel,
    TuiSelect,
    TuiTextfield,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex flex-wrap items-center gap-2 w-full min-w-0 px-4 lg:px-1 pt-2 mb-4 shrink-0"
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
  `,
})
export class UserProfileAscentsFiltersComponent {
  protected readonly profileData = inject(ProfileDataService);
  private readonly translate = inject(TranslateService);

  private readonly querySubject = new Subject<string>();
  protected readonly query = toSignal(
    this.querySubject.pipe(debounceTime(400)),
    { initialValue: '' },
  );

  protected readonly sortFilterValue = linkedSignal<'grade' | 'date'>(() =>
    this.profileData.ascentsSort(),
  );

  protected readonly sortValueContent = (option: 'grade' | 'date'): string => {
    return this.translate.instant(
      option === 'grade' ? 'orderByGrade' : 'orderByDate',
    );
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
}
