import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';

import { TuiButton } from '@taiga-ui/core';
import { type TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-first-steps-dialog',
  imports: [NgOptimizedImage, TranslatePipe, TuiButton],
  template: `
    <div class="lw-form-sheet">
      <div
        class="lw-form-sheet-body flex flex-col items-center gap-6 text-center"
      >
        <img
          ngSrc="/logo/climbeast.svg"
          alt="ClimBeast Logo"
          class="w-32 h-auto"
          height="93"
          width="128"
        />

        <div class="space-y-2 w-full">
          <h2 class="text-3xl font-bold">
            {{ 'firstSteps.welcomeTitle' | translate }}
          </h2>
          <p class="text-xl text-(--tui-text-secondary)">
            {{ 'firstSteps.welcomeDescription' | translate }}
          </p>
        </div>
      </div>

      <div class="lw-form-sheet-footer justify-center">
        <button
          tuiButton
          appearance="primary"
          size="m"
          type="button"
          class="w-full sm:w-auto"
          (click)="close()"
        >
          {{ 'firstSteps.startSetup' | translate }}
        </button>
      </div>
    </div>
  `,
})
export class FirstStepsDialogComponent {
  private readonly context = injectContext<TuiDialogContext<void>>();
  close(): void {
    this.context.completeWith();
  }
}
