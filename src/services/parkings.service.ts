import { inject, Injectable } from '@angular/core';

import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import LinkParkingFormComponent from '../components/forms/link-parking-form';

import ParkingFormComponent from '../components/forms/parking-form';

import type { ParkingDto, ParkingInsertDto, ParkingUpdateDto } from '../models';

import { mapLocationUrl } from '../utils';

import { IS_BROWSER } from '../app/is-browser';

import { AdminParkingsService } from './admin-parkings.service';
import { OutdoorDataService } from './outdoor-data.service';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class ParkingsService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly supabase = inject(SupabaseService);
  private readonly outdoorData = inject(OutdoorDataService);
  private readonly adminParkings = inject(AdminParkingsService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  openParkingForm(
    data: {
      cragId?: number;
      parkingData?: ParkingDto;
      defaultLocation?: { lat: number; lng: number };
    } = {},
  ): void {
    const isEdit = !!data.parkingData;
    void firstValueFrom(
      this.dialogs.open<boolean>(
        new PolymorpheusComponent(ParkingFormComponent),
        {
          label: this.translate.instant(isEdit ? 'edit' : 'new'),
          size: 'l',
          data,
          dismissible: false,
        },
      ),
      { defaultValue: false },
    ).then((result) => {
      if (result) {
        if (data.cragId) {
          this.outdoorData.cragDetailResource.reload();
        }
        this.adminParkings.adminParkingsResource.reload();
      }
    });
  }

  openLinkParkingForm(data: {
    cragId: number;
    existingParkingIds: number[];
  }): void {
    void firstValueFrom(
      this.dialogs.open<boolean>(
        new PolymorpheusComponent(LinkParkingFormComponent),
        {
          label: this.translate.instant('link'),
          size: 'm',
          data,
          dismissible: false,
        },
      ),
      { defaultValue: false },
    ).then((result) => {
      if (result) {
        this.outdoorData.cragDetailResource.reload();
      }
    });
  }

  async getAll(): Promise<ParkingDto[]> {
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('parkings')
      .select('*')
      .order('name');
    if (error) {
      console.error('[ParkingsService] getAll error', error);
      return [];
    }
    return data || [];
  }

  async create(
    payload: Omit<ParkingInsertDto, 'id' | 'created_at'>,
  ): Promise<ParkingDto | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('parkings')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      console.error('[ParkingsService] create error', error);
      throw error;
    }
    this.toast.success('messages.toasts.parkingCreated');
    return data;
  }

  async update(
    id: number,
    payload: Partial<Omit<ParkingUpdateDto, 'id' | 'created_at'>>,
  ): Promise<ParkingDto | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('parkings')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('[ParkingsService] update error', error);
      throw error;
    }
    this.toast.success('messages.toasts.parkingUpdated');
    return data;
  }

  async delete(id: number): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();
    const { error } = await this.supabase.client
      .from('parkings')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[ParkingsService] delete error', error);
      throw error;
    }
    this.toast.success('messages.toasts.parkingDeleted');
    this.adminParkings.adminParkingsResource.reload();
    this.outdoorData.cragDetailResource.reload();
    return true;
  }

  async addParkingToCrag(cragId: number, parkingId: number): Promise<void> {
    if (!this.isBrowser) return;
    await this.supabase.whenReady();
    const { error } = await this.supabase.client
      .from('crag_parkings')
      .insert({ crag_id: cragId, parking_id: parkingId });
    if (error) {
      console.error('[ParkingsService] addParkingToCrag error', error);
      throw error;
    }
    this.outdoorData.cragDetailResource.reload();
    this.toast.success('messages.toasts.parkingLinked');
  }

  async removeParkingFromCrag(
    cragId: number,
    parkingId: number,
  ): Promise<void> {
    if (!this.isBrowser) return;
    await this.supabase.whenReady();
    const { error } = await this.supabase.client
      .from('crag_parkings')
      .delete()
      .match({ crag_id: cragId, parking_id: parkingId });
    if (error) {
      console.error('[ParkingsService] removeParkingFromCrag error', error);
      throw error;
    }
    this.outdoorData.cragDetailResource.reload();
    this.toast.success('messages.toasts.parkingUnlinked');
  }

  openMaps(parking: ParkingDto, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const url = mapLocationUrl({
      latitude: parking.latitude,
      longitude: parking.longitude,
    });
    this.openExternal(url);
  }

  openExternal(url: string): void {
    if (this.isBrowser) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
}
