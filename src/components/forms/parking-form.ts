import { Location } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  Signal,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  form,
  FormField,
  max,
  min,
  required,
  submit,
} from '@angular/forms/signals';

import { type TuiDialogContext } from '@taiga-ui/core';
import {
  TuiButton,
  TuiError,
  TuiInput,
  TuiLabel,
  TuiScrollbar,
} from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { ParkingsService } from '../../services/parkings.service';
import { ToastService } from '../../services/toast.service';

import { ParkingDto } from '../../models';

import { handleErrorToast } from '../../utils';

import {
  CoordinatesFieldsComponent,
  CoordinatesValue,
} from '../location/coordinates-fields';
import { CounterComponent } from '../ui/counter';

interface MinimalParking {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  size: number;
}

@Component({
  selector: 'app-parking-form',
  imports: [
    CoordinatesFieldsComponent,
    CounterComponent,
    FormField,
    FormsModule,
    TranslatePipe,
    TuiButton,
    TuiError,
    TuiInput,
    TuiLabel,
    TuiScrollbar,
  ],
  template: `
    <form class="lw-form-sheet" (submit.zoneless)="onSubmit($event)">
      <tui-scrollbar class="lw-form-sheet-body">
        <div class="flex flex-col gap-4">
          <tui-textfield [tuiTextfieldCleaner]="false">
            <label tuiLabel for="parking-name">{{ 'name' | translate }}</label>
            <input
              tuiInput
              id="parking-name"
              [formField]="parkingForm.name"
              type="text"
              autocomplete="off"
            />
          </tui-textfield>
          @if (parkingForm.name().invalid() && parkingForm.name().touched()) {
            <tui-error [error]="'errors.required' | translate" />
          }

          <app-coordinates-fields
            [latitude]="model().latitude"
            [longitude]="model().longitude"
            (coordinatesChange)="onCoordinatesChange($event)"
            rowClass="grid grid-cols-1 md:grid-cols-2 gap-4 items-end"
          >
            <app-counter
              [ngModel]="model().size"
              (ngModelChange)="onSizeChange($event)"
              name="size"
              label="capacity"
            />
          </app-coordinates-fields>
        </div>
      </tui-scrollbar>

      <div class="lw-form-sheet-footer">
        <button
          tuiButton
          size="m"
          appearance="flat"
          type="button"
          (click.zoneless)="goBack()"
        >
          {{ 'cancel' | translate }}
        </button>
        <button
          [disabled]="
            parkingForm.name().invalid() ||
            !model().latitude ||
            !model().longitude ||
            (!parkingForm.name().dirty() && !isEdit())
          "
          tuiButton
          size="m"
          appearance="primary"
          type="submit"
        >
          {{ (isEdit() ? 'save' : 'create') | translate }}
        </button>
      </div>
    </form>
  `,
  host: { class: 'flex grow min-h-0' },
})
export class ParkingFormComponent {
  private readonly parkings = inject(ParkingsService);
  private readonly location = inject(Location);
  private readonly toast = inject(ToastService);
  private readonly _dialogCtx: TuiDialogContext<
    ParkingDto | boolean | null,
    {
      cragId?: number;
      parkingData?: MinimalParking;
      defaultLocation?: { lat: number; lng: number };
    }
  > | null = (() => {
    try {
      return injectContext<
        TuiDialogContext<
          ParkingDto | boolean | null,
          {
            cragId?: number;
            parkingData?: MinimalParking;
            defaultLocation?: { lat: number; lng: number };
          }
        >
      >();
    } catch {
      return null;
    }
  })();

  // Alternative inputs for embedded use
  cragId: InputSignal<number | undefined> = input<number | undefined>(
    undefined,
  );
  parkingData: InputSignal<MinimalParking | undefined> = input<
    MinimalParking | undefined
  >(undefined);
  defaultLocation: InputSignal<{ lat: number; lng: number } | undefined> =
    input<{ lat: number; lng: number } | undefined>(undefined);

  private readonly dialogCragId = this._dialogCtx?.data?.cragId;
  private readonly dialogParkingData = this._dialogCtx?.data?.parkingData;
  private readonly dialogDefaultLocation =
    this._dialogCtx?.data?.defaultLocation;

  private readonly effectiveCragId: Signal<number | undefined> = computed(
    () => this.dialogCragId ?? this.cragId(),
  );
  private readonly effectiveParkingData: Signal<MinimalParking | undefined> =
    computed(() => this.dialogParkingData ?? this.parkingData());
  private readonly effectiveDefaultLocation: Signal<
    { lat: number; lng: number } | undefined
  > = computed(() => this.dialogDefaultLocation ?? this.defaultLocation());

  readonly isEdit: Signal<boolean> = computed(
    () => !!this.effectiveParkingData(),
  );

  model = signal<{
    name: string;
    latitude: number | null;
    longitude: number | null;
    size: number;
  }>({
    name: '',
    latitude: null,
    longitude: null,
    size: 0,
  });

  parkingForm = form(this.model, (path) => {
    required(path.name);
    required(path.latitude);
    min(path.latitude, -90);
    max(path.latitude, 90);
    required(path.longitude);
    min(path.longitude, -180);
    max(path.longitude, 180);
    min(path.size, 0);
  });

  private editingId: number | null = null;

  constructor() {
    effect(() => {
      const data = this.effectiveParkingData();
      if (data) {
        untracked(() => {
          this.editingId = data.id;
          this.model.set({
            name: data.name ?? '',
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
            size: data.size ?? 0,
          });
        });
      } else {
        const def = this.effectiveDefaultLocation();
        if (def) {
          untracked(() => {
            this.model.update((m) => ({
              ...m,
              latitude: def.lat,
              longitude: def.lng,
            }));
          });
        }
      }
    });
  }

  async onSubmit(event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();

    submit(this.parkingForm, async () => {
      const { name, latitude, longitude, size } = this.model();
      const payload = {
        name,
        latitude: latitude!,
        longitude: longitude!,
        size,
      };

      try {
        let result: ParkingDto | null;
        if (this.isEdit() && this.editingId != null) {
          result = await this.parkings.update(this.editingId, payload);
        } else {
          result = await this.parkings.create(payload);
          const cragId = this.effectiveCragId();
          if (result && cragId) {
            await this.parkings.addParkingToCrag(cragId, result.id);
          }
        }

        if (this._dialogCtx) {
          this._dialogCtx.completeWith(result || true);
        } else {
          this.goBack();
        }
      } catch (error) {
        console.error(
          '[ParkingFormComponent] Error submitting parking:',
          error,
        );
        handleErrorToast(error, this.toast);
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

  onSizeChange(value: number | null): void {
    this.model.update((m) => ({ ...m, size: value ?? 0 }));
  }
}

export default ParkingFormComponent;
