import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { TuiAppearance, TuiDialogService, TuiIcon } from '@taiga-ui/core';
import {
  TUI_CONFIRM,
  TuiConfirmData,
  TuiSegmented,
  TuiSwitch,
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
  selector: 'app-menu-options-dropdown',
  imports: [
    FormsModule,
    TranslatePipe,
    TuiAppearance,
    TuiIcon,
    TuiSegmented,
    TuiSwitch,
  ],
  template: `
    <div
      role="menu"
      tabindex="0"
      (click)="$event.stopPropagation()"
      (keydown)="$event.stopPropagation()"
      class="flex flex-col p-1.5 bg-(--tui-background-base) rounded-xl shadow-2xl min-w-56 border border-(--tui-border-normal)"
    >
      @if (showNavigationOptions()) {
        @if (showProfile()) {
          <!-- Profile -->
          <button
            type="button"
            (click)="navigateToProfile()"
            class="flex items-center gap-3 px-3 py-2 text-sm hover:bg-(--tui-background-neutral-hover) rounded-lg transition-colors text-left text-inherit outline-none cursor-pointer"
          >
            <tui-icon icon="@tui.user" class="opacity-70" />
            {{ 'nav.profile' | translate }}
          </button>
        }

        <!-- Projects -->
        <button
          type="button"
          (click)="openProjects()"
          class="flex items-center gap-3 px-3 py-2 text-sm hover:bg-(--tui-background-neutral-hover) rounded-lg transition-colors text-left text-inherit outline-none cursor-pointer"
        >
          <tui-icon icon="@tui.target" class="opacity-70" />
          {{ 'projects' | translate }}
        </button>

        <!-- Favorites -->
        <button
          type="button"
          (click)="openFavorites()"
          class="flex items-center gap-3 px-3 py-2 text-sm hover:bg-(--tui-background-neutral-hover) rounded-lg transition-colors text-left text-inherit outline-none cursor-pointer"
        >
          <tui-icon icon="@tui.heart" class="opacity-70" />
          {{ 'likes' | translate }}
        </button>

        <!-- Ascent Logbook / Calendar -->
        <button
          type="button"
          (click)="openAscentsCalendar()"
          class="flex items-center gap-3 px-3 py-2 text-sm hover:bg-(--tui-background-neutral-hover) rounded-lg transition-colors text-left text-inherit outline-none cursor-pointer"
        >
          <tui-icon icon="@tui.calendar" class="opacity-70" />
          {{ 'ascentCalendar' | translate }}
        </button>

        <div class="h-px bg-(--tui-border-normal) my-1 mx-2"></div>
      }

      @if (authState.isAdmin() || authState.isAreaAdmin()) {
        @if (authState.isAdmin()) {
          <!-- Administration -->
          <button
            type="button"
            (click)="navigateToAdmin()"
            class="flex items-center gap-3 px-3 py-2 text-sm hover:bg-(--tui-background-neutral-hover) rounded-lg transition-colors text-left text-inherit outline-none cursor-pointer"
          >
            <tui-icon icon="@tui.shield" class="opacity-70" />
            {{ 'admin.title' | translate }}
          </button>
        }

        @if (authState.isAreaAdmin()) {
          <!-- Manage My Areas -->
          <button
            type="button"
            (click)="navigateToMyAreas()"
            class="flex items-center gap-3 px-3 py-2 text-sm hover:bg-(--tui-background-neutral-hover) rounded-lg transition-colors text-left text-inherit outline-none cursor-pointer"
          >
            <tui-icon icon="@tui.shield" class="opacity-70" />
            {{ 'admin.manageMyAreas' | translate }}
          </button>
        }

        <div class="h-px bg-(--tui-border-normal) my-1 mx-2"></div>
      }

      <!-- User Config -->
      <button
        type="button"
        (click)="openConfig()"
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
        (click)="logout()"
        class="flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors text-left outline-none cursor-pointer"
      >
        <tui-icon icon="@tui.log-out" class="opacity-70" />
        {{ 'auth.logout' | translate }}
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuOptionsDropdownComponent {
  showNavigationOptions = input<boolean>(false);
  showProfile = input<boolean>(false);

  readonly closeDropdown = output<void>();

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

  protected navigateToProfile(): void {
    this.closeDropdown.emit();
    void this.router.navigate(['/profile']);
  }

  protected openProjects(): void {
    this.closeDropdown.emit();
    this.userProfilesService.openProjectsDialog();
  }

  protected openFavorites(): void {
    this.closeDropdown.emit();
    this.userProfilesService.openFavoritesDialog();
  }

  protected openAscentsCalendar(): void {
    this.closeDropdown.emit();
    this.userProfilesService.openAscentCalendarDialog();
  }

  protected navigateToAdmin(): void {
    this.closeDropdown.emit();
    void this.router.navigate(['/admin']);
  }

  protected navigateToMyAreas(): void {
    this.closeDropdown.emit();
    void this.router.navigate(['/my-areas']);
  }

  protected openConfig(): void {
    this.closeDropdown.emit();
    this.userProfilesService.openUserProfileConfigForm();
  }

  protected async logout(): Promise<void> {
    this.closeDropdown.emit();
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
        '[MenuOptionsDropdownComponent] Error updating editing mode:',
        result.error,
      );
      this.toast.error('profile.saveError');
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
            '[MenuOptionsDropdownComponent] Error updating theme:',
            res.error,
          );
          this.toast.error('profile.saveError');
        }
      });
  }
}
