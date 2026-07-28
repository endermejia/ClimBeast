import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiNotificationOptions, TuiNotificationService } from '@taiga-ui/core';

import { TranslateService } from '@ngx-translate/core';

import { firstValueFrom, forkJoin, switchMap } from 'rxjs';

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
    const requests$ = [this.translate.get(message)];
    if (label) {
      requests$.push(this.translate.get(label));
    }

    void firstValueFrom(
      forkJoin(requests$).pipe(
        switchMap(([translatedMessage, translatedLabel]) => {
          const finalOptions = { ...options };
          if (label && translatedLabel) {
            finalOptions.label = translatedLabel;
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
