import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  TuiButton,
  type TuiDialogContext,
  TuiDialogService,
  TuiIcon,
  TuiInput,
  TuiLabel,
  TuiLoader,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  TuiFiles,
  TuiInputNumber,
  TuiSwitch,
  TuiTextarea,
} from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { MaterialCatalogService } from '../../services/material-catalog.service';
import { ToastService } from '../../services/toast.service';

import type { MaterialCatalogItem } from '../../models';

import {
  COMMON_IMAGE_EDITOR_CONFIG,
  createNewPhoto,
  fileToDataUrl,
  handleErrorToast,
  type NewPhoto,
} from '../../utils';
import { openImageEditor } from '../../utils/open-image-editor';

export interface MaterialCatalogFormData {
  itemData?: MaterialCatalogItem;
}

@Component({
  selector: 'app-material-catalog-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    TuiButton,
    TuiFiles,
    TuiIcon,
    TuiInput,
    TuiInputNumber,
    TuiLabel,
    TuiLoader,
    TuiSwitch,
    TuiTextarea,
    TuiTextfield,
  ],
  template: `
    <div class="flex flex-col gap-6">
      <div class="grid grid-cols-1 gap-4">
        <!-- Name -->
        <tui-textfield class="w-full">
          <label tuiLabel for="material-name">
            {{ 'admin.materialCatalog.nameLabel' | translate }} *
          </label>
          <input
            id="material-name"
            tuiInput
            type="text"
            [ngModel]="model().name"
            (ngModelChange)="updateModel('name', $event)"
            name="name"
            autocomplete="off"
          />
        </tui-textfield>

        <!-- Price -->
        <tui-textfield class="w-full">
          <label tuiLabel for="material-price">
            {{ 'admin.materialCatalog.priceLabel' | translate }} *
          </label>
          <input
            id="material-price"
            tuiInputNumber
            [min]="0.01"
            [step]="0.1"
            [ngModel]="model().price"
            (ngModelChange)="updateModel('price', $event)"
            name="price"
            autocomplete="off"
          />
          <span class="tui-textfield__suffix">€</span>
        </tui-textfield>

        <!-- Description -->
        <tui-textfield class="w-full">
          <label tuiLabel for="material-description">
            {{ 'admin.materialCatalog.descriptionLabel' | translate }}
          </label>
          <textarea
            id="material-description"
            tuiTextarea
            [rows]="3"
            [ngModel]="model().description"
            (ngModelChange)="updateModel('description', $event)"
            name="description"
            [placeholder]="
              'admin.materialCatalog.descriptionPlaceholder' | translate
            "
          ></textarea>
        </tui-textfield>

        <!-- Image Gallery / Photo -->
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between px-1">
            <span class="text-xs font-bold opacity-60 uppercase">
              {{ 'admin.materialCatalog.photo' | translate }}
            </span>
            <label tuiInputFiles>
              <input
                accept="image/*"
                tuiInputFiles
                multiple
                [ngModel]="fileInputModel()"
                (ngModelChange)="onPhotoFileChange($event)"
              />
              <button
                tuiButton
                type="button"
                appearance="flat"
                size="s"
                iconStart="@tui.plus"
              >
                {{ 'admin.materialCatalog.addImage' | translate }}
              </button>
            </label>
          </div>

          @if (newPhoto(); as photo) {
            <div
              class="relative aspect-square w-36 rounded-xl overflow-hidden border border-accent border-dashed group"
            >
              <img
                [src]="photo.preview"
                alt="Preview"
                class="w-full h-full object-cover"
              />
              <div
                class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div
                  class="bg-(--tui-background-base) rounded-xl p-0.5 flex gap-1"
                >
                  <button
                    tuiButton
                    type="button"
                    appearance="flat"
                    size="xs"
                    (click)="editPhoto(photo.file)"
                  >
                    <tui-icon icon="@tui.pencil" />
                  </button>
                  <button
                    tuiButton
                    type="button"
                    appearance="destructive"
                    size="xs"
                    (click)="removeNewPhoto()"
                  >
                    <tui-icon icon="@tui.trash" />
                  </button>
                </div>
              </div>
            </div>
          } @else if (model().image_url) {
            <div
              class="relative aspect-square w-36 rounded-xl overflow-hidden border border-(--tui-border-normal) group"
            >
              <img
                [src]="model().image_url"
                [alt]="model().name"
                class="w-full h-full object-cover"
              />
              <div
                class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div
                  class="bg-(--tui-background-base) rounded-xl p-0.5 flex gap-1"
                >
                  <label tuiInputFiles>
                    <input
                      accept="image/*"
                      tuiInputFiles
                      multiple
                      [ngModel]="fileInputModel()"
                      (ngModelChange)="onPhotoFileChange($event)"
                    />
                    <button tuiButton type="button" appearance="flat" size="xs">
                      <tui-icon icon="@tui.pencil" />
                    </button>
                  </label>
                  <button
                    tuiButton
                    type="button"
                    appearance="destructive"
                    size="xs"
                    (click)="removeExistingPhoto()"
                  >
                    <tui-icon icon="@tui.trash" />
                  </button>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Active Switch -->
        <div
          class="flex items-center justify-between gap-4 p-4 rounded-xl bg-(--tui-base-02)"
        >
          <span class="font-semibold">
            {{ 'admin.materialCatalog.active' | translate }}
          </span>
          <input
            tuiSwitch
            type="checkbox"
            [ngModel]="model().active"
            (ngModelChange)="updateModel('active', $event)"
            name="active"
            size="m"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 px-1 mt-4">
        <button tuiButton appearance="flat" type="button" (click)="onCancel()">
          {{ 'cancel' | translate }}
        </button>
        <tui-loader [loading]="isSaving() || isUploading()" [overlay]="true">
          <button
            tuiButton
            appearance="primary"
            type="button"
            (click)="save()"
            [disabled]="!model().name.trim() || model().price <= 0"
          >
            {{ 'save' | translate }}
          </button>
        </tui-loader>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaterialCatalogFormComponent {
  private readonly context =
    injectContext<TuiDialogContext<boolean, MaterialCatalogFormData>>();
  private readonly catalogService = inject(MaterialCatalogService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  readonly isSaving = signal(false);
  readonly isUploading = signal(false);
  readonly isProcessingPhoto = signal(false);

  readonly newPhoto = signal<NewPhoto | null>(null);
  readonly fileInputModel = signal<File[] | null>(null);

  readonly model = signal({
    name: '',
    description: '',
    price: 1.5,
    image_url: '',
    active: true,
  });

  constructor() {
    const item = this.context.data?.itemData;
    if (item) {
      this.model.set({
        name: item.name,
        description: item.description || '',
        price: item.price,
        image_url: item.image_url || '',
        active: item.active,
      });
    }
  }

  updateModel<K extends keyof ReturnType<typeof this.model>>(
    key: K,
    value: ReturnType<typeof this.model>[K],
  ): void {
    this.model.update((m) => ({ ...m, [key]: value }));
  }

  async onPhotoFileChange(files: File | File[] | null): Promise<void> {
    if (!files) return;

    const fileArray = Array.isArray(files) ? files : [files];

    // Reset input model to allow re-selecting the same file
    this.fileInputModel.set(null);

    for (const file of fileArray) {
      this.isProcessingPhoto.set(true);
      await this.editPhoto(file);
    }
  }

  async editPhoto(file?: File | null, imageUrl?: string): Promise<void> {
    const data = {
      ...COMMON_IMAGE_EDITOR_CONFIG,
      file: file ?? undefined,
      imageUrl: imageUrl ?? undefined,
    };

    if (!data.file && !data.imageUrl) {
      this.isProcessingPhoto.set(false);
      return;
    }

    const result = await openImageEditor(this.dialogs, data);

    this.isProcessingPhoto.set(false);

    if (result) {
      const preview = await fileToDataUrl(result);
      this.newPhoto.set(createNewPhoto(result, preview));
    }
  }

  removeNewPhoto(): void {
    this.newPhoto.set(null);
  }

  removeExistingPhoto(): void {
    this.model.update((m) => ({ ...m, image_url: '' }));
  }

  onCancel(): void {
    this.context.completeWith(false);
  }

  async save(): Promise<void> {
    const m = this.model();
    if (!m.name.trim() || m.price <= 0) return;

    this.isSaving.set(true);
    try {
      let imageUrl = m.image_url.trim() || null;

      const photo = this.newPhoto();
      if (photo) {
        this.isUploading.set(true);
        const uploadedUrl = await this.catalogService.uploadMaterialImage(
          photo.file,
        );
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          throw new Error(
            this.translate.instant('merchandising.items.uploadError'),
          );
        }
      }

      const itemData = this.context.data?.itemData;
      const payload = {
        name: m.name.trim(),
        description: m.description.trim() || null,
        unit: itemData?.unit || 'ud',
        price: m.price,
        image_url: imageUrl,
        active: m.active,
      };

      if (itemData?.id) {
        const ok = await this.catalogService.updateMaterialItem(
          itemData.id,
          payload,
        );
        if (ok) {
          this.context.completeWith(true);
        }
      } else {
        const res = await this.catalogService.createMaterialItem(payload);
        if (res) {
          this.context.completeWith(true);
        }
      }
    } catch (e) {
      console.error('[MaterialCatalogFormComponent] Error saving item:', e);
      handleErrorToast(e, this.toast);
    } finally {
      this.isSaving.set(false);
      this.isUploading.set(false);
    }
  }
}
