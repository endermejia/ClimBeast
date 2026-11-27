import { Component, inject, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  TuiButton,
  TuiLabel,
  TuiNumberFormat,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiInputNumber } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { MapService } from '../../services/map.service';

export interface CoordinatesValue {
  latitude: number | null;
  longitude: number | null;
}

@Component({
  selector: 'app-coordinates-fields',
  imports: [
    FormsModule,
    TranslatePipe,
    TuiButton,
    TuiInputNumber,
    TuiLabel,
    TuiNumberFormat,
    TuiTextfield,
  ],
  template: `
    <div class="flex flex-wrap items-center gap-4">
      <h3 class="font-bold text-lg">{{ 'location' | translate }}</h3>
      <button
        tuiButton
        appearance="secondary-grayscale"
        size="s"
        type="button"
        iconStart="@tui.map-pin"
        (click.zoneless)="pickLocation()"
      >
        {{ 'pickOnMap' | translate }}
      </button>
    </div>

    <div [class]="rowClass()">
      <div class="grid grid-cols-2 gap-4">
        <tui-textfield [tuiTextfieldCleaner]="false">
          <label tuiLabel [for]="latId()">{{ 'lat' | translate }}</label>
          <input
            tuiInputNumber
            [id]="latId()"
            [ngModel]="latitude()"
            (ngModelChange)="onLatitudeChange($event)"
            [ngModelOptions]="{ standalone: true }"
            name="latitude"
            [tuiNumberFormat]="{ precision: 6 }"
            (paste)="onPasteLocation($event)"
            (blur.zoneless)="sanitizeCoordinates()"
            (change.zoneless)="sanitizeCoordinates()"
            autocomplete="off"
          />
        </tui-textfield>
        <tui-textfield [tuiTextfieldCleaner]="false">
          <label tuiLabel [for]="lngId()">{{ 'lng' | translate }}</label>
          <input
            tuiInputNumber
            [id]="lngId()"
            [ngModel]="longitude()"
            (ngModelChange)="onLongitudeChange($event)"
            [ngModelOptions]="{ standalone: true }"
            name="longitude"
            [tuiNumberFormat]="{ precision: 6 }"
            (paste)="onPasteLocation($event)"
            (blur.zoneless)="sanitizeCoordinates()"
            (change.zoneless)="sanitizeCoordinates()"
            autocomplete="off"
          />
        </tui-textfield>
      </div>

      <ng-content />
    </div>
  `,
  host: { class: 'grid gap-4' },
})
export class CoordinatesFieldsComponent {
  private readonly mapService = inject(MapService);

  readonly latitude = model<number | null>(null);
  readonly longitude = model<number | null>(null);
  readonly latId = input<string>('lat');
  readonly lngId = input<string>('lng');
  readonly rowClass = input<string>('');
  readonly coordinatesChange = output<CoordinatesValue>();

  onLatitudeChange(value: number | null): void {
    this.latitude.set(value);
    this.coordinatesChange.emit({
      latitude: value,
      longitude: this.longitude(),
    });
  }

  onLongitudeChange(value: number | null): void {
    this.longitude.set(value);
    this.coordinatesChange.emit({
      latitude: this.latitude(),
      longitude: value,
    });
  }

  async pickLocation(): Promise<void> {
    const result = await firstValueFrom(
      this.mapService.pickLocation(this.latitude(), this.longitude()),
      { defaultValue: null },
    );
    if (result) {
      this.latitude.set(result.lat);
      this.longitude.set(result.lng);
      this.coordinatesChange.emit({
        latitude: result.lat,
        longitude: result.lng,
      });
    }
  }

  onPasteLocation(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text');
    if (!text) return;

    const coords = this.mapService.parseCoordinates(text);
    if (coords) {
      event.preventDefault();
      this.latitude.set(coords.lat);
      this.longitude.set(coords.lng);
      this.coordinatesChange.emit({
        latitude: coords.lat,
        longitude: coords.lng,
      });
    }
  }

  sanitizeCoordinates(): void {
    const lat = this.latitude();
    const lng = this.longitude();
    const sanitizedLat =
      lat != null && !Number.isNaN(lat) ? parseFloat(lat.toFixed(6)) : null;
    const sanitizedLng =
      lng != null && !Number.isNaN(lng) ? parseFloat(lng.toFixed(6)) : null;
    if (sanitizedLat !== lat || sanitizedLng !== lng) {
      this.latitude.set(sanitizedLat);
      this.longitude.set(sanitizedLng);
      this.coordinatesChange.emit({
        latitude: sanitizedLat,
        longitude: sanitizedLng,
      });
    }
  }
}
