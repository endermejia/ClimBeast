import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  TuiAppearance,
  TuiButton,
  TuiDropdown,
  TuiIcon,
  TuiInput,
  TuiLabel,
  TuiNumberFormat,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  TuiChevron,
  TuiDataListWrapper,
  TuiInputNumber,
  TuiSelect,
  TuiTextarea,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

export interface IndoorCenterLocalVoucher {
  id?: string;
  name: string;
  price: number;
  kind?: string;
  description?: string | null;
  is_deleted?: boolean;
}

@Component({
  selector: 'app-indoor-center-vouchers-section',
  imports: [
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    TuiAppearance,
    TuiButton,
    TuiChevron,
    TuiDataListWrapper,
    TuiDropdown,
    TuiIcon,
    TuiInput,
    TuiInputNumber,
    TuiLabel,
    TuiNumberFormat,
    TuiSelect,
    TuiTextarea,
    TuiTextfield,
  ],
  template: `
    <div class="flex flex-col gap-6 w-full max-w-2xl">
      <!-- Compact Create Voucher Form -->
      <div
        class="flex flex-col gap-4 p-4 rounded-2xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal)"
      >
        <!-- First line: Name -->
        <div class="w-full">
          <tui-textfield>
            <label tuiLabel for="new-v-name">{{ 'name' | translate }}</label>
            <input
              tuiInput
              id="new-v-name"
              [ngModel]="newVoucherName()"
              (ngModelChange)="newVoucherName.set($event)"
              name="newVoucherName"
              autocomplete="off"
              placeholder="Ej. Pase diario, Bono de 10"
            />
          </tui-textfield>
        </div>

        <!-- Second line: Description (Textarea) -->
        <div class="w-full">
          <tui-textfield class="block">
            <label tuiLabel for="new-v-desc">{{
              'description' | translate
            }}</label>
            <textarea
              tuiTextarea
              id="new-v-desc"
              [ngModel]="newVoucherDescription()"
              (ngModelChange)="newVoucherDescription.set($event)"
              name="newVoucherDescription"
              placeholder="Ej. Acceso libre por un día"
            ></textarea>
          </tui-textfield>
        </div>

        <!-- Third line: Type and Price together, plus Add button -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <!-- Kind (Type) -->
          <tui-textfield
            class="w-full"
            tuiChevron
            [stringify]="stringifyVoucherKind"
          >
            <label tuiLabel for="new-v-kind">{{
              'indoor.voucherKind' | translate
            }}</label>
            <input
              tuiSelect
              id="new-v-kind"
              [ngModel]="newVoucherKind()"
              (ngModelChange)="newVoucherKind.set($event)"
              name="newVoucherKind"
              autocomplete="off"
            />
            <tui-data-list-wrapper
              *tuiDropdown
              [items]="voucherKinds"
            ></tui-data-list-wrapper>
          </tui-textfield>

          <!-- Price -->
          <tui-textfield class="w-full">
            <label tuiLabel for="new-v-price">{{ 'price' | translate }}</label>
            <input
              tuiInputNumber
              id="new-v-price"
              [ngModel]="newVoucherPrice()"
              (ngModelChange)="newVoucherPrice.set($event)"
              name="newVoucherPrice"
              [tuiNumberFormat]="{ precision: 2 }"
              autocomplete="off"
              placeholder="0.00"
            />
            <span class="tui-textfield__suffix">€</span>
          </tui-textfield>

          <!-- Add Button -->
          <button
            tuiButton
            type="button"
            appearance="primary"
            class="w-full font-bold"
            [disabled]="!newVoucherName()"
            (click.zoneless)="addLocalVoucher($event)"
          >
            <tui-icon icon="@tui.plus" />
            {{ 'add' | translate }}
          </button>
        </div>
      </div>

      <!-- Sleek Vouchers List -->
      @if (activeLocalVouchers().length > 0) {
        <div class="flex flex-col gap-2.5">
          @for (v of activeLocalVouchers(); track $index) {
            <div
              class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl tui-appearance-floating"
              tuiAppearance="floating"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div
                  class="w-10 h-10 shrink-0 rounded-xl tui-appearance-primary flex items-center justify-center"
                  tuiAppearance="primary"
                >
                  <tui-icon
                    [icon]="
                      v.kind === 'subscription' ? '@tui.id-card' : '@tui.ticket'
                    "
                    class="text-lg"
                  />
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="font-bold text-base truncate">{{ v.name }}</span>
                  @if (v.description) {
                    <span class="text-xs opacity-60 line-clamp-2 break-words">{{
                      v.description
                    }}</span>
                  }
                </div>
              </div>

              <div
                class="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-(--tui-border-normal)/40 sm:border-0"
              >
                <span
                  class="text-sm sm:text-base font-extrabold px-3 py-1 sm:py-1.5 rounded-xl whitespace-nowrap"
                  tuiAppearance="primary"
                >
                  {{ v.price | number: '1.2-2' }} €
                </span>
                <div class="flex items-center gap-1">
                  <button
                    tuiIconButton
                    appearance="flat-grayscale"
                    size="s"
                    iconStart="@tui.edit"
                    type="button"
                    class="rounded-full! text-(--tui-text-secondary)"
                    [attr.aria-label]="'edit' | translate"
                    (click.zoneless)="editLocalVoucher(v, $event)"
                  ></button>
                  <button
                    tuiIconButton
                    appearance="flat-grayscale"
                    size="s"
                    iconStart="@tui.trash"
                    type="button"
                    class="rounded-full! text-(--tui-status-negative)"
                    [attr.aria-label]="'delete' | translate"
                    (click.zoneless)="deleteLocalVoucher(v, $event)"
                  ></button>
                </div>
              </div>
            </div>
          }
        </div>
      } @else {
        <div
          class="p-8 text-center text-(--tui-text-secondary) border border-dashed border-(--tui-border-normal) rounded-2xl bg-(--tui-background-neutral-1)"
        >
          {{ 'empty' | translate }}
        </div>
      }
    </div>
  `,
  host: { class: 'block w-full' },
})
export class IndoorCenterVouchersSectionComponent {
  private readonly translate = inject(TranslateService);

  readonly vouchers = model.required<IndoorCenterLocalVoucher[]>();

  protected readonly voucherKinds = ['pass', 'subscription'];
  protected readonly activeLocalVouchers = computed(() =>
    this.vouchers().filter((v) => !v.is_deleted),
  );

  readonly newVoucherName = signal('');
  readonly newVoucherPrice = signal<number | null>(null);
  readonly newVoucherKind = signal('pass');
  readonly newVoucherDescription = signal('');

  protected readonly stringifyVoucherKind = (kind: string): string => {
    return this.translate.instant('indoor.voucherKinds.' + kind);
  };

  addLocalVoucher(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const name = this.newVoucherName();
    if (!name) return;
    const price = Number(this.newVoucherPrice()) || 0;
    const kind = this.newVoucherKind();
    const description = this.newVoucherDescription() || null;

    this.vouchers.update((list) => [
      ...list,
      { name, price, kind, description },
    ]);
    this.newVoucherName.set('');
    this.newVoucherPrice.set(null);
    this.newVoucherKind.set('pass');
    this.newVoucherDescription.set('');
  }

  editLocalVoucher(v: IndoorCenterLocalVoucher, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.newVoucherName.set(v.name);
    this.newVoucherPrice.set(v.price);
    this.newVoucherKind.set(v.kind || 'pass');
    this.newVoucherDescription.set(v.description || '');

    this.deleteLocalVoucher(v);
  }

  deleteLocalVoucher(v: IndoorCenterLocalVoucher, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.vouchers.update((list) =>
      list.map((item) => {
        if (item === v || (v.id && item.id === v.id)) {
          return { ...item, is_deleted: true };
        }
        return item;
      }),
    );
  }
}
