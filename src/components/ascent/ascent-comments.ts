import { Component, computed, inject, input, resource } from '@angular/core';

import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../../services/ascents.service';

import { reactToObservable } from '../../utils';

@Component({
  selector: 'app-ascent-comments',
  standalone: true,
  imports: [TranslatePipe, TuiButton, TuiIcon, TuiSkeleton],
  template: `
    @if (!isHidden()) {
      <div
        class="flex items-center gap-1"
        [class.min-w-14]="size() === 'm'"
        [class.min-w-12]="size() === 's'"
      >
        <tui-icon
          type="button"
          [style.width.rem]="size() === 's' ? 1.2 : 1.5"
          [style.height.rem]="size() === 's' ? 1.2 : 1.5"
          icon="@tui.message-circle"
          (click)="showComments($event)"
          [attr.aria-label]="'comments' | translate"
          class="cursor-pointer"
        />
        @if (commentsCountResource.isLoading()) {
          <div
            [tuiSkeleton]="true"
            class="rounded-md opacity-30"
            [class.w-6]="size() === 's'"
            [class.h-4]="size() === 's'"
            [class.w-7]="size() !== 's'"
            [class.h-5]="size() !== 's'"
          ></div>
        } @else if (commentsCountResource.value(); as count) {
          <button
            tuiButton
            type="button"
            [size]="size()"
            appearance="action-grayscale"
            class="px-1! text-center tabular-nums h-auto!"
            [class.min-w-6!]="size() === 's'"
            [class.min-w-7!]="size() !== 's'"
            (click)="showComments($event)"
          >
            {{ count }}
          </button>
        }
      </div>
    }
  `,
  host: {
    '[style.display]': 'isHidden() ? "none" : null',
  },
})
export class AscentCommentsComponent {
  private readonly ascentsService = inject(AscentsService);

  ascentId = input.required<number>();
  isPrivate = input(false);
  size = input<'s' | 'm'>('m');

  protected readonly isHidden = computed(() => {
    return this.isPrivate() && (this.commentsCountResource.value() || 0) === 0;
  });

  protected readonly commentsCountResource = resource({
    params: () => this.ascentId(),
    loader: ({ params: id }) => this.ascentsService.getCommentsCount(id),
  });

  constructor() {
    reactToObservable(this.ascentsService.ascentCommentsUpdate, (id) => {
      if (id === this.ascentId()) {
        this.commentsCountResource.reload();
      }
    });
  }

  protected showComments(event: Event): void {
    event.stopPropagation();
    void firstValueFrom(
      this.ascentsService.openCommentsDialog(this.ascentId()),
      { defaultValue: undefined },
    );
  }
}
