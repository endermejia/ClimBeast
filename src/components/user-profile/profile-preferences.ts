import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TuiDropdown, TuiError, TuiIcon, TuiTextfield } from '@taiga-ui/core';
import {
  TuiChevron,
  TuiDataListWrapper,
  TuiSegmented,
  TuiSelect,
  TuiSkeleton,
} from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { Language, ProfileConfigModel, Themes } from '../../models';

import { ThemeTransitionEvent } from '../../utils';

@Component({
  selector: 'app-profile-preferences',
  host: { class: 'contents' },
  imports: [
    FormsModule,
    TranslatePipe,
    TuiChevron,
    TuiDataListWrapper,
    TuiDropdown,
    TuiError,
    TuiIcon,
    TuiSegmented,
    TuiSelect,
    TuiSkeleton,
    TuiTextfield,
  ],
  template: `
    <section
      class="flex flex-col gap-4 pt-6 mt-4 border-t border-(--tui-border-normal)"
    >
      <h2 class="text-lg font-bold m-0 text-(--tui-text-primary)">
        {{ 'preferences' | translate }}
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <!-- Language -->
        <div class="flex flex-col">
          <tui-textfield
            tuiChevron
            [tuiTextfieldCleaner]="false"
            [stringify]="stringifyLanguage()"
          >
            <label tuiLabel for="languageSelect">{{
              'language' | translate
            }}</label>
            <input
              id="languageSelect"
              tuiSelect
              [ngModel]="model().language"
              (ngModelChange)="
                onModelChange('language', $event); saveLanguage.emit()
              "
              [invalid]="profileForm().language().invalid()"
              [disabled]="profileForm().language().disabled()"
              [tuiSkeleton]="!userEmail()"
              autocomplete="off"
            />
            <tui-data-list-wrapper *tuiDropdown new [items]="languages()" />
          </tui-textfield>
          <tui-error [error]="languageError()" />
        </div>

        <!-- Theme (grouped together with palette icon, aligned nicely) -->
        <div
          class="flex items-center justify-between md:justify-end gap-4 py-1"
        >
          <div
            class="flex items-center gap-2.5 text-sm font-medium text-(--tui-text-primary)"
          >
            <tui-icon icon="@tui.palette" class="opacity-70" />
            <span>{{ 'theme' | translate }}</span>
          </div>
          <tui-segmented
            size="m"
            class="w-fit shrink-0"
            [activeItemIndex]="
              profileForm().theme().value() === Themes.DARK ? 1 : 0
            "
            (pointerdown)="themeEvent.emit($event)"
            (mousedown)="themeEvent.emit($event)"
            (activeItemIndexChange)="toggleTheme.emit($event === 1)"
          >
            <button
              title="light"
              type="button"
              (click)="themeEvent.emit($event)"
            >
              <tui-icon icon="@tui.sun" />
            </button>
            <button
              title="dark"
              type="button"
              (click)="themeEvent.emit($event)"
            >
              <tui-icon icon="@tui.moon" />
            </button>
          </tui-segmented>
        </div>
      </div>
    </section>
  `,
})
export class ProfilePreferencesComponent {
  readonly model = input.required<ProfileConfigModel>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly profileForm = input.required<any>();
  readonly languages = input<readonly Language[]>([]);
  readonly stringifyLanguage = input<(lang: unknown) => string>((x: unknown) =>
    String(x),
  );
  readonly userEmail = input<string>('');
  readonly languageError = input<string | null>(null);

  readonly updateModel = output<{ field: string; value: unknown }>();
  readonly saveLanguage = output<void>();
  readonly themeEvent = output<ThemeTransitionEvent>();
  readonly toggleTheme = output<boolean>();

  readonly Themes = Themes;

  protected onModelChange(field: string, value: unknown): void {
    this.updateModel.emit({ field, value });
  }
}
