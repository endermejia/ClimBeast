import { DecimalPipe } from '@angular/common';
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
  TuiExpand,
  TuiIcon,
  TuiLabel,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiSwitch, TuiTextarea } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { AreaDonationsService } from '../../services/area-donations.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';

import { TopoCardComponent } from '../topo/topo-card';

import { TopoListItem } from '../../models';

export interface AreaDonationDialogData {
  areaId: number;
  areaName?: string;
  areaPrice?: number;
  isPurchased?: boolean;
  isPaywalled?: boolean;
  toposCount?: number;
  initialAmount?: number;
  topos?: (TopoListItem & { crag_slug: string })[];
}

@Component({
  selector: 'app-area-donation-dialog',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    TopoCardComponent,
    TranslatePipe,
    TuiAppearance,
    TuiButton,
    TuiExpand,
    TuiIcon,
    TuiLabel,
    TuiScrollbar,
    TuiSwitch,
    TuiTextarea,
    TuiTextfield,
  ],
  host: { class: 'block' },
  template: `
    <div class="flex flex-col h-[70dvh] max-h-[700px] min-h-[420px] -m-4">
      <tui-scrollbar class="grow min-h-0 overflow-x-hidden!">
        <div class="p-4 flex flex-col gap-5">
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

          <!-- Reactive topos unlock indicator -->
          @if (canUnlockTopos()) {
            @if (unlocksTopos()) {
              <div
                class="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-950 dark:text-emerald-200 transition-all duration-300"
              >
                <div
                  class="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 text-lg"
                >
                  <tui-icon icon="@tui.circle-check" />
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="text-xs font-bold leading-snug">
                    {{
                      'donations.toposIncludedBanner'
                        | translate: { name: context.data.areaName || '' }
                    }}
                  </span>
                </div>
              </div>
            } @else {
              <div
                class="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal) text-xs transition-all duration-300"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div
                    class="flex items-center justify-center w-7 h-7 rounded-lg bg-(--tui-background-neutral-2) text-(--tui-text-secondary) shrink-0"
                  >
                    <tui-icon icon="@tui.info" class="w-4 h-4" />
                  </div>
                  <span
                    class="text-[11px] text-(--tui-text-secondary) leading-tight"
                  >
                    {{
                      'donations.toposUnlockHint'
                        | translate: { price: areaPrice() }
                    }}
                  </span>
                </div>
                <button
                  appearance="flat"
                  size="xs"
                  tuiButton
                  type="button"
                  class="shrink-0 text-xs font-bold text-(--tui-text-primary) hover:underline cursor-pointer"
                  (click)="selectPreset(areaPrice())"
                >
                  {{
                    'donations.setAmountToUnlock'
                      | translate: { price: areaPrice() }
                  }}
                </button>
              </div>
            }
          }

          <!-- Included topos expandable panel -->
          @if (topos().length > 0) {
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2 min-w-0">
                  <tui-icon
                    icon="/image/topo.svg"
                    class="w-4 h-4 text-(--tui-text-accent) shrink-0"
                  />
                  <span
                    class="text-xs font-bold uppercase tracking-wider text-(--tui-text-primary) truncate"
                  >
                    {{ 'topos' | translate }} ({{ topos().length }})
                  </span>
                </div>
                <button
                  appearance="flat"
                  size="xs"
                  tuiButton
                  type="button"
                  class="shrink-0 text-xs font-bold text-(--tui-text-accent) hover:underline cursor-pointer flex items-center gap-1"
                  (click)="showTopos.set(!showTopos())"
                >
                  <span>{{
                    (showTopos()
                      ? 'donations.hideTopos'
                      : 'donations.viewTopos'
                    ) | translate
                  }}</span>
                  <tui-icon
                    [icon]="
                      showTopos() ? '@tui.chevron-up' : '@tui.chevron-down'
                    "
                    class="w-3.5 h-3.5 transition-transform"
                  />
                </button>
              </div>

              <tui-expand [expanded]="showTopos()">
                <div class="grid gap-3 grid-cols-1 sm:grid-cols-2 pt-2">
                  @for (t of topos(); track t.id) {
                    <app-topo-card [topo]="t" />
                  }
                </div>
              </tui-expand>
            </div>
          }

          <!-- Preset amounts -->
          <div class="flex flex-col gap-2.5">
            <span
              class="text-xs font-black uppercase tracking-wider text-(--tui-text-secondary)"
            >
              {{ 'donations.selectAmount' | translate }}
            </span>
            <div class="grid grid-cols-4 gap-2.5">
              @for (preset of presets(); track preset) {
                <button
                  type="button"
                  class="py-3 px-2 rounded-2xl font-black text-base border-2 transition-all cursor-pointer flex items-center justify-center"
                  [class.border-(--tui-border-focus)]="
                    selectedAmount() === preset
                  "
                  [class.bg-(--tui-background-accent-1)]="
                    selectedAmount() === preset
                  "
                  [class.text-(--tui-background-base)]="
                    selectedAmount() === preset
                  "
                  [class.border-(--tui-border-normal)]="
                    selectedAmount() !== preset
                  "
                  [class.bg-(--tui-background-neutral-1)]="
                    selectedAmount() !== preset
                  "
                  (click)="selectPreset(preset)"
                >
                  <span>{{ preset }}€</span>
                </button>
              }
            </div>
          </div>

          <!-- Donor Message -->
          <div class="flex flex-col gap-2">
            <tui-textfield
              [tuiTextfieldCleaner]="false"
              class="max-w-full overflow-hidden"
            >
              <label tuiLabel for="donation-donor-message-input">{{
                'donations.messageOptional' | translate
              }}</label>
              <textarea
                id="donation-donor-message-input"
                tuiTextarea
                maxlength="200"
                [(ngModel)]="donorMessage"
                [placeholder]="'donations.messagePlaceholder' | translate"
                class="h-20"
              ></textarea>
            </tui-textfield>
          </div>

          <!-- Anonymous switch -->
          <label class="flex items-center gap-3 cursor-pointer select-none">
            <input
              tuiSwitch
              type="checkbox"
              [(ngModel)]="isAnonymous"
              size="m"
            />
            <div class="flex flex-col">
              <span class="text-xs font-bold">{{
                'donations.makeAnonymous' | translate
              }}</span>
              <span class="text-[11px] text-(--tui-text-secondary)">{{
                'donations.makeAnonymousHelp' | translate
              }}</span>
            </div>
          </label>
        </div>
      </tui-scrollbar>

      <!-- Actions -->
      <div class="p-4 pt-2 shrink-0 flex items-center justify-end">
        <button
          tuiButton
          appearance="accent"
          size="l"
          type="button"
          class="w-full rounded-2xl! font-bold !whitespace-normal !h-auto min-h-12 sm:min-h-14 py-3.5 px-5 text-sm sm:text-base text-center leading-snug flex items-center justify-center gap-2.5 cursor-pointer"
          [disabled]="effectiveAmount() < 2 || donationsService.loading()"
          (click)="submitDonation()"
        >
          <tui-icon icon="@tui.heart" class="w-5 h-5 shrink-0" />
          <span class="whitespace-normal leading-snug">
            @if (unlocksTopos()) {
              {{
                'donations.contributeAndUnlockButton'
                  | translate: { amount: effectiveAmount() | number: '1.0-2' }
              }}
            } @else {
              {{
                'donations.donateButton'
                  | translate: { amount: effectiveAmount() | number: '1.0-2' }
              }}
            }
          </span>
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
  protected readonly outdoorData = inject(OutdoorDataService);

  readonly topos = computed(
    () => this.context.data.topos ?? this.outdoorData.areaTopos() ?? [],
  );
  readonly showTopos = signal<boolean>(false);

  readonly areaPrice = computed(() =>
    Math.max(0, Number(this.context.data.areaPrice || 0)),
  );
  readonly isPurchased = computed(() => !!this.context.data.isPurchased);
  readonly canUnlockTopos = computed(
    () => this.areaPrice() > 0 && !this.isPurchased(),
  );

  readonly presets = computed(() => {
    const price = this.areaPrice();
    if (!this.canUnlockTopos() || price <= 0) {
      return [2, 5, 10, 20];
    }

    let candidates: number[];
    if (price <= 2) {
      candidates = [2, 5, 10, 20];
    } else if (price <= 4) {
      candidates = [2, price, 5, 10];
    } else if (price <= 6) {
      candidates = [2, price, 10, 20];
    } else if (price <= 10) {
      const lower = Math.max(2, Math.round(price / 2));
      candidates = [lower, price, price + 5, price + 10];
    } else if (price <= 15) {
      candidates = [5, 10, price, price + 10];
    } else {
      candidates = [5, Math.round(price / 2), price, price + 15];
    }

    const unique = Array.from(new Set(candidates.filter((n) => n >= 2))).sort(
      (a, b) => a - b,
    );

    while (unique.length < 4) {
      const last = unique[unique.length - 1] ?? 10;
      unique.push(last + 5);
    }

    return unique.slice(0, 4);
  });

  selectedAmount = signal<number>(5);
  isAnonymous = signal<boolean>(false);
  donorMessage = signal<string>('');

  readonly effectiveAmount = computed(() => this.selectedAmount());
  readonly unlocksTopos = computed(
    () => this.canUnlockTopos() && this.effectiveAmount() >= this.areaPrice(),
  );

  constructor() {
    const data = this.context.data;
    const initial =
      data.initialAmount ??
      (data.areaPrice && !data.isPurchased ? data.areaPrice : 5);
    this.selectedAmount.set(initial);
  }

  selectPreset(amount: number): void {
    this.selectedAmount.set(amount);
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
