import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  TuiDropdown,
  TuiError,
  TuiIcon,
  TuiNotification,
  TuiTextfield,
} from '@taiga-ui/core';
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
    TuiNotification,
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

    <!-- Modo Edición -->
    <div class="mt-8 pt-8 border-t border-(--tui-border-normal)">
      <div class="flex items-center justify-between gap-4 mb-4">
        <h2 class="text-lg font-bold m-0 flex items-center gap-2">
          <tui-icon icon="@tui.pencil" />
          {{ 'editingMode' | translate }}
        </h2>
        <input
          id="editingSwitch"
          tuiSwitch
          type="checkbox"
          [ngModel]="model().editingMode"
          (ngModelChange)="editingModeChange.emit($event)"
          autocomplete="off"
        />
      </div>

      <div tuiNotification appearance="info" class="mt-2">
        <div
          class="text-base font-bold text-(--tui-text-primary) border-b border-(--tui-border-hint) pb-2 mb-3"
        >
          {{ 'profile.editing.infoTitle' | translate }}
        </div>
        <ul class="list-none p-0 m-0 space-y-4 opacity-90">
          <li class="flex items-start gap-3">
            <tui-icon icon="@tui.plus" size="s" class="mt-0.5 text-primary" />
            <span>{{ 'profile.editing.infoContribute' | translate }}</span>
          </li>

          <li class="flex flex-col gap-3">
            <div class="flex items-start gap-3">
              <tui-icon
                icon="@tui.user-plus"
                size="s"
                class="mt-0.5 text-primary"
              />
              <span>{{ 'profile.editing.infoRequestAdmin' | translate }}</span>
            </div>

            <ul class="list-none pl-9 m-0 space-y-2 opacity-90 text-[0.95em]">
              <li class="flex items-start gap-2">
                <tui-icon
                  icon="@tui.image"
                  size="xs"
                  class="mt-1 text-primary"
                />
                <span>{{ 'profile.editing.infoManageTopos' | translate }}</span>
              </li>
              <li class="flex items-start gap-2">
                <tui-icon
                  icon="@tui.credit-card"
                  size="xs"
                  class="mt-1 text-primary"
                />
                <span>{{
                  'profile.editing.infoMonetization' | translate
                }}</span>
              </li>
            </ul>
          </li>
        </ul>
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

  readonly updateModel = output<{ field: string; value: unknown }>();
  readonly saveLanguage = output<void>();
  readonly toggleTheme = output<boolean>();
  readonly restartFirstStepsChange = output<boolean>();
  readonly messageSoundChange = output<boolean>();
  readonly notificationSoundChange = output<boolean>();
  readonly privateProfileChange = output<boolean>();
  readonly editingModeChange = output<boolean>();

  readonly Themes = Themes;

  protected onModelChange(field: string, value: unknown): void {
    this.updateModel.emit({ field, value });
  }
}
