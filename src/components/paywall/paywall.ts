import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';

import { TuiButton, TuiIcon } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { AreaDonationsService } from '../../services/area-donations.service';

@Component({
  selector: 'app-paywall',
  standalone: true,
  imports: [DecimalPipe, TranslatePipe, TuiButton, TuiIcon],
  template: `
    <div
      class="relative overflow-hidden flex flex-col items-center justify-center p-5 sm:p-8 md:p-10 rounded-3xl sm:rounded-4xl border border-(--tui-border-normal) text-center gap-6 shadow-xl bg-(--tui-background-elevated)"
    >
      <!-- Fondo decorativo sutil -->
      <div
        class="absolute -top-24 -right-24 w-64 h-64 bg-(--tui-background-accent-1-hover) opacity-5 rounded-full blur-3xl"
      ></div>
      <div
        class="absolute -bottom-24 -left-24 w-64 h-64 bg-(--tui-background-accent-1-hover) opacity-10 rounded-full blur-3xl"
      ></div>

      @if (!hideTitle()) {
        <h2
          class="relative text-2xl sm:text-3xl font-black tracking-tight text-balance m-0"
        >
          {{ 'payments.buyAreaTopos' | translate }}
        </h2>
      }

      <div class="relative flex flex-col items-center gap-2">
        <div
          class="text-4xl sm:text-6xl font-black text-(--tui-text-accent) tracking-tighter tabular-nums"
        >
          {{ price() | number: '1.2-2' }}€
        </div>
        <p
          class="text-xs sm:text-sm font-medium opacity-60 uppercase tracking-widest m-0"
        >
          {{ 'payments.price' | translate }}
        </p>
      </div>

      <div class="relative w-full max-w-sm sm:max-w-md flex flex-col gap-3">
        <button
          tuiButton
          appearance="primary"
          type="button"
          class="w-full rounded-2xl! shadow-lg shadow-black/5 hover:scale-[1.02] transition-transform font-bold !whitespace-normal !h-auto min-h-12 py-3 px-4 text-xs sm:text-sm md:text-base text-center leading-snug flex items-center justify-center gap-2 cursor-pointer"
          (click)="openDonationDialog()"
        >
          <tui-icon icon="@tui.hand-heart" class="w-5 h-5 shrink-0" />
          <span class="whitespace-normal leading-snug">
            {{ 'payments.paywall.contributeAndUnlock' | translate }}
          </span>
        </button>

        <p class="text-[10px] sm:text-xs leading-relaxed opacity-50 px-4 m-0">
          {{ 'payments.paywall.footer' | translate }}
        </p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaywallComponent {
  areaId = input.required<number>();
  price = input.required<number>();
  areaName = input<string>('');
  toposCount = input<number>(0);
  hideTitle = input(false);

  private readonly donationsService = inject(AreaDonationsService);

  openDonationDialog(): void {
    this.donationsService.openDonationDialog(this.areaId(), this.areaName(), {
      areaPrice: this.price(),
      isPurchased: false,
      toposCount: this.toposCount(),
      initialAmount: this.price(),
    });
  }
}
