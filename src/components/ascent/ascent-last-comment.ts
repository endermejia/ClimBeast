import { CommonModule } from '@angular/common';
import { Component, inject, input, resource } from '@angular/core';

import { TuiIcon } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';

import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../../services/ascents.service';
import { SupabaseService } from '../../services/supabase.service';

import { AvatarUrlPipe, MentionLinkPipe } from '../../pipes';

import { reactToObservable } from '../../utils';

import { MentionHintDirective } from '../../directives/mention-hint.directive';

import { CommentLikesComponent } from '../social/comment-likes';

@Component({
  selector: 'app-ascent-last-comment',
  standalone: true,
  imports: [
    AvatarUrlPipe,
    CommentLikesComponent,
    CommonModule,
    MentionHintDirective,
    MentionLinkPipe,
    TuiAvatar,
    TuiIcon,
  ],
  template: `
    @if (lastCommentsResource.value(); as comments) {
      @if (comments.length > 0) {
        <div class="flex flex-col gap-1.5">
          @for (comment of comments; track comment.id; let isLast = $last) {
            <div class="relative pl-5 pt-0.5">
              <!-- Thread connector line -->
              @if (!isLast) {
                <div
                  class="absolute left-2.5 -top-1.5 bottom-0 w-3 border-l-2 border-(--tui-border-normal) pointer-events-none opacity-60"
                  aria-hidden="true"
                ></div>
                <div
                  class="absolute left-2.5 top-4 w-2.5 border-b-2 border-(--tui-border-normal) pointer-events-none opacity-60"
                  aria-hidden="true"
                ></div>
              } @else {
                <div
                  class="absolute left-2.5 -top-1.5 bottom-4 w-3 border-l-2 border-b-2 border-(--tui-border-normal) rounded-bl-xl pointer-events-none opacity-60"
                  aria-hidden="true"
                ></div>
              }

              <div
                class="flex items-start gap-2 bg-(--tui-background-neutral-1) hover:bg-(--tui-background-neutral-1-hover) border border-(--tui-border-normal)/60 hover:border-(--tui-border-normal) p-2 rounded-xl animate-in fade-in slide-in-from-top-1 duration-300 cursor-pointer transition-colors"
                (click)="showComments($event)"
                (keydown.enter)="showComments($event)"
                (keydown.space)="showComments($event)"
                tabindex="0"
              >
                <div class="flex flex-col gap-1 grow min-w-0">
                  <div class="flex items-center gap-1.5">
                    <tui-icon
                      icon="@tui.message-circle"
                      class="w-3! h-3! opacity-50 shrink-0"
                    />
                    <span tuiAvatar size="xs">
                      @if (comment.user_profiles.avatar; as avatar) {
                        <img [src]="avatar | avatarUrl" alt="avatar" />
                      } @else {
                        <tui-icon icon="@tui.user" />
                      }
                    </span>
                    <span class="text-[10px] font-bold opacity-80 truncate">
                      {{ comment.user_profiles.name }}
                    </span>
                  </div>
                  <p
                    appMentionHint
                    class="text-xs line-clamp-2 wrap-break-word pl-1 opacity-90"
                    [innerHTML]="comment.comment | mentionLink"
                  ></p>
                </div>

                <div class="flex flex-col items-center self-start shrink-0">
                  <app-comment-likes
                    [commentId]="comment.id"
                    [(likesCount)]="comment.likes_count"
                    [(userLiked)]="comment.user_liked"
                  />
                </div>
              </div>
            </div>
          }
        </div>
      }
    }
  `,
})
export class AscentLastCommentComponent {
  protected readonly supabase = inject(SupabaseService);
  private readonly ascentsService = inject(AscentsService);

  ascentId = input.required<number>();

  protected readonly lastCommentsResource = resource({
    params: () => this.ascentId(),
    loader: ({ params: id }) => this.ascentsService.getLastComments(id, 2),
  });

  constructor() {
    reactToObservable(this.ascentsService.ascentCommentsUpdate, (id) => {
      if (id === this.ascentId()) {
        this.lastCommentsResource.reload();
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
