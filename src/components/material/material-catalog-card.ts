import { CommonModule, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { TuiCardLarge } from '@taiga-ui/layout';

import { TranslatePipe } from '@ngx-translate/core';

import type { MaterialCatalogItem } from '../../models';

@Component({
  selector: 'app-material-catalog-card',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    TranslatePipe,
    TuiBadge,
    TuiButton,
    TuiCardLarge,
    TuiIcon,
  ],
  template: `
    <button
      tuiCardLarge
      appearance="flat"
      class="w-full h-full flex flex-col gap-4 text-start rounded-[2.5rem]! p-4! overflow-hidden focus:outline-none focus-visible:ring-4 focus-visible:ring-accent group relative border border-(--tui-border-normal)"
      type="button"
      [attr.aria-label]="item().name"
      (click)="clicked.emit(item())"
    >
      <!-- Image Container -->
      <div
        class="relative aspect-square w-full rounded-[1.8rem] overflow-hidden border border-(--tui-border-normal) shrink-0 bg-(--tui-background-neutral-1)"
      >
        @if (item().image_url) {
          <img
            [src]="item().image_url"
            [alt]="item().name"
            class="w-full h-full object-cover"
          />
        } @else {
          <div class="w-full h-full flex items-center justify-center p-12">
            <tui-icon
              icon="@tui.hammer"
              class="text-(--tui-text-tertiary) text-7xl opacity-20"
            />
          </div>
        }

        <!-- Price badge -->
        <div class="absolute top-3 right-3 z-10">
          <span
            tuiBadge
            appearance="primary"
            size="m"
            class="shadow-md font-black rounded-lg! border border-white/20"
          >
            {{ item().price | number: '1.2-2' }}€
          </span>
        </div>

        <div class="absolute top-3 left-3 flex flex-col gap-2 z-10">
          <div class="flex gap-2">
            <button
              tuiIconButton
              appearance="accent"
              size="s"
              type="button"
              class="rounded-xl! shadow-lg bg-(--tui-background-accent-1)! text-(--tui-background-base)!"
              (click)="edit.emit(item()); $event.stopPropagation()"
              [attr.aria-label]="'edit' | translate"
            >
              <tui-icon icon="@tui.pencil" />
            </button>

            <button
              tuiIconButton
              appearance="negative"
              size="s"
              type="button"
              class="rounded-xl! shadow-lg"
              (click)="delete.emit(item()); $event.stopPropagation()"
              [attr.aria-label]="'delete' | translate"
            >
              <tui-icon icon="@tui.trash" />
            </button>
          </div>

          @if (item().active === false) {
            <span tuiBadge size="s">
              {{ 'admin.materialCatalog.inactive' | translate }}
            </span>
          }
        </div>
      </div>

      <!-- Info Container -->
      <div class="flex flex-col gap-1 w-full px-1 pb-1">
        <span
          class="font-black text-lg truncate leading-tight text-(--tui-text-primary)"
        >
          {{ item().name }}
        </span>
        @if (item().description) {
          <span
            class="text-xs text-(--tui-text-secondary) line-clamp-2 leading-relaxed"
          >
            {{ item().description }}
          </span>
        }
      </div>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaterialCatalogCardComponent {
  item = input.required<MaterialCatalogItem>();
  clicked = output<MaterialCatalogItem>();
  edit = output<MaterialCatalogItem>();
  delete = output<MaterialCatalogItem>();
}
