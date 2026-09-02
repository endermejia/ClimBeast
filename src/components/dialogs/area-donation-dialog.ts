import { CommonModule, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  TuiAppearance,
  TuiButton,
  TuiDialogContext,
  TuiIcon,
  TuiLabel,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiInputNumber, TuiSwitch } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { AreaDonationsService } from '../../services/area-donations.service';

export interface AreaDonationDialogData {
  areaId: number;
  areaName?: string;
}

@Component({
  selector: 'app-area-donation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    TuiAppearance,
    TuiButton,
    TuiIcon,
    TuiInputNumber,
    TuiLabel,
    TuiSwitch,
    TuiTextfield,
  ],
  template: `
    <div class="flex flex-col gap-6 p-1">
      <!-- Header -->
      <div class="flex items-start justify-between gap-4 border-b pb-4">
        <div class="flex items-center gap-3">
          <div
            class="w-12 h-12 rounded-2xl bg-(--tui-background-accent-1) text-(--tui-background-base) flex items-center justify-center shrink-0 shadow-lg shadow-(--tui-background-accent-1)/20"
          >
            <tui-icon icon="@tui.heart" class="w-6 h-6" />
          </div>
          <div class="flex flex-col">
            <h3 class="text-xl font-black tracking-tight m-0">
              {{ 'donations.title' | translate }}
            </h3>
            @if (context.data.areaName) {
              <p class="text-xs text-(--tui-text-secondary) m-0">
                {{ context.data.areaName }}
              </p>
            }
          </div>
        </div>
      </div>

      <!-- Explanatory note -->
      <div
        class="flex flex-col gap-1.5 p-3.5 rounded-2xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal) text-xs"
      >
        <span class="font-bold text-(--tui-text-primary)">
          {{
            'donations.subtitle'
              | translate: { name: context.data.areaName || '' }
          }}
        </span>
        <span class="text-[11px] text-(--tui-text-secondary)">
          {{ 'donations.transparencyNotice' | translate }}
        </span>
      </div>

      <!-- Preset amounts -->
      <div class="flex flex-col gap-2.5">
        <span
          class="text-xs font-black uppercase tracking-wider text-(--tui-text-secondary)"
        >
          {{ 'donations.selectAmount' | translate }}
        </span>
        <div class="grid grid-cols-4 gap-2.5">
          @for (preset of presets; track preset) {
            <button
              type="button"
              class="py-3 px-2 rounded-2xl font-black text-base border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5"
              [class.border-(--tui-border-focus)]="
                selectedAmount() === preset && !isCustom()
              "
              [class.bg-(--tui-background-accent-1)]="
                selectedAmount() === preset && !isCustom()
              "
              [class.text-(--tui-background-base)]="
                selectedAmount() === preset && !isCustom()
              "
              [class.border-(--tui-border-normal)]="
                selectedAmount() !== preset || isCustom()
              "
              [class.bg-(--tui-background-neutral-1)]="
                selectedAmount() !== preset || isCustom()
              "
              (click)="selectPreset(preset)"
            >
              <span>{{ preset }}€</span>
            </button>
          }
        </div>

        <!-- Custom amount input -->
        <div class="mt-2">
          <tui-textfield>
            <label tuiLabel for="donation-custom-amount-input">{{
              'donations.customAmount' | translate
            }}</label>
            <input
              id="donation-custom-amount-input"
              tuiInputNumber
              [min]="2"
              [max]="1000"
              [step]="1"
              [ngModel]="customAmount()"
              (ngModelChange)="onCustomAmountChange($event)"
              postfix="€"
            />
          </tui-textfield>
        </div>
      </div>

      <!-- Donor Message -->
      <div class="flex flex-col gap-2">
        <tui-textfield>
          <label tuiLabel for="donation-donor-message-input">{{
            'donations.messageOptional' | translate
          }}</label>
          <input
            id="donation-donor-message-input"
            tuiTextfield
            type="text"
            maxlength="200"
            [(ngModel)]="donorMessage"
            [placeholder]="'donations.messagePlaceholder' | translate"
          />
        </tui-textfield>
      </div>

      <!-- Anonymous switch -->
      <label class="flex items-center gap-3 cursor-pointer select-none">
        <input tuiSwitch type="checkbox" [(ngModel)]="isAnonymous" size="s" />
        <div class="flex flex-col">
          <span class="text-xs font-bold">{{
            'donations.makeAnonymous' | translate
          }}</span>
          <span class="text-[11px] text-(--tui-text-secondary)">{{
            'donations.makeAnonymousHelp' | translate
          }}</span>
        </div>
      </label>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-2 border-t">
        <button
          tuiButton
          appearance="secondary"
          size="m"
          type="button"
          (click)="context.completeWith()"
        >
          {{ 'cancel' | translate }}
        </button>

        <button
          tuiButton
          appearance="accent"
          size="m"
          type="button"
          [disabled]="effectiveAmount() < 2 || donationsService.loading()"
          (click)="submitDonation()"
        >
          <tui-icon icon="@tui.heart" class="w-4 h-4" />
          <span>{{
            'donations.donateButton'
              | translate: { amount: effectiveAmount() | number: '1.0-2' }
          }}</span>
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreaDonationDialogComponent {
  protected readonly context =
    injectContext<TuiDialogContext<void, AreaDonationDialogData>>();
  protected readonly donationsService = inject(AreaDonationsService);

  readonly presets = [5, 10, 20, 50];
  selectedAmount = signal<number>(10);
  customAmount = signal<number | null>(null);
  isCustom = signal<boolean>(false);
  isAnonymous = signal<boolean>(false);
  donorMessage = signal<string>('');

  readonly effectiveAmount = computed(() => {
    if (this.isCustom()) {
      return this.customAmount() || 0;
    }
    return this.selectedAmount();
  });

  selectPreset(amount: number): void {
    this.isCustom.set(false);
    this.selectedAmount.set(amount);
  }

  onCustomAmountChange(val: number | null): void {
    this.customAmount.set(val);
    if (val !== null && val > 0) {
      this.isCustom.set(true);
    }
  }

  async submitDonation(): Promise<void> {
    const amount = this.effectiveAmount();
    if (amount < 2) return;

    await this.donationsService.donate(
      this.context.data.areaId,
      amount,
      this.isAnonymous(),
      this.donorMessage().trim(),
    );
  }
}
