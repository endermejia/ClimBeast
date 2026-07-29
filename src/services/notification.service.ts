import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TuiNotificationOptions, TuiNotificationService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';

import { catchError, firstValueFrom, of, switchMap, take } from 'rxjs';

import { GdprNotificationComponent } from '../components/notifications/gdpr-notification';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly alerts = inject(TuiNotificationService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private isGdprShowing = false;

  private show(
    message: string,
    options?: Partial<TuiNotificationOptions>,
  ): void {
    const label = options?.label;
    const lang =
      this.translate.currentLang || this.translate.defaultLang || 'es';

    const translationReady$ = this.translate.getTranslation(lang).pipe(
      catchError(() => of({})),
      take(1),
    );

    void firstValueFrom(
      translationReady$.pipe(
        switchMap(() => {
          const keys = [message];
          if (label) {
            keys.push(label);
          }
          return this.translate.get(keys);
        }),
        switchMap((translations: Record<string, string>) => {
          const translatedMessage = translations[message] || message;
          const finalOptions = { ...options };
          if (label && translations[label]) {
            finalOptions.label = translations[label];
          }
          return this.alerts.open(translatedMessage, finalOptions);
        }),
      ),
      { defaultValue: undefined },
    );
  }

  success(
    message: string,
    label?: string,
    autoClose: number | boolean | undefined = 3000,
  ): void {
    this.show(message, {
      appearance: 'positive',
      label,
      autoClose: autoClose === false ? 0 : (autoClose as number | undefined),
    });
  }

  showGdpr(): void {
    if (this.isGdprShowing) {
      return;
    }

    this.isGdprShowing = true;

    this.translate
      .get('gdpr.title')
      .pipe(
        switchMap((translatedTitle) =>
          this.alerts.open(
            new PolymorpheusComponent(GdprNotificationComponent),
            {
              label: translatedTitle,
              appearance: 'info',
              autoClose: 0,
              closable: false,
            },
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        complete: () => {
          this.isGdprShowing = false;
        },
        error: () => {
          this.isGdprShowing = false;
        },
      });
  }
}
