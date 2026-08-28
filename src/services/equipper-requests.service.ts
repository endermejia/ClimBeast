import { inject, Injectable, signal } from '@angular/core';

import { EquipperRequestDto, EquipperRequestWithDetails } from '../models';

import { SupabaseService } from './supabase.service';

import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class EquipperRequestsService {
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);

  readonly pendingCount = signal<number>(0);

  private get client() {
    return this.supabase.client;
  }

  /** Solicitar vinculación como equipador */
  async requestEquipper(equipperId: number): Promise<boolean> {
    const userId = this.supabase.authUser()?.id;
    if (!userId) return false;

    const { error } = await this.client
      .from('equipper_requests')
      .insert({ user_id: userId, equipper_id: equipperId });

    if (error) {
      if (error.code === '23505') {
        this.toast.error('equipperRequest.alreadyRequested');
      } else {
        this.toast.error('errors.unexpected');
      }
      return false;
    }

    this.toast.success('equipperRequest.success');
    return true;
  }

  /** Cancelar solicitud pendiente propia */
  async cancelRequest(equipperId: number): Promise<boolean> {
    const userId = this.supabase.authUser()?.id;
    if (!userId) return false;

    const { error } = await this.client
      .from('equipper_requests')
      .delete()
      .eq('user_id', userId)
      .eq('equipper_id', equipperId)
      .eq('status', 'pending');

    if (error) {
      this.toast.error('errors.unexpected');
      return false;
    }

    this.toast.success('equipperRequest.cancelled');
    return true;
  }

  /** Consultar solicitud del usuario actual para un equipador */
  async getMyRequestForEquipper(
    equipperId: number,
  ): Promise<EquipperRequestDto | null> {
    const userId = this.supabase.authUser()?.id;
    if (!userId) return null;

    const { data } = await this.client
      .from('equipper_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('equipper_id', equipperId)
      .eq('status', 'pending')
      .maybeSingle();

    return data as EquipperRequestDto | null;
  }

  /** Obtener todas las solicitudes pendientes para el panel admin */
  async getAllPendingRequests(): Promise<EquipperRequestWithDetails[]> {
    await this.supabase.whenReady();

    const { data, error } = await this.client
      .from('equipper_requests')
      .select(
        `
        id,
        user_id,
        equipper_id,
        status,
        created_at,
        user:user_profiles!user_id(id, name, avatar),
        equipper:equippers!equipper_id(id, name, description)
      `,
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(
        '[EquipperRequestsService] Error fetching requests:',
        error,
      );
      return [];
    }

    const list = (data || []) as unknown as EquipperRequestWithDetails[];
    this.pendingCount.set(list.length);
    return list;
  }

  /** Aprobar solicitud: asigna user_id al equipador y elimina la solicitud */
  async approveRequest(
    requestId: number,
    equipperId: number,
    userId: string,
  ): Promise<boolean> {
    await this.supabase.whenReady();

    // 1. Asignar el propietario al equipador
    const { error: updateError } = await this.client
      .from('equippers')
      .update({ user_id: userId })
      .eq('id', equipperId);

    if (updateError) {
      this.toast.error('errors.unexpected');
      return false;
    }

    // 2. Eliminar la solicitud aprobada
    await this.client.from('equipper_requests').delete().eq('id', requestId);

    this.pendingCount.update((c) => Math.max(0, c - 1));
    this.toast.success('adminEquipperRequests.approveSuccess');
    return true;
  }

  /** Rechazar solicitud: borra la solicitud pendiente */
  async rejectRequest(requestId: number): Promise<boolean> {
    await this.supabase.whenReady();

    const { error } = await this.client
      .from('equipper_requests')
      .delete()
      .eq('id', requestId);

    if (error) {
      this.toast.error('errors.unexpected');
      return false;
    }

    this.pendingCount.update((c) => Math.max(0, c - 1));
    this.toast.success('adminEquipperRequests.rejectSuccess');
    return true;
  }
}
