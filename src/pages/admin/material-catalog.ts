import { CommonModule, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  TuiAppearance,
  TuiButton,
  TuiIcon,
  TuiLabel,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  TuiBadge,
  TuiInputNumber,
  TuiSkeleton,
  TuiSwitch,
} from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { MaterialCatalogService } from '../../services/material-catalog.service';

import type { MaterialCatalogItem } from '../../models';

@Component({
  selector: 'app-admin-material-catalog',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    TuiAppearance,
    TuiBadge,
    TuiButton,
    TuiIcon,
    TuiInputNumber,
    TuiLabel,
    TuiSkeleton,
    TuiSwitch,
    TuiTextfield,
  ],
  template: `
    <div
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8"
    >
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div
            class="w-12 h-12 rounded-2xl bg-(--tui-background-accent-1) text-(--tui-background-base) flex items-center justify-center shrink-0 shadow-lg"
          >
            <tui-icon icon="@tui.hammer" class="w-6 h-6" />
          </div>
          <div>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight m-0">
              {{ 'admin.materialCatalog.title' | translate }}
            </h1>
            <p class="text-xs sm:text-sm text-(--tui-text-secondary) m-0">
              {{ 'admin.materialCatalog.subtitle' | translate }}
            </p>
          </div>
        </div>

        <button
          tuiButton
          appearance="accent"
          size="m"
          type="button"
          class="rounded-2xl!"
          (click)="openCreateModal()"
        >
          <tui-icon icon="@tui.plus" class="w-4 h-4" />
          <span>{{ 'admin.materialCatalog.addItem' | translate }}</span>
        </button>
      </div>

      <!-- Items Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @if (catalogResource.isLoading()) {
          @for (_ of [1, 2, 3, 4, 5, 6]; track $index) {
            <div [tuiSkeleton]="true" class="h-44 rounded-3xl"></div>
          }
        } @else {
          @for (item of allItems(); track item.id) {
            <div
              class="flex flex-col justify-between p-5 rounded-3xl bg-(--tui-background-elevated) border border-(--tui-border-normal) shadow-md gap-4 relative"
            >
              <div class="flex items-start gap-4">
                @if (item.image_url) {
                  <img
                    [src]="item.image_url"
                    [alt]="item.name"
                    class="w-16 h-16 rounded-2xl object-cover shrink-0 border"
                  />
                } @else {
                  <div
                    class="w-16 h-16 rounded-2xl bg-(--tui-background-neutral-2) flex items-center justify-center shrink-0 text-(--tui-text-secondary)"
                  >
                    <tui-icon icon="@tui.hammer" class="w-8 h-8" />
                  </div>
                }

                <div class="flex flex-col min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-black text-sm sm:text-base truncate">
                      {{ item.name }}
                    </span>
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

                  @if (item.description) {
                    <span
                      class="text-xs text-(--tui-text-secondary) line-clamp-2 mt-0.5"
                    >
                      {{ item.description }}
                    </span>
                  }
                  @if (item.unit) {
                    <span
                      class="text-[11px] text-(--tui-text-secondary) mt-0.5"
                    >
                      Unidad: {{ item.unit }}
                    </span>
                  }

                  <span
                    class="text-lg font-black text-(--tui-text-accent) tabular-nums mt-1"
                  >
                    {{ item.price | number: '1.2-2' }}€
                  </span>
                </div>
              </div>

              <!-- Footer Actions -->
              <div
                class="flex items-center justify-between pt-3 border-t border-(--tui-border-normal)"
              >
                <label
                  class="flex items-center gap-2 cursor-pointer text-xs font-semibold"
                >
                  <input
                    tuiSwitch
                    type="checkbox"
                    [ngModel]="item.active"
                    (ngModelChange)="toggleItemActive(item)"
                    size="s"
                  />
                  <span>{{
                    'admin.materialCatalog.available' | translate
                  }}</span>
                </label>

                <div class="flex items-center gap-1">
                  <button
                    tuiButton
                    appearance="secondary"
                    size="xs"
                    type="button"
                    (click)="openEditModal(item)"
                  >
                    <tui-icon icon="@tui.pencil" class="w-3.5 h-3.5" />
                    <span>{{ 'edit' | translate }}</span>
                  </button>

                  <button
                    tuiButton
                    appearance="negative"
                    size="xs"
                    type="button"
                    (click)="deleteItem(item.id)"
                  >
                    <tui-icon icon="@tui.trash" class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          } @empty {
            <div
              class="col-span-full py-16 text-center text-sm text-(--tui-text-secondary)"
            >
              {{ 'admin.materialCatalog.empty' | translate }}
            </div>
          }
        }
      </div>

      <!-- Edit/Create Modal -->
      @if (showModal()) {
        <div
          class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            class="w-full max-w-lg bg-(--tui-background-elevated) rounded-3xl border border-(--tui-border-normal) shadow-2xl p-6 flex flex-col gap-6"
          >
            <div class="flex items-center justify-between border-b pb-3">
              <h3 class="text-xl font-black m-0">
                {{
                  (editingItem()?.id
                    ? 'admin.materialCatalog.editItem'
                    : 'admin.materialCatalog.newItem'
                  ) | translate
                }}
              </h3>
              <button
                tuiButton
                appearance="flat"
                size="xs"
                type="button"
                (click)="closeModal()"
              >
                <tui-icon icon="@tui.x" />
              </button>
            </div>

            <form (ngSubmit)="saveItem()" class="flex flex-col gap-4">
              <tui-textfield>
                <label tuiLabel for="catalog-item-name-input"
                  >{{ 'admin.materialCatalog.nameLabel' | translate }} *</label
                >
                <input
                  id="catalog-item-name-input"
                  tuiTextfield
                  required
                  [(ngModel)]="formData.name"
                  name="name"
                />
              </tui-textfield>

              <tui-textfield>
                <label tuiLabel for="catalog-item-desc-input">
                  Descripción
                </label>
                <input
                  id="catalog-item-desc-input"
                  tuiTextfield
                  [(ngModel)]="formData.description"
                  name="description"
                  placeholder="M10x90mm inoxidable AISI 316, etc."
                />
              </tui-textfield>

              <div class="grid grid-cols-2 gap-3">
                <tui-textfield>
                  <label tuiLabel for="catalog-item-price-input"
                    >{{ 'admin.materialCatalog.priceLabel' | translate }} (€)
                    *</label
                  >
                  <input
                    id="catalog-item-price-input"
                    tuiInputNumber
                    required
                    [min]="0.01"
                    [step]="0.1"
                    [(ngModel)]="formData.price"
                    name="price"
                  />
                </tui-textfield>

                <tui-textfield>
                  <label tuiLabel for="catalog-item-unit-input">Unidad</label>
                  <input
                    id="catalog-item-unit-input"
                    tuiTextfield
                    required
                    [(ngModel)]="formData.unit"
                    name="unit"
                    placeholder="ud / pack"
                  />
                </tui-textfield>
              </div>

              <tui-textfield>
                <label tuiLabel for="catalog-item-image-input">{{
                  'admin.materialCatalog.imageUrlLabel' | translate
                }}</label>
                <input
                  id="catalog-item-image-input"
                  tuiTextfield
                  [(ngModel)]="formData.image_url"
                  name="image_url"
                  placeholder="https://..."
                />
              </tui-textfield>

              <label
                class="flex items-center gap-2 cursor-pointer text-sm font-bold pt-1"
              >
                <input
                  tuiSwitch
                  type="checkbox"
                  [(ngModel)]="formData.active"
                  name="active"
                  size="s"
                />
                <span>{{
                  'admin.materialCatalog.activeLabel' | translate
                }}</span>
              </label>

              <div class="flex justify-end gap-3 pt-4 border-t">
                <button
                  tuiButton
                  appearance="secondary"
                  size="m"
                  type="button"
                  (click)="closeModal()"
                >
                  {{ 'cancel' | translate }}
                </button>
                <button
                  tuiButton
                  appearance="accent"
                  size="m"
                  type="submit"
                  [disabled]="!formData.name || formData.price <= 0 || saving()"
                >
                  {{ 'save' | translate }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMaterialCatalogComponent {
  private readonly catalogService = inject(MaterialCatalogService);

  showModal = signal<boolean>(false);
  editingItem = signal<MaterialCatalogItem | null>(null);
  saving = signal<boolean>(false);

  formData = {
    name: '',
    description: '',
    unit: 'ud',
    price: 1.5,
    image_url: '',
    active: true,
  };

  readonly catalogResource = resource<MaterialCatalogItem[], void>({
    loader: () => this.catalogService.loadCatalog(true),
  });

  readonly allItems = computed(() => this.catalogResource.value() ?? []);

  openCreateModal(): void {
    this.editingItem.set(null);
    this.formData = {
      name: '',
      description: '',
      unit: 'ud',
      price: 1.5,
      image_url: '',
      active: true,
    };
    this.showModal.set(true);
  }

  openEditModal(item: MaterialCatalogItem): void {
    this.editingItem.set(item);
    this.formData = {
      name: item.name,
      description: item.description || '',
      unit: item.unit || 'ud',
      price: item.price,
      image_url: item.image_url || '',
      active: item.active,
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingItem.set(null);
  }

  async saveItem(): Promise<void> {
    if (!this.formData.name || this.formData.price <= 0) return;

    this.saving.set(true);
    try {
      if (this.editingItem()?.id) {
        const id = this.editingItem()!.id;
        const ok = await this.catalogService.updateMaterialItem(id, {
          name: this.formData.name.trim(),
          description: this.formData.description.trim() || null,
          unit: this.formData.unit.trim() || 'ud',
          price: this.formData.price,
          image_url: this.formData.image_url.trim() || null,
          active: this.formData.active,
        });
        if (ok) {
          this.closeModal();
          void this.catalogResource.reload();
        }
      } else {
        const res = await this.catalogService.createMaterialItem({
          name: this.formData.name.trim(),
          description: this.formData.description.trim() || null,
          unit: this.formData.unit.trim() || 'ud',
          price: this.formData.price,
          image_url: this.formData.image_url.trim() || null,
          active: this.formData.active,
        });
        if (res) {
          this.closeModal();
          void this.catalogResource.reload();
        }
      }
    } finally {
      this.saving.set(false);
    }
  }

  async toggleItemActive(item: MaterialCatalogItem): Promise<void> {
    const ok = await this.catalogService.toggleActive(item.id, !item.active);
    if (ok) {
      void this.catalogResource.reload();
    }
  }

  async deleteItem(id: number): Promise<void> {
    if (confirm('¿Eliminar este material del catálogo?')) {
      const ok = await this.catalogService.deleteMaterialItem(id);
      if (ok) {
        void this.catalogResource.reload();
      }
    }
  }
}
