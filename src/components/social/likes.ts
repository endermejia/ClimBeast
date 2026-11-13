import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-likes',
  standalone: true,
  imports: [CommonModule, TranslatePipe, TuiButton, TuiIcon, TuiSkeleton],
  template: `
    <div
      class="flex items-center gap-1"
      [class.min-w-14]="size() === 'm'"
      [class.min-w-12]="size() === 's'"
    >
      <tui-icon
        type="button"
        [style.width.rem]="size() === 's' ? 1.2 : 1.5"
        [style.height.rem]="size() === 's' ? 1.2 : 1.5"
        [icon]="userLiked() ? '@tui.heart-filled' : '@tui.heart'"
        [style.color]="userLiked() ? 'var(--tui-status-negative)' : ''"
        (click)="onToggle($event)"
        [attr.aria-label]="'like' | translate"
        class="cursor-pointer"
      />
      @if (isLoading()) {
        <div
          [tuiSkeleton]="true"
          class="rounded-md opacity-30"
          [class.w-6]="size() === 's'"
          [class.h-4]="size() === 's'"
          [class.w-7]="size() !== 's'"
          [class.h-5]="size() !== 's'"
        ></div>
      } @else if (likesCount() > 0) {
        <button
          tuiButton
          type="button"
          [size]="size()"
          appearance="action-grayscale"
          class="px-1! text-center tabular-nums h-auto!"
          [class.min-w-6!]="size() === 's'"
          [class.min-w-7!]="size() !== 's'"
          [attr.aria-label]="'likes' | translate"
          (click)="onShowLikes($event)"
        >
          {{ likesCount() }}
        </button>
      }
    </div>
  `,
})
export class LikesComponent {
  userLiked = input.required<boolean>();
  likesCount = input.required<number>();
  isLoading = input(false);
  size = input<'s' | 'm'>('m');

  toggleLike = output<Event>();
  showLikes = output<Event>();

  protected onToggle(event: Event): void {
    event.stopPropagation();
    this.toggleLike.emit(event);
  }

  protected onShowLikes(event: Event): void {
    event.stopPropagation();
    this.showLikes.emit(event);
  }
}
