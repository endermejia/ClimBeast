import { AsyncPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';

import { TuiDialogContext, TuiLoader } from '@taiga-ui/core';
import { TuiProgress } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { type Observable } from 'rxjs';

export interface LoaderData {
  message: string;
  progress$?: Observable<number>;
}

@Component({
  imports: [AsyncPipe, TuiLoader, TuiProgress],
  template: `
    <div class="flex flex-col items-center justify-center p-4 gap-4">
      @if (data().progress$; as progress$) {
        <progress
          max="100"
          tuiProgressBar
          [value]="progress$ | async"
          class="w-full"
        ></progress>
      } @else {
        <tui-loader size="xl" />
      }
      <div class="tui-text_body-m text-center">{{ data().message }}</div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class LoaderDialogComponent {
  readonly context =
    inject<TuiDialogContext<void, LoaderData | string>>(POLYMORPHEUS_CONTEXT);

  // Replaced getter method with computed signal to prevent re-evaluation on change detection cycles
  protected readonly data = computed<LoaderData>(() => {
    return typeof this.context.data === 'string'
      ? { message: this.context.data }
      : this.context.data;
  });
}
