import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { TuiButton, TuiDataList, TuiDropdown, TuiIcon } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { IS_BROWSER } from '../../app/is-browser';

import { mapLocationUrl } from '../../utils';

@Component({
  selector: 'app-ubicacion-dropdown',
  imports: [TuiButton, TuiDataList, TuiDropdown, TuiIcon, TranslatePipe],
  template: `
    <button
      tuiButton
      appearance="flat"
      size="m"
      type="button"
      iconStart="@tui.map-pin"
      [tuiDropdown]="menu"
      [(tuiDropdownOpen)]="dropdownOpen"
    >
      {{ 'location' | translate }}
    </button>
    <ng-template #menu>
      <tui-data-list>
        <button tuiOption type="button" (click)="onViewOnMap()">
          <tui-icon icon="@tui.map-pin" class="mr-2" />
          {{ 'viewOnMap' | translate }}
        </button>
        @if (hasCoords()) {
          <button tuiOption type="button" (click)="onOpenGoogleMaps()">
            <tui-icon
              icon="/image/google-maps.svg"
              class="mr-2 [--tui-icon-size:1.25rem]"
            />
            Google Maps
          </button>
        }
      </tui-data-list>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UbicacionDropdownComponent {
  latitude = input<number>();
  longitude = input<number>();

  viewOnMap = output<void>();

  protected readonly isBrowser = inject(IS_BROWSER);
  protected readonly dropdownOpen = signal(false);
  protected readonly hasCoords = computed(
    () => this.latitude() != null && this.longitude() != null,
  );

  protected onViewOnMap(): void {
    this.dropdownOpen.set(false);
    this.viewOnMap.emit();
  }

  protected onOpenGoogleMaps(): void {
    this.dropdownOpen.set(false);
    if (this.isBrowser) {
      const url = mapLocationUrl({
        latitude: this.latitude()!,
        longitude: this.longitude()!,
      });
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
}
