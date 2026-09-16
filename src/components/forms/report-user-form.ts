import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  TuiButton,
  TuiIcon,
  TuiLabel,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiAvatar, TuiTextarea } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { UserReportsService } from '../../services/user-reports.service';

import { ReportUserDialogData, UserReportReason } from '../../models';

import { AvatarUrlPipe } from '../../pipes';

interface ReportReasonOption {
  id: UserReportReason;
  titleKey: string;
  descKey: string;
  icon: string;
}

@Component({
  selector: 'app-report-user-form',
  standalone: true,
  imports: [
    AvatarUrlPipe,
    FormsModule,
    TranslatePipe,
    TuiAvatar,
    TuiButton,
    TuiIcon,
    TuiLabel,
    TuiScrollbar,
    TuiTextarea,
    TuiTextfield,
  ],
  template: `
    <div class="flex flex-col gap-5 p-1 max-h-[85vh]">
      <!-- Target User Header -->
      <div
        class="flex items-center gap-3 p-3 rounded-2xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal)"
      >
        <span tuiAvatar size="m" class="shrink-0">
          @if (targetUser().userAvatar; as avatar) {
            <img
              [src]="avatar | avatarUrl"
              [alt]="targetUser().userName || ''"
            />
          } @else {
            <tui-icon icon="@tui.user" />
          }
        </span>
        <div class="flex flex-col min-w-0">
          <span class="font-bold text-sm truncate text-(--tui-text-primary)">
            {{ targetUser().userName || ('user' | translate) }}
          </span>
          <span class="text-xs text-(--tui-text-secondary)">
            {{ 'reportReasonSelect' | translate }}
          </span>
        </div>
      </div>

      <!-- Reasons List -->
      <tui-scrollbar class="max-h-64 sm:max-h-72 pr-1">
        <div class="flex flex-col gap-2">
          @for (reason of reasons; track reason.id) {
            <button
              type="button"
              class="flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer w-full bg-transparent"
              [class.border-red-500!]="selectedReason() === reason.id"
              [class.bg-red-500/5!]="selectedReason() === reason.id"
              [class.border-(--tui-border-normal)]="
                selectedReason() !== reason.id
              "
              (click)="selectedReason.set(reason.id)"
            >
              <div
                class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-red-500/10 text-red-600 dark:text-red-400"
              >
                <tui-icon [icon]="reason.icon" class="w-5 h-5" />
              </div>
              <div class="flex flex-col flex-1 min-w-0">
                <span class="font-semibold text-sm text-(--tui-text-primary)">
                  {{ reason.titleKey | translate }}
                </span>
                <span class="text-xs text-(--tui-text-secondary) mt-0.5">
                  {{ reason.descKey | translate }}
                </span>
              </div>
              <div
                class="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors"
                [class.border-red-500]="selectedReason() === reason.id"
                [class.bg-red-500]="selectedReason() === reason.id"
                [class.text-white]="selectedReason() === reason.id"
                [class.border-(--tui-border-normal)]="
                  selectedReason() !== reason.id
                "
              >
                @if (selectedReason() === reason.id) {
                  <tui-icon icon="@tui.check" class="w-3.5 h-3.5" />
                }
              </div>
            </button>
          }
        </div>
      </tui-scrollbar>

      <!-- Optional Details Textarea -->
      <div class="flex flex-col gap-1.5">
        <label
          tuiLabel
          for="report-details"
          class="text-xs font-semibold uppercase tracking-wider text-(--tui-text-secondary)"
        >
          {{ 'reportDetailsLabel' | translate }}
        </label>
        <tui-textfield class="w-full" [tuiTextfieldCleaner]="false">
          <textarea
            tuiTextarea
            id="report-details"
            autocomplete="off"
            [placeholder]="'reportDetailsPlaceholder' | translate"
            [ngModel]="details()"
            (ngModelChange)="details.set($event)"
            maxlength="500"
            rows="3"
            class="resize-none font-sans text-sm focus:outline-hidden text-inherit border-0 outline-hidden focus:ring-0 ring-0 min-h-20"
          ></textarea>
        </tui-textfield>
        <div class="text-[11px] text-right text-(--tui-text-tertiary)">
          {{ details().length }}/500
        </div>
      </div>

      <!-- Confidentiality notice -->
      <div
        class="flex items-start gap-2.5 p-3 rounded-xl bg-(--tui-background-neutral-1) text-xs text-(--tui-text-secondary)"
      >
        <tui-icon
          icon="@tui.shield-check"
          class="shrink-0 mt-0.5 text-(--tui-text-accent)"
        />
        <span>{{ 'reportConfidentialNotice' | translate }}</span>
      </div>

      <!-- Footer Actions -->
      <div
        class="flex items-center justify-end gap-3 pt-3 border-t border-(--tui-border-normal)"
      >
        <button
          tuiButton
          type="button"
          appearance="flat"
          size="m"
          (click)="cancelled.emit()"
          [disabled]="isSubmitting()"
        >
          {{ 'cancel' | translate }}
        </button>
        <button
          tuiButton
          type="button"
          appearance="primary-destructive"
          size="m"
          [disabled]="!selectedReason() || isSubmitting()"
          (click)="onSubmit()"
        >
          @if (isSubmitting()) {
            {{ 'loading' | translate }}...
          } @else {
            {{ 'reportSubmit' | translate }}
          }
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportUserFormComponent {
  readonly targetUser = input.required<ReportUserDialogData>();
  readonly submitted = output<boolean>();
  readonly cancelled = output<void>();

  private readonly userReportsService = inject(UserReportsService);

  protected readonly selectedReason = signal<UserReportReason | null>(null);
  protected readonly details = signal<string>('');
  protected readonly isSubmitting = signal<boolean>(false);

  protected readonly reasons: ReportReasonOption[] = [
    {
      id: 'spam',
      titleKey: 'reportReasons.spam.title',
      descKey: 'reportReasons.spam.desc',
      icon: '@tui.flag',
    },
    {
      id: 'harassment',
      titleKey: 'reportReasons.harassment.title',
      descKey: 'reportReasons.harassment.desc',
      icon: '@tui.shield-alert',
    },
    {
      id: 'inappropriate_content',
      titleKey: 'reportReasons.inappropriate_content.title',
      descKey: 'reportReasons.inappropriate_content.desc',
      icon: '@tui.eye-off',
    },
    {
      id: 'impersonation',
      titleKey: 'reportReasons.impersonation.title',
      descKey: 'reportReasons.impersonation.desc',
      icon: '@tui.user-x',
    },
    {
      id: 'other',
      titleKey: 'reportReasons.other.title',
      descKey: 'reportReasons.other.desc',
      icon: '@tui.message-square',
    },
  ];

  protected async onSubmit(): Promise<void> {
    const reason = this.selectedReason();
    if (!reason || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    try {
      const result = await this.userReportsService.reportUser({
        reported_id: this.targetUser().userId,
        reason,
        details: this.details(),
      });

      if (result.success || result.alreadyReported) {
        this.submitted.emit(result.success);
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
