import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  Signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TuiButton, TuiTextfield } from '@taiga-ui/core';
import { TuiTextarea } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-chat-input',
  imports: [FormsModule, TranslatePipe, TuiButton, TuiTextarea, TuiTextfield],
  template: `
    <div class="p-4 border-t border-(--tui-border-normal)">
      @if (isBlockedByMe()) {
        <div
          class="flex flex-col items-center justify-center p-4 gap-2 opacity-70"
        >
          <span class="text-sm">{{ 'messages.userBlocked' | translate }}</span>
          <button
            tuiButton
            type="button"
            appearance="flat"
            size="s"
            (click)="unblockUser.emit()"
          >
            {{ 'unblock' | translate }}
          </button>
        </div>
      } @else {
        <div class="flex items-center gap-2">
          <tui-textfield class="w-full" [tuiTextfieldCleaner]="false">
            <textarea
              #messageTextarea
              tuiTextarea
              id="new-message"
              autocomplete="off"
              [placeholder]="
                isRequestPending()
                  ? ('messages.pendingPlaceholder' | translate)
                  : ('message' | translate)
              "
              [ngModel]="newMessage()"
              (ngModelChange)="newMessageChange.emit($event)"
              (keydown.enter)="onEnter($event)"
              [disabled]="isRequestPending()"
              maxlength="250"
              class="resize-none overflow-hidden max-h-36 font-sans text-sm focus:outline-hidden text-inherit border-0 outline-hidden focus:ring-0 ring-0 min-h-10"
            ></textarea>
          </tui-textfield>
          <button
            tuiButton
            type="button"
            appearance="primary"
            size="s"
            iconStart="@tui.send"
            (click)="sendMessage.emit()"
            [disabled]="!newMessage().trim() || isRequestPending()"
            class="mt-auto mb-1"
          >
            <span class="hidden md:block">
              {{ 'send' | translate }}
            </span>
          </button>
        </div>
        <div class="text-right text-xs opacity-50 mt-1">
          {{ newMessage().length }}/250
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatInputComponent {
  readonly newMessage = input.required<string>();
  readonly isBlockedByMe = input<boolean>(false);
  readonly isRequestPending = input<boolean>(false);

  readonly newMessageChange = output<string>();
  readonly sendMessage = output<void>();
  readonly unblockUser = output<void>();

  private readonly messageTextarea: Signal<
    ElementRef<HTMLTextAreaElement> | undefined
  > = viewChild('messageTextarea', { read: ElementRef });

  private focusTimeout?: ReturnType<typeof setTimeout>;

  onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (!keyboardEvent.shiftKey) {
      event.preventDefault();
      this.sendMessage.emit();
    }
  }

  focusTextarea(): void {
    if (!window.matchMedia('(pointer: fine)').matches) {
      return;
    }
    clearTimeout(this.focusTimeout);
    this.focusTimeout = setTimeout(() => {
      this.messageTextarea()?.nativeElement.focus();
    }, 200);
  }
}
