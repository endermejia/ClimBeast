import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  Signal,
  viewChild,
} from '@angular/core';

import { TuiButton, TuiIcon, TuiLoader, TuiScrollbar } from '@taiga-ui/core';
import { TuiMessage } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { ChatMessageDto } from '../../models';

@Component({
  selector: 'app-chat-message-list',
  host: { class: 'grow flex flex-col min-h-0' },
  imports: [
    DatePipe,
    TranslatePipe,
    TuiButton,
    TuiIcon,
    TuiLoader,
    TuiMessage,
    TuiScrollbar,
  ],
  template: `
    <tui-scrollbar
      #scrollbar
      class="grow min-h-0"
      (scroll)="listScroll.emit($event)"
    >
      <div class="flex flex-col gap-2 p-4">
        @if (hasMore() && !loadingMessages()) {
          <div class="flex justify-center">
            <button
              tuiButton
              appearance="flat-grayscale"
              size="xs"
              (click)="loadMore.emit()"
            >
              {{ 'loadMore' | translate }}
            </button>
          </div>
        }

        @if (loadingMessages() && accumulatedMessagesCount() === 0) {
          <div class="py-12 flex justify-center">
            <tui-loader />
          </div>
        }

        @for (msg of messages(); track msg.id) {
          @let isMe = msg.sender_id === authUserId();
          <div class="flex" [class.justify-end]="isMe">
            <div
              [appearance]="isMe ? 'accent' : 'secondary-grayscale'"
              tuiMessage
              class="max-w-[85%]"
            >
              <p class="whitespace-pre-wrap wrap-anywhere leading-tight">
                {{ msg.text }}
              </p>
              <div
                class="text-[10px] opacity-60 text-right mt-1 flex items-center justify-end gap-1"
              >
                {{ msg.created_at | date: 'HH:mm' }}
                @if (isMe) {
                  <tui-icon
                    [icon]="msg.read_at ? '@tui.check-check' : '@tui.check'"
                    class="w-3! h-3!"
                  />
                }
              </div>
            </div>
          </div>
        }
      </div>
    </tui-scrollbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageListComponent {
  readonly messages = input.required<readonly ChatMessageDto[]>();
  readonly hasMore = input<boolean>(true);
  readonly loadingMessages = input<boolean>(false);
  readonly accumulatedMessagesCount = input<number>(0);
  readonly authUserId = input<string | null>(null);

  readonly loadMore = output<void>();
  readonly listScroll = output<Event>();

  private readonly scrollbar: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild('scrollbar', { read: ElementRef });

  scrollToBottom(): void {
    const el = this.scrollbar()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
