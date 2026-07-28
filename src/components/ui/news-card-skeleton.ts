import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TuiAppearance } from '@taiga-ui/core';
import { TuiSkeleton } from '@taiga-ui/kit';

@Component({
  selector: 'app-news-card-skeleton',
  standalone: true,
  imports: [CommonModule, TuiAppearance, TuiSkeleton],
  template: `
    <div
      tuiAppearance="flat-grayscale"
      class="flex flex-col gap-1.5 p-4 sm:rounded-3xl rounded-none relative -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full text-left overflow-hidden"
    >
      <header class="flex justify-between items-center">
        <div class="flex items-center gap-2">
          <div [tuiSkeleton]="true" class="w-6 h-6 rounded-full"></div>
          <div [tuiSkeleton]="true" class="w-20 h-3 rounded-full"></div>
        </div>
        <div
          [tuiSkeleton]="true"
          class="w-16 h-6 rounded-full opacity-50"
        ></div>
      </header>

      <div
        class="-mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full bg-(--tui-background-neutral-1) sm:rounded-2xl overflow-hidden block"
      >
        <div
          [tuiSkeleton]="true"
          class="w-full aspect-video max-h-[500px]"
        ></div>
      </div>

      <div class="flex flex-col gap-1 mt-0.5">
        <div [tuiSkeleton]="true" class="w-11/12 h-4 rounded-full"></div>
        <div [tuiSkeleton]="true" class="w-3/4 h-4 rounded-full"></div>
      </div>

      <div
        class="flex flex-col gap-1 border-l-2 border-(--tui-border-normal) pl-2 py-0.5 opacity-50 mt-0.5"
      >
        <div [tuiSkeleton]="true" class="w-full h-2.5 rounded-full"></div>
        <div [tuiSkeleton]="true" class="w-4/5 h-2.5 rounded-full"></div>
      </div>
    </div>
  `,
  styles: [
    `
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      :host {
        display: block;
        width: 100%;
        animation: fadeIn 0.4s ease-out;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsCardSkeletonComponent {}
