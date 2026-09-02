import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  TuiAppearance,
  TuiButton,
  TuiDialogService,
  TuiDropdown,
  TuiIcon,
} from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiConfirmData,
  TuiSegmented,
  TuiSkeleton,
  TuiSwitch,
  TUI_CONFIRM,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { AuthStateService } from '../../services/auth-state.service';
import { SupabaseService } from '../../services/supabase.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { UserProfilesService } from '../../services/user-profiles.service';

import { Themes } from '../../models';

@Component({
  selector: 'app-menu-options-button',
  imports: [
    FormsModule,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiButton,
    TuiDropdown,
    TuiIcon,
    TuiSegmented,
    TuiSkeleton,
    TuiSwitch,
  ],
  template: `
    <div
      [tuiDropdown]="optionsDropdown"
      [tuiDropdownDirection]="direction()"
      [tuiDropdownManual]="open()"
      class="block w-full"
    >
      @if (avatarMode()) {
        <button
          type="button"
          [tuiAppearance]="appearance()"
          class="flex items-center p-3 rounded-xl transition-colors cursor-pointer select-none touch-manipulation"
          [tuiSkeleton]="loading()"
          (pointerdown)="onPointerDown($event)"
          (pointermove)="onPointerMove($event)"
          (pointerup)="onPointerUp()"
          (pointercancel)="onPointerCancel()"
          (pointerleave)="onPointerCancel()"
          (contextmenu)="onContextMenu($event)"
          (click)="onButtonClick($event)"
          [attr.aria-label]="'nav.profile' | translate"
        >
          <span
            tuiAvatar
            [tuiSkeleton]="loading()"
            [class.ring-2]="isActive()"
            [class.ring-offset-2]="isActive()"
            [style.--tw-ring-color]="
              isActive() ? 'var(--tui-text-negative)' : ''
            "
            size="xs"
          >
            @if (avatarUrl()) {
              <img [src]="avatarUrl()" [alt]="userName() || ''" />
            } @else {
              <tui-icon
                icon="@tui.user"
                [style.color]="
                  isActive()
                    ? 'var(--tui-text-negative)'
                    : 'var(--tui-text-primary)'
                "
              />
            }
          </span>
        </button>
      } @else if (iconOnly()) {
        <button
          [appearance]="appearance()"
          [size]="size()"
          tuiIconButton
          [iconStart]="icon()"
          [tuiSkeleton]="loading()"
          type="button"
          class="transition-colors"
          (click)="open.set(!open())"
        >
          <span class="tui-sr-only">{{ 'more' | translate }}</span>
        </button>
      } @else {
        <button
          type="button"
          [tuiAppearance]="appearance()"
          class="flex items-center gap-4 transition-colors p-3 rounded-xl w-full cursor-pointer no-underline text-inherit"
          [tuiSkeleton]="loading()"
          (click)="open.set(!open())"
        >
          <tui-icon [icon]="icon()" />
          <span
            class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden text-sm"
          >
            {{ 'more' | translate }}
          </span>
        </button>
      }
    </div>

    <ng-template #optionsDropdown>
      <div
        role="menu"
        tabindex="0"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
        class="flex flex-col p-1.5 bg-(--tui-background-base) rounded-xl shadow-2xl min-w-56 border border-(--tui-border-normal)"
      >
        @if (showNavigationOptions()) {
          @if (avatarMode() || showProfile()) {
            <!-- Profile -->
            <button
              type="button"
              (click)="navigateToProfile(); open.set(false)"
              class="flex items-center gap-3 px-3 py-2 text-sm hover:bg-(--tui-background-neutral-hover) rounded-lg transition-colors text-left text-inherit outline-none cursor-pointer"
            >
              <tui-icon icon="@tui.user" class="opacity-70" />
              {{ 'nav.profile' | translate }}
            </button>
          }

          <!-- Projects -->
          <button
            type="button"
            (click)="openProjects(); open.set(false)"
            class="flex items-center gap-3 px-3 py-2 text-sm hover:bg-(--tui-background-neutral-hover) rounded-lg transition-colors text-left text-inherit outline-none cursor-pointer"
          >
            <tui-icon icon="@tui.target" class="opacity-70" />
            {{ 'projects' | translate }}
          </button>

          <!-- Favorites -->
          <button
            type="button"
            (click)="openFavorites(); open.set(false)"
            class="flex items-center gap-3 px-3 py-2 text-sm hover:bg-(--tui-background-neutral-hover) rounded-lg transition-colors text-left text-inherit outline-none cursor-pointer"
          >
            <tui-icon icon="@tui.heart" class="opacity-70" />
            {{ 'likes' | translate }}
          </button>

          <!-- Ascent Logbook / Calendar -->
          <button
            type="button"
            (click)="openAscentsCalendar(); open.set(false)"
            class="flex items-center gap-3 px-3 py-2 text-sm hover:bg-(--tui-background-neutral-hover) rounded-lg transition-colors text-left text-inherit outline-none cursor-pointer"
          >
            <tui-icon icon="@tui.calendar" class="opacity-70" />
            {{ 'ascentCalendar' | translate }}
          </button>

          <div class="h-px bg-(--tui-border-normal) my-1 mx-2"></div>
        }

        <!-- User Config -->
        <button
          type="button"
          (click)="openConfig(); open.set(false)"
          class="flex items-center gap-3 px-3 py-2 text-sm hover:bg-(--tui-background-neutral-hover) rounded-lg transition-colors text-left text-inherit outline-none cursor-pointer"
        >
          <tui-icon icon="@tui.settings" class="opacity-70" />
          {{ 'config' | translate }}
        </button>

        <div class="h-px bg-(--tui-border-normal) my-1 mx-2"></div>

        <!-- Editing Mode -->
        <label
          class="flex items-center justify-between gap-4 px-3 py-2 w-full cursor-pointer hover:bg-(--tui-background-neutral-hover) rounded-lg transition-colors"
        >
          <div class="flex items-center gap-3 text-sm">
            <tui-icon icon="@tui.pencil" class="opacity-70" />
            {{ 'editingMode' | translate }}
          </div>
          <input
            tuiSwitch
            type="checkbox"
            [ngModel]="authState.editingMode()"
            (ngModelChange)="toggleEditingMode($event)"
            autocomplete="off"
          />
        </label>

        <!-- Theme Selection -->
        <div
          class="flex items-center justify-between gap-4 px-3 py-2 w-full hover:bg-(--tui-background-neutral-hover) rounded-lg transition-colors"
        >
          <div class="flex items-center gap-3 text-sm">
            <tui-icon icon="@tui.palette" class="opacity-70" />
            {{ 'theme' | translate }}
          </div>
          <tui-segmented
            size="s"
            [activeItemIndex]="themeService.theme() === Themes.DARK ? 1 : 0"
            (activeItemIndexChange)="toggleTheme($event === 1)"
            (mousedown)="lastEvent = $event"
          >
            <button title="light" type="button">
              <tui-icon icon="@tui.sun" />
            </button>
            <button title="dark" type="button">
              <tui-icon icon="@tui.moon" />
            </button>
          </tui-segmented>
        </div>

        <div class="h-px bg-(--tui-border-normal) my-1 mx-2"></div>

        <!-- Logout -->
        <button
          type="button"
          [tuiAppearance]="'secondary'"
          (click)="logout(); open.set(false)"
          class="flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors text-left outline-none cursor-pointer"
        >
          <tui-icon icon="@tui.log-out" class="opacity-70" />
          {{ 'auth.logout' | translate }}
        </button>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuOptionsButtonComponent {
  appearance = input<string>('flat-grayscale');
  size = input<'s' | 'm' | 'l'>('m');
  iconOnly = input<boolean>(false);
  avatarMode = input<boolean>(false);
  avatarUrl = input<string | null | undefined>(undefined);
  userName = input<string | null | undefined>(undefined);
  isActive = input<boolean>(false);
  showNavigationOptions = input<boolean>(false);
  showProfile = input<boolean>(false);
  holdToOpen = input<boolean | undefined>(undefined);
  loading = input<boolean>(false);
  direction = input<'top' | 'bottom'>('top');
  icon = input<string>('@tui.menu');

  protected readonly shouldHoldToOpen = computed(
    () => this.holdToOpen() ?? this.avatarMode(),
  );

  protected open = signal(false);
  protected lastEvent?: MouseEvent;
  protected readonly authState = inject(AuthStateService);
  protected readonly themeService = inject(ThemeService);
  protected readonly Themes = Themes;
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  private readonly userProfilesService = inject(UserProfilesService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject(ElementRef);

  private holdTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isHeld = false;
  private startX = 0;
  private startY = 0;
  private readonly HOLD_DURATION_MS = 400;
  private readonly MOVE_THRESHOLD_PX = 10;

  constructor() {
    this.destroyRef.onDestroy(() => this.clearHoldTimer());
  }

  protected onPointerDown(event: PointerEvent): void {
    if (!this.shouldHoldToOpen()) return;
    if (event.button !== 0) return;

    this.isHeld = false;
    this.startX = event.clientX;
    this.startY = event.clientY;

    this.clearHoldTimer();
    this.holdTimeoutId = setTimeout(() => {
      this.isHeld = true;
      this.open.set(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(40);
        } catch {
          // Ignore vibration error
        }
      }
    }, this.HOLD_DURATION_MS);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.shouldHoldToOpen() || !this.holdTimeoutId) return;

    const deltaX = Math.abs(event.clientX - this.startX);
    const deltaY = Math.abs(event.clientY - this.startY);

    if (deltaX > this.MOVE_THRESHOLD_PX || deltaY > this.MOVE_THRESHOLD_PX) {
      this.clearHoldTimer();
    }
  }

  protected onPointerUp(): void {
    if (!this.shouldHoldToOpen()) return;
    this.clearHoldTimer();
  }

  protected onPointerCancel(): void {
    this.clearHoldTimer();
  }

  protected onContextMenu(event: MouseEvent): void {
    if (this.shouldHoldToOpen()) {
      event.preventDefault();
      this.open.set(true);
    }
  }

  protected onButtonClick(event: MouseEvent): void {
    if (this.shouldHoldToOpen()) {
      if (this.isHeld) {
        event.preventDefault();
        event.stopPropagation();
        this.isHeld = false;
        return;
      }
      this.open.set(false);
      this.navigateToProfile();
    } else {
      this.open.set(!this.open());
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    const target = event.target as HTMLElement | null;
    const hostEl = this.elementRef.nativeElement as HTMLElement;
    if (hostEl && !hostEl.contains(target)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) {
      this.open.set(false);
    }
  }

  private clearHoldTimer(): void {
    if (this.holdTimeoutId) {
      clearTimeout(this.holdTimeoutId);
      this.holdTimeoutId = null;
    }
  }

  protected navigateToProfile(): void {
    void this.router.navigate(['/profile']);
  }

  protected openProjects(): void {
    this.userProfilesService.openProjectsDialog();
  }

  protected openFavorites(): void {
    this.userProfilesService.openFavoritesDialog();
  }

  protected openAscentsCalendar(): void {
    this.userProfilesService.openAscentCalendarDialog();
  }

  protected openConfig(): void {
    this.userProfilesService.openUserProfileConfigForm();
  }

  protected async logout(): Promise<void> {
    await this.supabase.logout();
  }

  protected async toggleEditingMode(enabled: boolean): Promise<boolean> {
    if (this.authState.editingMode() === enabled) {
      return true;
    }

    if (enabled && !this.authState.isAdmin()) {
      const hasPermissions = this.authState.isAreaAdmin();
      const messageKey = hasPermissions
        ? 'profile.editing.confirmationEquipper'
        : 'profile.editing.confirmationUser';

      const confirmed = await firstValueFrom(
        this.dialogs.open<boolean>(TUI_CONFIRM, {
          label: this.translate.instant('profile.editing.confirmationTitle'),
          size: 'm',
          data: {
            content: this.translate.instant(messageKey),
            yes: this.translate.instant('accept'),
            no: this.translate.instant('cancel'),
          } as TuiConfirmData,
        }),
        { defaultValue: false },
      );

      if (!confirmed) {
        // Force the switch to stay false
        this.authState.editingMode.set(false);
        return false;
      }
    }

    this.authState.editingMode.set(enabled);
    const result = await this.userProfilesService.updateUserProfile({
      editing_mode: enabled,
    });

    if (!result.success) {
      console.error(
        '[MenuOptionsButtonComponent] Error updating editing mode:',
        result.error,
      );
      this.toast.error('profile.saveError');
      // Revert the signal if failed
      this.authState.editingMode.set(!enabled);
      return false;
    } else {
      this.toast.success('profile.updated.editing_mode');
      return true;
    }
  }

  protected toggleTheme(dark: boolean): void {
    const theme = dark ? Themes.DARK : Themes.LIGHT;
    this.themeService.setTheme(theme, this.lastEvent);
    void this.userProfilesService
      .updateUserProfile({
        theme,
      })
      .then((res) => {
        if (res.success) {
          this.toast.success('profile.updated.theme');
        } else {
          console.error(
            '[MenuOptionsButtonComponent] Error updating theme:',
            res.error,
          );
          this.toast.error('profile.saveError');
        }
      });
  }
}
