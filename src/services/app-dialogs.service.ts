import { inject, Injectable } from '@angular/core';

import { TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM, type TuiConfirmData } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import type { ChatDialogData } from '../components/dialogs/chat-dialog';

export interface ConfirmDialogOptions {
  /** Direct label string (takes precedence over `labelKey`). */
  label?: string;
  /** Translation key for the dialog label. */
  labelKey?: string;
  /** Interpolation params for `labelKey`. */
  labelParams?: Record<string, unknown>;
  /** Direct content string (takes precedence over `contentKey`). */
  content?: string;
  /** Translation key for the dialog content. */
  contentKey?: string;
  /** Interpolation params for `contentKey`. */
  contentParams?: Record<string, unknown>;
  /** Direct confirm button label (takes precedence over `yesKey`). */
  yes?: string;
  /** Translation key for the confirm button label. Defaults to `'accept'`. */
  yesKey?: string;
  /** Direct cancel button label (takes precedence over `noKey`). */
  no?: string;
  /** Translation key for the cancel button label. Defaults to `'cancel'`. */
  noKey?: string;
  /** Taiga button appearance for the confirm action (e.g. `'primary-destructive'`, `'negative'`, `'primary'`, `'accent'`). */
  appearance?: TuiConfirmData['appearance'];
  /** Dialog size. Defaults to `'s'`. */
  size?: 's' | 'm' | 'l';
  /** Whether clicking the backdrop or pressing Escape dismisses the dialog. */
  dismissible?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AppDialogsService {
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  async confirm(options: ConfirmDialogOptions): Promise<boolean> {
    const label =
      options.label ??
      (options.labelKey
        ? this.translateText(options.labelKey, options.labelParams)
        : '');
    const content =
      options.content ??
      (options.contentKey
        ? this.translateText(options.contentKey, options.contentParams)
        : undefined);
    const yes =
      options.yes ?? this.translate.instant(options.yesKey ?? 'accept');
    const no = options.no ?? this.translate.instant(options.noKey ?? 'cancel');

    const data: TuiConfirmData = {
      ...(content !== undefined ? { content } : {}),
      yes,
      no,
      ...(options.appearance !== undefined
        ? { appearance: options.appearance }
        : {}),
    };

    const result = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label,
        size: options.size ?? 's',
        ...(options.dismissible !== undefined
          ? { dismissible: options.dismissible }
          : {}),
        data,
      }),
      { defaultValue: false },
    );

    return Boolean(result);
  }

  async openChatDialog(data?: ChatDialogData): Promise<void> {
    const { ChatDialogComponent } =
      await import('../components/dialogs/chat-dialog');
    await firstValueFrom(
      this.dialogs.open(new PolymorpheusComponent(ChatDialogComponent), {
        label: this.translate.instant('messages'),
        size: 'l',
        data,
      }),
      { defaultValue: undefined },
    );
  }

  async openNotificationsDialog(): Promise<void> {
    const { NotificationsDialogComponent } =
      await import('../components/dialogs/notifications-dialog');
    await firstValueFrom(
      this.dialogs.open(
        new PolymorpheusComponent(NotificationsDialogComponent),
        {
          label: this.translate.instant('notifications'),
          size: 'm',
        },
      ),
      { defaultValue: undefined },
    );
  }

  private translateText(key: string, params?: Record<string, unknown>): string {
    return params !== undefined
      ? this.translate.instant(key, params)
      : this.translate.instant(key);
  }
}
