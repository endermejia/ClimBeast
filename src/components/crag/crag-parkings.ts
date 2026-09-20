import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Router } from '@angular/router';

import { TuiDialogService, TuiButton } from '@taiga-ui/core';
import { TuiAvatar, TUI_CONFIRM, type TuiConfirmData } from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { AuthStateService } from '../../services/auth-state.service';
import { MapDataService } from '../../services/map-data.service';

import { OutdoorDataService } from '../../services/outdoor-data.service';
import { ParkingsService } from '../../services/parkings.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

import { CragDetail, ParkingDto } from '../../models';

import { handleErrorToast } from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

import { ParkingCardComponent } from '../location/parking-card';

import { EmptyStateComponent } from '../ui/empty-state';
import { UbicacionDropdownComponent } from '../ui/ubicacion-dropdown';

@Component({
  selector: 'app-crag-parkings',
  imports: [
    EmptyStateComponent,
    ParkingCardComponent,
    TranslatePipe,
    TuiAvatar,
    TuiButton,
    UbicacionDropdownComponent,
  ],
  template: `
    <div class="flex items-center justify-between gap-2 mb-4">
      <div class="flex items-center w-full sm:w-auto gap-2">
        <span
          tuiAvatar="@tui.parking-square"
          tuiThumbnail
          size="l"
          class="self-center"
          [attr.aria-label]="'parkings' | translate"
        ></span>
        <h2 class="text-2xl font-semibold">
          {{ 'parkings' | translate }}
        </h2>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      @for (p of parkings(); track p.id) {
        <app-parking-card [parking]="p">
          <ng-container titleActions>
            @if (canEditAsAdmin() || canAreaAdmin()) {
              <button
                size="s"
                appearance="neutral"
                iconStart="@tui.square-pen"
                tuiIconButton
                type="button"
                class="rounded-full!"
                (click.zoneless)="openEditParking(p)"
              >
                {{ 'edit' | translate }}
              </button>
              @if (crag()) {
                <button
                  size="s"
                  appearance="negative"
                  iconStart="@tui.unlink"
                  tuiIconButton
                  type="button"
                  class="rounded-full!"
                  (click.zoneless)="removeParking(p)"
                >
                  {{ 'remove' | translate }}
                </button>
              }
            }
          </ng-container>

          <ng-container actions>
            @if (p.latitude && p.longitude) {
              <app-ubicacion-dropdown
                [latitude]="p.latitude"
                [longitude]="p.longitude"
                (viewOnMap)="viewOnMap(p.latitude, p.longitude)"
              />
            }
          </ng-container>
        </app-parking-card>
      } @empty {
        <div class="col-span-full">
          <app-empty-state icon="@tui.car" />
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CragParkingsComponent {
  crag = input<CragDetail | null>(null);
  parkingsInput = input<ParkingDto[] | null>(null, { alias: 'parkings' });

  protected readonly outdoorData = inject(OutdoorDataService);
  protected readonly authState = inject(AuthStateService);
  protected readonly mapData = inject(MapDataService);
  protected readonly parkingsService = inject(ParkingsService);
  protected readonly supabase = inject(SupabaseService);
  protected readonly translate = inject(TranslateService);
  protected readonly dialogs = inject(TuiDialogService);
  protected readonly toast = inject(ToastService);
  private readonly isBrowser = inject(IS_BROWSER);
  protected readonly router = inject(Router);

  protected readonly parkings = computed(
    () => this.parkingsInput() ?? this.crag()?.parkings ?? [],
  );

  readonly canEditAsAdmin = this.authState.canEditAsAdmin;
  readonly canAreaAdmin = computed(() => {
    const c = this.crag();
    if (c) {
      return this.authState.areaAdminPermissions()[c.area_id];
    }
    const area = this.outdoorData.selectedArea();
    if (area) {
      return this.authState.areaAdminPermissions()[area.id];
    }
    return false;
  });

  openEditParking(parking: ParkingDto): void {
    this.parkingsService.openParkingForm({
      parkingData: parking,
      cragId: this.crag()?.id,
    });
  }

  removeParking(parking: ParkingDto): void {
    const c = this.crag();
    if (!c || !this.isBrowser) return;

    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('admin.parkings.unlinkTitle'),
        size: 's',
        data: {
          content: this.translate.instant('admin.parkings.unlinkConfirm', {
            name: parking.name,
          }),
          yes: this.translate.instant('unlink'),
          no: this.translate.instant('cancel'),
          appearance: 'accent',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then((confirmed) => {
      if (confirmed) {
        this.parkingsService
          .removeParkingFromCrag(c.id, parking.id)
          .catch((err) => handleErrorToast(err, this.toast));
      }
    });
  }

  async viewOnMap(lat: number, lng: number): Promise<void> {
    const area = this.outdoorData.selectedArea();
    let minLat = lat;
    let maxLat = lat;
    let minLng = lng;
    let maxLng = lng;

    if (area) {
      await this.supabase.whenReady();
      const { data } = await this.supabase.client
        .from('crags')
        .select('latitude, longitude')
        .eq('area_id', area.id)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (data) {
        data.forEach((c) => {
          if (c.latitude! < minLat) minLat = c.latitude!;
          if (c.latitude! > maxLat) maxLat = c.latitude!;
          if (c.longitude! < minLng) minLng = c.longitude!;
          if (c.longitude! > maxLng) maxLng = c.longitude!;
        });
      }
    }

    this.mapData.mapBounds.set({
      south_west_latitude: minLat,
      south_west_longitude: minLng,
      north_east_latitude: maxLat,
      north_east_longitude: maxLng,
    });
    void this.router.navigateByUrl('/explore');
  }
}
