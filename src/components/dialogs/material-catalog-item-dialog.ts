import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { type TuiDialogContext, TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { AuthStateService } from '../../services/auth-state.service';

import type { MaterialCatalogItem } from '../../models';

@Component({
  selector: 'app-material-catalog-item-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    TranslatePipe,
    TuiBadge,
    TuiButton,
    TuiIcon,
  ],
  template: `
    <div
      class="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-6 md:gap-10 items-start"
    >
      <!-- Image Section -->
      <div
        class="relative aspect-square rounded-[2.5rem] overflow-hidden bg-(--tui-background-neutral-1) border border-(--tui-border-normal) md:sticky md:top-0"
      >
        @if (item.image_url) {
          <img
            [src]="item.image_url"
            [alt]="item.name"
            class="w-full h-full object-cover"
          />
        } @else {
          <div class="w-full h-full flex items-center justify-center">
            <tui-icon
              icon="@tui.hammer"
              class="text-8xl opacity-10 text-(--tui-text-tertiary)"
            />
          </div>
        }
      </div>

      <!-- Info Section -->
      <div class="flex flex-col gap-4">
        <div class="flex justify-between items-center gap-4">
          <div>
            <span
              tuiBadge
              size="s"
              [appearance]="item.active ? 'positive' : 'neutral'"
            >
              {{
                item.active
                  ? ('admin.materialCatalog.active' | translate)
                  : ('admin.materialCatalog.inactive' | translate)
              }}
            </span>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            @if (isAdmin()) {
              <div class="flex gap-2">
                <button
                  tuiIconButton
                  appearance="accent"
                  size="s"
                  type="button"
                  class="rounded-xl!"
                  (click)="setAction('edit')"
                  [attr.aria-label]="'edit' | translate"
                >
                  <tui-icon icon="@tui.pencil" />
                </button>

                <button
                  tuiIconButton
                  appearance="negative"
                  size="s"
                  type="button"
                  class="rounded-xl!"
                  (click)="setAction('delete')"
                  [attr.aria-label]="'delete' | translate"
                >
                  <tui-icon icon="@tui.trash" />
                </button>
              </div>
            }
            <div class="text-2xl font-black tabular-nums">
              {{ item.price | number: '1.2-2' }}€
            </div>
          </div>
        </div>

        @if (item.description) {
          <p class="text-base text-(--tui-text-secondary) leading-relaxed m-0">
            {{ item.description }}
          </p>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaterialCatalogItemDialogComponent {
  private readonly authState = inject(AuthStateService);

  protected readonly isAdmin = this.authState.isAdmin;

  protected readonly context =
    injectContext<
      TuiDialogContext<'edit' | 'delete' | undefined, MaterialCatalogItem>
    >();
  protected readonly item: MaterialCatalogItem = this.context.data;

  /**
   * Cierra la ficha devolviendo la acción elegida: quien la abrió
   * (`MaterialCatalogService`) se encarga de abrir el formulario o de borrar.
   */
  protected setAction(action: 'edit' | 'delete'): void {
    this.context.completeWith(action);
  }
}
