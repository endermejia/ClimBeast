import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { Location } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  resource,
  Signal,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, required, submit } from '@angular/forms/signals';

import {
  type TuiDialogContext,
  TuiAppearance,
  TuiButton,
  TuiDialogService,
  TuiError,
  TuiIcon,
  TuiInput,
  TuiLabel,
  TuiLoader,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  TuiBadgeNotification,
  TuiFiles,
  TuiTabs,
  TuiTextarea,
} from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CacheService } from '../../services/cache.service';
import { IndoorCentersDataService } from '../../services/indoor-centers-data.service';
import { IndoorService } from '../../services/indoor.service';
import { SlugService } from '../../services/slug.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

import {
  DEFAULT_INDOOR_CENTER_PERMISSIONS,
  IndoorCenterDto,
  IndoorCenterPermissions,
  Json,
  parseIndoorCenterPermissions,
  scheduleToJson,
} from '../../models';

import { CACHE_KEYS } from '../../constants';
import {
  COMMON_IMAGE_EDITOR_CONFIG,
  createNewPhoto,
  fileToDataUrl,
  handleErrorToast,
  NewPhoto,
  reorderGallery,
  slugify,
} from '../../utils';
import { openImageEditor } from '../../utils/open-image-editor';

import { IS_BROWSER } from '../../app/is-browser';
import {
  CoordinatesFieldsComponent,
  CoordinatesValue,
} from '../location/coordinates-fields';
import {
  IndoorCenterPermissionsSectionComponent,
  type IndoorPermissionChangeEvent,
} from './indoor-center-permissions-section';
import {
  buildIndoorSchedulePayload,
  buildInitialIndoorSchedule,
  IndoorCenterScheduleSectionComponent,
  type IndoorScheduleFormState,
} from './indoor-center-schedule-section';
import { IndoorCenterStaffSectionComponent } from './indoor-center-staff-section';
import {
  IndoorCenterVouchersSectionComponent,
  type IndoorCenterLocalVoucher,
} from './indoor-center-vouchers-section';

@Component({
  selector: 'app-indoor-center-form',
  imports: [
    CdkDrag,
    CdkDropList,
    CoordinatesFieldsComponent,
    FormField,
    FormsModule,
    IndoorCenterPermissionsSectionComponent,
    IndoorCenterScheduleSectionComponent,
    IndoorCenterStaffSectionComponent,
    IndoorCenterVouchersSectionComponent,
    TranslatePipe,
    TuiAppearance,
    TuiBadgeNotification,
    TuiButton,
    TuiError,
    TuiFiles,
    TuiIcon,
    TuiInput,
    TuiLabel,
    TuiLoader,
    TuiScrollbar,
    TuiTabs,
    TuiTextarea,
    TuiTextfield,
  ],
  template: `
    <form
      class="flex flex-col grow max-h-[70dvh] min-h-0 w-full overflow-hidden"
      (submit.zoneless)="onSubmit($event)"
    >
      @if (isEdit()) {
        <div class="overflow-x-auto no-scrollbar mb-4 shrink-0">
          <tui-tabs [(activeItemIndex)]="activeTabIndex">
            <button tuiTab type="button">{{ 'details' | translate }}</button>
            <button tuiTab type="button">
              {{ 'indoor.schedule' | translate }}
            </button>
            <button tuiTab type="button">
              {{ 'indoor.vouchers' | translate }}
            </button>
            <button tuiTab type="button">
              {{ 'admin.title' | translate }}
              @if (centerRoutesetterRequests().length > 0) {
                <tui-badge-notification
                  tuiAppearance="accent"
                  size="s"
                  class="ml-1.5"
                >
                  {{ centerRoutesetterRequests().length }}
                </tui-badge-notification>
              }
            </button>
            <button tuiTab type="button">
              {{ 'indoor.permissions.title' | translate }}
            </button>
          </tui-tabs>
        </div>
      }

      <tui-scrollbar class="grow min-h-0 overflow-x-hidden!">
        <div class="pt-1 pr-2 pb-2">
          @switch (activeTabIndex()) {
            @case (0) {
              <div class="grid gap-4">
                <div
                  class="flex flex-wrap items-center gap-4 rounded-2xl bg-(--tui-background-neutral-1) p-4"
                >
                  <div
                    class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--tui-border-normal) bg-(--tui-background-base)"
                  >
                    @if (avatarPreviewUrl(); as avatarUrl) {
                      <img
                        [src]="avatarUrl"
                        [alt]="model().name || ('indoor.avatar' | translate)"
                        class="size-full object-cover"
                      />
                    } @else {
                      <tui-icon icon="@tui.image" class="text-2xl opacity-50" />
                    }
                  </div>
                  <div class="flex min-w-0 flex-col gap-2">
                    <h3 class="font-bold text-lg">
                      {{ 'indoor.avatar' | translate }}
                    </h3>
                    <label tuiInputFiles>
                      <input
                        accept="image/*"
                        type="file"
                        tuiInputFiles
                        [ngModel]="null"
                        [ngModelOptions]="{ standalone: true }"
                        (change)="onAvatarFileChange($event)"
                      />
                      <button
                        tuiButton
                        type="button"
                        appearance="secondary-grayscale"
                        size="s"
                        iconStart="@tui.pencil"
                      >
                        {{ 'indoor.changeAvatar' | translate }}
                      </button>
                    </label>
                  </div>
                </div>

                <tui-textfield class="block" [tuiTextfieldCleaner]="false">
                  <label tuiLabel for="center-name">{{
                    'name' | translate
                  }}</label>
                  <input
                    tuiInput
                    id="center-name"
                    [formField]="centerForm.name"
                    type="text"
                    autocomplete="off"
                  />
                </tui-textfield>
                @if (
                  centerForm.name().invalid() && centerForm.name().touched()
                ) {
                  <tui-error [error]="'errors.required' | translate" />
                }

                <tui-textfield class="block" [tuiTextfieldCleaner]="false">
                  <label tuiLabel for="center-city">{{
                    'city' | translate
                  }}</label>
                  <input
                    tuiInput
                    id="center-city"
                    [formField]="centerForm.city"
                    type="text"
                    autocomplete="off"
                  />
                </tui-textfield>

                <tui-textfield class="block" [tuiTextfieldCleaner]="false">
                  <label tuiLabel for="center-desc">{{
                    'description' | translate
                  }}</label>
                  <textarea
                    tuiTextarea
                    id="center-desc"
                    [ngModel]="model().description"
                    (ngModelChange)="onDescriptionChange($event)"
                    name="description"
                  ></textarea>
                </tui-textfield>

                <tui-textfield class="block">
                  <label tuiLabel for="center-warning">{{
                    'indoor.warning' | translate
                  }}</label>
                  <textarea
                    tuiTextarea
                    id="center-warning"
                    [ngModel]="model().warning"
                    (ngModelChange)="onWarningChange($event)"
                    name="warning"
                  ></textarea>
                </tui-textfield>

                <app-coordinates-fields
                  [latitude]="model().latitude"
                  [longitude]="model().longitude"
                  (coordinatesChange)="onCoordinatesChange($event)"
                />

                <!-- Gallery -->
                <div class="flex flex-col gap-3">
                  <div class="flex items-center justify-between px-1">
                    <h3 class="font-bold text-lg">
                      {{ 'merchandising.items.gallery' | translate }}
                    </h3>
                    <label tuiInputFiles>
                      <input
                        accept="image/*"
                        type="file"
                        tuiInputFiles
                        multiple
                        [ngModel]="null"
                        [ngModelOptions]="{ standalone: true }"
                        (change)="onFilesChange($event)"
                      />
                      <button
                        tuiButton
                        type="button"
                        appearance="secondary-grayscale"
                        size="s"
                        iconStart="@tui.plus"
                      >
                        {{ 'merchandising.items.addImage' | translate }}
                      </button>
                    </label>
                  </div>

                  <div
                    class="grid grid-cols-2 sm:grid-cols-4 gap-3"
                    cdkDropList
                    cdkDropListOrientation="mixed"
                    (cdkDropListDropped)="dropImage($event)"
                  >
                    @for (img of galleryUrls(); track img) {
                      <div
                        cdkDrag
                        class="relative aspect-square rounded-xl overflow-hidden border border-(--tui-border-normal) group cursor-grab active:cursor-grabbing"
                      >
                        <img
                          [src]="img"
                          class="w-full h-full object-cover"
                          alt="Gallery image"
                        />
                        <div
                          class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <div
                            class="bg-(--tui-background-base) rounded-xl p-0.5"
                          >
                            <button
                              tuiButton
                              type="button"
                              appearance="destructive"
                              size="s"
                              (click)="removeExistingImage(img)"
                            >
                              <tui-icon icon="@tui.trash" />
                            </button>
                          </div>
                        </div>
                      </div>
                    }

                    @for (item of newPhotos(); track item.id) {
                      <div
                        cdkDrag
                        class="relative aspect-square rounded-xl overflow-hidden border border-accent border-dashed group cursor-grab active:cursor-grabbing"
                      >
                        <img
                          [src]="item.preview"
                          class="w-full h-full object-cover"
                          alt="New photo"
                        />
                        <div
                          class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <div
                            class="bg-(--tui-background-base) rounded-xl p-0.5"
                          >
                            <button
                              tuiButton
                              type="button"
                              appearance="destructive"
                              size="s"
                              (click)="removeNewPhoto(item.id)"
                            >
                              <tui-icon icon="@tui.trash" />
                            </button>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }

            @case (1) {
              <app-indoor-center-schedule-section [(schedule)]="scheduleForm" />
            }

            @case (2) {
              <app-indoor-center-vouchers-section
                [(vouchers)]="localVouchers"
              />
            }

            @case (3) {
              <app-indoor-center-staff-section
                [centerId]="centerId()"
                [pendingRequests]="centerRoutesetterRequests()"
                (pendingRequestsChanged)="onPendingRequestsChanged()"
              />
            }

            @case (4) {
              <app-indoor-center-permissions-section
                [permissions]="model().permissions"
                (permissionChange)="onPermissionChange($event)"
              />
            }
          }
        </div>
      </tui-scrollbar>

      <!-- Unified Footer Action Buttons -->
      <div
        class="flex flex-wrap gap-2 justify-end pt-4 border-t border-(--tui-border-normal) shrink-0"
      >
        <button
          tuiButton
          appearance="flat"
          type="button"
          (click.zoneless)="goBack()"
        >
          {{ 'cancel' | translate }}
        </button>
        <tui-loader [loading]="isSaving() || isUploading()" [overlay]="true">
          <button
            [disabled]="centerForm.name().invalid()"
            tuiButton
            appearance="primary"
            type="submit"
          >
            {{ (isEdit() ? 'save' : 'create') | translate }}
          </button>
        </tui-loader>
      </div>
    </form>
  `,
  host: { class: 'flex flex-col max-h-[70dvh] min-h-0 w-full overflow-hidden' },
})
export class IndoorCenterFormComponent {
  private readonly indoor = inject(IndoorService);
  private readonly indoorCentersData = inject(IndoorCentersDataService);
  private readonly location = inject(Location);
  protected readonly supabase = inject(SupabaseService);
  private readonly slugService = inject(SlugService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly cache = inject(CacheService);
  private readonly translate = inject(TranslateService);
  private readonly isBrowser = inject(IS_BROWSER);

  private readonly _dialogCtx: TuiDialogContext<
    string | boolean | null,
    { centerData?: Partial<IndoorCenterDto> }
  > | null = (() => {
    try {
      return injectContext<
        TuiDialogContext<
          string | boolean | null,
          { centerData?: Partial<IndoorCenterDto> }
        >
      >();
    } catch {
      return null;
    }
  })();

  centerData: InputSignal<Partial<IndoorCenterDto> | undefined> = input<
    Partial<IndoorCenterDto> | undefined
  >(undefined);

  private readonly effectiveCenterData: Signal<
    Partial<IndoorCenterDto> | undefined
  > = computed(() => this._dialogCtx?.data?.centerData ?? this.centerData());

  readonly isEdit: Signal<boolean> = computed(
    () => !!this.effectiveCenterData()?.id,
  );

  protected readonly activeTabIndex = signal(0);
  protected readonly centerId = computed(() => this.effectiveCenterData()?.id);

  protected readonly centerRoutesetterRequestsResource = resource({
    params: () => this.centerId(),
    loader: async ({ params: centerId }) => {
      if (!centerId || !this.isBrowser) return [];
      return await this.indoor.getIndoorCenterRoutesetterRequests(centerId);
    },
  });

  protected readonly centerRoutesetterRequests = computed(
    () => this.centerRoutesetterRequestsResource.value() ?? [],
  );

  readonly isSaving = signal(false);
  readonly isUploading = signal(false);
  protected readonly newPhotos = signal<NewPhoto[]>([]);
  protected readonly newAvatarPhoto = signal<NewPhoto | null>(null);

  protected readonly avatarPreviewUrl = computed(() => {
    const newPhoto = this.newAvatarPhoto();
    if (newPhoto) return newPhoto.preview;

    const avatarUrl = this.effectiveCenterData()?.avatar_url;
    return avatarUrl
      ? this.supabase.getPublicUrl('indoor-centers', avatarUrl)
      : '';
  });

  model = signal<{
    name: string;
    slug: string;
    city: string;
    description: string;
    warning: string;
    latitude: number | null;
    longitude: number | null;
    gallery_urls: string[];
    permissions: IndoorCenterPermissions;
  }>({
    name: '',
    slug: '',
    city: '',
    description: '',
    warning: '',
    latitude: null,
    longitude: null,
    gallery_urls: [],
    permissions: { ...DEFAULT_INDOOR_CENTER_PERMISSIONS },
  });

  protected readonly galleryUrls = computed(() => {
    return this.model().gallery_urls.map((img) =>
      this.supabase.getPublicUrl('indoor-assets', img),
    );
  });

  centerForm = form(this.model, (path) => {
    required(path.name);
  });

  private editingId: string | null = null;

  protected readonly scheduleForm = signal<IndoorScheduleFormState>(
    buildInitialIndoorSchedule(),
  );

  protected readonly localVouchers = signal<IndoorCenterLocalVoucher[]>([]);

  protected onPermissionChange(event: IndoorPermissionChangeEvent): void {
    this.model.update((m) => ({
      ...m,
      permissions: {
        ...m.permissions,
        [event.key]: event.value,
      },
    }));
  }

  protected onPendingRequestsChanged(): void {
    this.centerRoutesetterRequestsResource.reload();
  }

  constructor() {
    effect(() => {
      const data = this.effectiveCenterData();
      if (!data) return;
      this.editingId = data.id || null;
      this.model.update((m) => ({
        ...m,
        name: data.name || '',
        slug: data.slug || '',
        city: data.city || '',
        description: data.description || '',
        warning: data.warning || '',
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        gallery_urls: data.gallery_urls || [],
        permissions: parseIndoorCenterPermissions(data.permissions),
      }));

      this.scheduleForm.set(buildInitialIndoorSchedule(data.schedule));
    });

    // Fetch existing vouchers on edit
    effect(async () => {
      const id = this.centerId();
      if (!id) {
        this.localVouchers.set([]);
        return;
      }
      try {
        const list = await this.indoor.getCenterVouchers(id);
        untracked(() => {
          this.localVouchers.set(
            list.map((v) => ({
              id: v.id,
              name: v.name,
              price: v.price,
              kind: v.kind || 'pass',
              description: v.description,
            })),
          );
        });
      } catch (e) {
        console.error('[IndoorCenterFormComponent] Error loading vouchers:', e);
      }
    });

    // Synchronous auto-slug preview update
    effect(() => {
      if (this.isEdit()) return;
      const name = this.model().name;
      if (!name) return;

      const generatedSlug = slugify(name);
      untracked(() => {
        const currentSlug = this.model().slug;
        if (currentSlug !== generatedSlug) {
          this.model.update((m) => ({ ...m, slug: generatedSlug }));
        }
      });
    });
  }

  async onFilesChange(event: Event): Promise<void> {
    const inputVal = event.target as HTMLInputElement;
    if (!inputVal.files || inputVal.files.length === 0) return;

    const fileArray = Array.from(inputVal.files);
    inputVal.value = '';

    for (const file of fileArray) {
      await this.editPhoto(file);
    }
  }

  async editPhoto(file?: File | null, imageUrl?: string): Promise<void> {
    const data = {
      ...COMMON_IMAGE_EDITOR_CONFIG,
      file: file ?? undefined,
      imageUrl: imageUrl ?? undefined,
    };

    if (!data.file && !data.imageUrl) return;

    const result = await openImageEditor(this.dialogs, data);

    if (result) {
      const preview = await fileToDataUrl(result);
      this.newPhotos.update((photos) => [
        ...photos,
        createNewPhoto(result, preview),
      ]);
    }
  }

  async onAvatarFileChange(event: Event): Promise<void> {
    const inputVal = event.target as HTMLInputElement;
    const file = inputVal.files?.[0];
    inputVal.value = '';
    if (!file) return;

    const data = {
      ...COMMON_IMAGE_EDITOR_CONFIG,
      aspectRatios: [COMMON_IMAGE_EDITOR_CONFIG.aspectRatios[0]],
      allowFree: false,
      file,
    };
    const result = await openImageEditor(this.dialogs, data);

    if (result) {
      const preview = await fileToDataUrl(result);
      this.newAvatarPhoto.set(createNewPhoto(result, preview));
    }
  }

  removeExistingImage(url: string): void {
    this.model.update((m) => ({
      ...m,
      gallery_urls: m.gallery_urls.filter((u) => u !== url),
    }));
  }

  removeNewPhoto(id: string): void {
    this.newPhotos.update((photos) => photos.filter((p) => p.id !== id));
  }

  dropImage(event: CdkDragDrop<unknown[]>): void {
    const { imageUrls, newPhotos } = reorderGallery(
      event,
      this.model().gallery_urls,
      this.newPhotos(),
    );
    this.model.update((m) => ({ ...m, gallery_urls: imageUrls }));
    this.newPhotos.set(newPhotos);
  }

  async onSubmit(event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();

    submit(this.centerForm, async () => {
      this.isSaving.set(true);
      try {
        const modelVal = this.model();

        // 1. Prepare Center Details and Schedule payload
        const schedulePayload = buildIndoorSchedulePayload(this.scheduleForm());

        // 2. Ensure unique slug for new center
        let finalSlug = modelVal.slug;
        if (!this.isEdit() || !finalSlug) {
          const baseSlug = slugify(modelVal.name || 'centro-indoor');
          finalSlug = await this.slugService.getUniqueSlug(
            'indoor_centers',
            baseSlug,
          );
        }

        const payload: Omit<IndoorCenterDto, 'id' | 'created_at'> = {
          name: modelVal.name,
          slug: finalSlug,
          city: modelVal.city || null,
          description: modelVal.description || null,
          warning: modelVal.warning || null,
          avatar_url: this.effectiveCenterData()?.avatar_url ?? null,
          latitude: modelVal.latitude,
          longitude: modelVal.longitude,
          contact_info: this.effectiveCenterData()?.contact_info ?? null,
          country: this.effectiveCenterData()?.country ?? null,
          gallery_urls: modelVal.gallery_urls,
          schedule: scheduleToJson(schedulePayload),
          location: this.effectiveCenterData()?.location ?? null,
          permissions: modelVal.permissions as unknown as Json,
        };

        // 2. Save center and retrieve center ID
        let savedCenterId = this.editingId;
        if (this.isEdit()) {
          if (this.editingId == null) return;
          await this.indoor.updateCenter(this.editingId, payload);
        } else {
          const newCenter = await this.indoor.createCenter(payload);
          if (!newCenter) throw new Error('Failed to create center');
          savedCenterId = newCenter.id;
        }

        if (!savedCenterId) {
          throw new Error('Failed to get center ID after save');
        }

        // 3. Upload the avatar to the bucket used by indoor center profiles.
        const avatarPhoto = this.newAvatarPhoto();
        if (avatarPhoto) {
          this.isUploading.set(true);
          const extension = avatarPhoto.file.name.split('.').pop() || 'jpg';
          const avatarPath = `centers/${savedCenterId}/avatar_${Date.now()}.${extension}`;
          const { data, error } = await this.supabase.client.storage
            .from('indoor-centers')
            .upload(avatarPath, avatarPhoto.file);

          if (error) throw error;
          await this.indoor.updateCenter(savedCenterId, {
            avatar_url: data.path,
          });
        }

        // 4. Save new photos if any (now that we have savedCenterId)
        if (this.newPhotos().length > 0) {
          this.isUploading.set(true);
          const newPhotoUrls: string[] = [];

          for (const item of this.newPhotos()) {
            const path = await this.indoor.uploadAsset(
              savedCenterId,
              item.file,
            );
            if (path) {
              newPhotoUrls.push(path);
            }
          }

          if (newPhotoUrls.length > 0) {
            const updatedGallery = [...modelVal.gallery_urls, ...newPhotoUrls];
            await this.indoor.updateCenter(savedCenterId, {
              gallery_urls: updatedGallery,
            });
          }
        }

        // 5. Save/Sync Vouchers in database
        const vouchersToSync = this.localVouchers();
        for (const v of vouchersToSync) {
          if (v.is_deleted) {
            if (v.id) {
              await this.indoor.deleteVoucher(v.id);
            }
          } else if (v.id) {
            await this.indoor.updateVoucher(v.id, {
              center_id: savedCenterId,
              name: v.name,
              price: v.price,
              kind: v.kind || 'pass',
              description: v.description || null,
              duration_days: 0,
              sessions_count: null,
              active: true,
            });
          } else {
            await this.indoor.createVoucher({
              center_id: savedCenterId,
              name: v.name,
              price: v.price,
              kind: v.kind || 'pass',
              description: v.description || null,
              duration_days: 0,
              sessions_count: null,
              active: true,
            });
          }
        }

        this.cache.remove(CACHE_KEYS.indoorCenters);
        this.cache.remove(CACHE_KEYS.activeIndoorCenters);
        this.indoorCentersData.indoorCentersResource.reload();

        this.toast.success(
          this.translate.instant('merchandising.items.saveSuccess'),
        );

        if (this._dialogCtx) {
          this._dialogCtx.completeWith(true);
        }
      } catch (e) {
        const error = e as Error;
        console.error('[IndoorCenterFormComponent] Error submitting:', e);
        handleErrorToast(error, this.toast);
      } finally {
        this.isSaving.set(false);
        this.isUploading.set(false);
      }
    });
  }

  goBack(): void {
    if (this._dialogCtx) {
      this._dialogCtx.$implicit.complete();
    } else {
      this.location.back();
    }
  }

  onCoordinatesChange({ latitude, longitude }: CoordinatesValue): void {
    this.model.update((m) => ({ ...m, latitude, longitude }));
  }

  onDescriptionChange(value: string): void {
    this.model.update((m) => ({ ...m, description: value }));
  }

  onWarningChange(value: string): void {
    this.model.update((m) => ({ ...m, warning: value }));
  }
}
