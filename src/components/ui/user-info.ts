import { CommonModule, LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  inject,
  output,
} from '@angular/core';

import { TuiIcon } from '@taiga-ui/core';
import { TuiCountryIsoCode } from '@taiga-ui/i18n';
import { TuiAvatar, TuiSkeleton, TUI_COUNTRIES } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { AvatarUrlPipe } from '../../pipes';

@Component({
  selector: 'app-user-info',
  standalone: true,
  imports: [
    AvatarUrlPipe,
    CommonModule,
    LowerCasePipe,
    TranslatePipe,
    TuiAvatar,
    TuiIcon,
    TuiSkeleton,
  ],
  template: `
    <div class="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4">
      <div class="relative sm:row-span-2">
        <span
          tuiAvatar
          [tuiSkeleton]="loading()"
          [size]="avatarSize()"
          class="rounded-full! overflow-hidden transition-transform"
          [class.cursor-pointer]="avatarClickable()"
          [class.hover:scale-105]="avatarClickable()"
          [class.active:scale-95]="avatarClickable()"
          [class.focus-visible:outline-(--tui-border-accent)]="
            avatarClickable()
          "
          [tabindex]="avatarClickable() ? 0 : -1"
          (click)="avatarClick.emit()"
          (keydown.enter)="avatarClick.emit()"
          (keydown.space)="$event.preventDefault(); avatarClick.emit()"
        >
          @if (avatar(); as photo) {
            <img
              [src]="photo | avatarUrl"
              [alt]="name() || ''"
              class="w-full h-full object-cover rounded-full!"
            />
          } @else {
            <tui-icon [icon]="defaultIcon()" />
          }
        </span>
        <ng-content select="[badge]" />
      </div>

      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h1
            class="font-semibold wrap-anywhere min-w-0"
            [class.text-xl]="!compact()"
            [class.text-base]="compact()"
            [class.cursor-pointer]="nameClickable()"
            [class.hover:underline]="nameClickable()"
            [tuiSkeleton]="loading() ? 'name lastName' : false"
            [tabindex]="nameClickable() ? 0 : -1"
            (click)="nameClickable() ? nameClick.emit() : null"
            (keydown.enter)="nameClickable() ? nameClick.emit() : null"
            (keydown.space)="
              $event.preventDefault(); nameClickable() ? nameClick.emit() : null
            "
          >
            {{ name() }}
          </h1>
          <ng-content select="[nameActions]" />
        </div>

        <div class="flex items-center gap-x-2 flex-wrap">
          <span
            class="flex items-center gap-2"
            [tuiSkeleton]="loading() ? 'country, city' : false"
          >
            {{ country() ? countriesNames()[country()!] : ''
            }}{{ country() && city() ? ', ' : '' }}{{ city() || '' }}
          </span>
          @if (age(); as userAge) {
            |
            <span>
              {{ userAge }}
              {{ 'years' | translate | lowercase }}
            </span>
          }
          @if (startingClimbingYear(); as year) {
            <span class="opacity-70">
              |
              {{ 'startingClimbingYear' | translate }} {{ year }}
            </span>
          }
        </div>

        <ng-content select="[extraInfo]" />
      </div>

      <div class="col-span-full mt-2 sm:col-[2_/_3]">
        @if (bio() || loading()) {
          <span
            class="wrap-anywhere opacity-80 block mb-1"
            [tuiSkeleton]="
              loading()
                ? 'This text serves as the content behind the skeleton and adjusts the width.'
                : false
            "
          >
            {{ bio() }}
          </span>
        }

        @if (hasActions()) {
          <div class="mt-3 min-w-0 max-w-full">
            <ng-content select="[actions]" />
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserInfoComponent {
  hasActions = input<boolean>(false);
  loading = input<boolean>(false);
  compact = input<boolean>(false);
  avatarSize = input<'m' | 'l' | 'xl' | 'xxl'>('xxl');
  avatar = input<string | null | undefined>();
  name = input<string | null | undefined>();
  city = input<string | null | undefined>();
  country = input<TuiCountryIsoCode | null | undefined>();
  age = input<number | null | undefined>();
  startingClimbingYear = input<number | null | undefined>();
  bio = input<string | null | undefined>();

  defaultIcon = input<string>('@tui.user');
  avatarClickable = input<boolean>(false);
  nameClickable = input<boolean>(false);

  avatarClick = output<void>();
  nameClick = output<void>();

  protected readonly countriesNames = inject(TUI_COUNTRIES);
}
