import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TuiDropdown, TuiError, TuiIcon, TuiTextfield } from '@taiga-ui/core';
import {
  TuiChevron,
  TuiDataListWrapper,
  TuiSegmented,
  TuiSelect,
  TuiSkeleton,
  TuiSwitch,
} from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { Language, ProfileConfigModel, Themes } from '../../models';

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
    TuiSwitch,
    TuiTextfield,
  ],
  template: `
    <!-- PREFERENCES -->
    <div class="flex items-center justify-between gap-4 mt-6">
      <h2 class="text-lg font-bold m-0">
        {{ 'preferences' | translate }}
      </h2>
    </div>

    <!-- Language & Theme -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Left Column: Language & Theme -->
      <div class="flex flex-col gap-6">
        <!-- Language -->
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

        <!-- Theme -->
        <tui-segmented
          size="l"
          class="w-fit"
          [activeItemIndex]="
            profileForm().theme().value() === Themes.DARK ? 1 : 0
          "
          (activeItemIndexChange)="toggleTheme.emit($event === 1)"
        >
          <button title="light" type="button">
            <tui-icon icon="@tui.sun" />
          </button>
          <button title="dark" type="button">
            <tui-icon icon="@tui.moon" />
          </button>
        </tui-segmented>
      </div>

      <!-- Right Column: Switches -->
      <div class="flex flex-col items-end gap-4">
        <!-- Switches -->
        <div class="flex items-center gap-4">
          <label tuiLabel for="pushNotificationsSwitch">{{
            'pushNotifications' | translate
          }}</label>
          <input
            id="pushNotificationsSwitch"
            tuiSwitch
            type="checkbox"
            [ngModel]="pushEnabled()"
            [disabled]="!pushSupported()"
            (ngModelChange)="pushNotificationsChange.emit($event)"
            autocomplete="off"
          />
        </div>

        <div class="flex items-center gap-4">
          <label tuiLabel for="firstStepsSwitch">{{
            'firstSteps' | translate
          }}</label>
          <input
            id="firstStepsSwitch"
            tuiSwitch
            type="checkbox"
            [ngModel]="model().restartFirstSteps"
            (ngModelChange)="restartFirstStepsChange.emit($event)"
            autocomplete="off"
          />
        </div>

        <div class="flex items-center gap-4">
          <label tuiLabel for="msgSoundUtil">{{
            'messageSound' | translate
          }}</label>
          <input
            id="msgSoundUtil"
            tuiSwitch
            type="checkbox"
            [ngModel]="model().messageSound"
            (ngModelChange)="messageSoundChange.emit($event)"
            autocomplete="off"
          />
        </div>

        <div class="flex items-center gap-4">
          <label tuiLabel for="notifSoundUtil">{{
            'notificationSound' | translate
          }}</label>
          <input
            id="notifSoundUtil"
            tuiSwitch
            type="checkbox"
            [ngModel]="model().notificationSound"
            (ngModelChange)="notificationSoundChange.emit($event)"
            autocomplete="off"
          />
        </div>

        <div class="flex items-center gap-4">
          <label tuiLabel for="privateSwitch">{{
            'privateProfile' | translate
          }}</label>
          <input
            id="privateSwitch"
            tuiSwitch
            type="checkbox"
            [ngModel]="model().isPrivate"
            (ngModelChange)="privateProfileChange.emit($event)"
            autocomplete="off"
          />
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  readonly pushSupported = input<boolean>(false);
  readonly pushEnabled = input<boolean>(false);

  readonly updateModel = output<{ field: string; value: unknown }>();
  readonly saveLanguage = output<void>();
  readonly toggleTheme = output<boolean>();
  readonly restartFirstStepsChange = output<boolean>();
  readonly messageSoundChange = output<boolean>();
  readonly notificationSoundChange = output<boolean>();
  readonly pushNotificationsChange = output<boolean>();
  readonly privateProfileChange = output<boolean>();

  readonly Themes = Themes;

  protected onModelChange(field: string, value: unknown): void {
    this.updateModel.emit({ field, value });
  }
}
