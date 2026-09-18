import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

import { TuiButton, TuiDialogService } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';
import { filter, firstValueFrom, switchMap } from 'rxjs';

import { WeatherService } from '../../services/weather.service';

import { WeatherForecastComponent } from '../../components/ui/weather-forecast';

@Component({
  selector: 'app-meteo-button',
  imports: [DecimalPipe, TuiButton, TranslatePipe, WeatherForecastComponent],
  template: `
    @if (todayWeather(); as today) {
      <button
        appearance="flat-grayscale"
        size="m"
        tuiButton
        type="button"
        [iconStart]="today.icon"
        (click.zoneless)="openDialog()"
        [attr.aria-label]="'weather.title' | translate"
      >
        {{ today.minTemp | number: '1.0-0' }}° /
        {{ today.maxTemp | number: '1.0-0' }}°
      </button>
    }
    <ng-template #dialogTpl>
      @if (coords(); as c) {
        <app-weather-forecast [coords]="c" />
      }
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeteoButtonComponent {
  private readonly dialogs = inject(TuiDialogService);
  private readonly weatherService = inject(WeatherService);

  latitude = input<number>();
  longitude = input<number>();

  @ViewChild('dialogTpl') private readonly dialogTpl!: TemplateRef<unknown>;

  protected readonly coords = computed(() => {
    const lat = this.latitude();
    const lng = this.longitude();
    if (lat == null || lng == null) return null;
    return { lat, lng };
  });

  protected readonly weatherForecast = toSignal(
    toObservable(this.coords).pipe(
      filter((c): c is { lat: number; lng: number } => !!c),
      switchMap((c) => this.weatherService.getForecast(c.lat, c.lng)),
    ),
  );

  protected readonly todayWeather = computed(() => {
    const days = this.weatherForecast();
    return days?.[0];
  });

  protected openDialog(): void {
    void firstValueFrom(this.dialogs.open(this.dialogTpl, { size: 'l' }), {
      defaultValue: undefined,
    });
  }
}
