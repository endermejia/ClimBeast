import { inject, Injectable } from '@angular/core';

import { RouteAscentWithExtras } from '../models';

import { extractPhotoMetadata, PhotoMetadata } from '../utils';

import { IS_BROWSER } from '../app/is-browser';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AscentMediaService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly supabase = inject(SupabaseService);

  private readonly backfilledAscentKeys = new Set<string>();

  buildPhotoHeaders(
    ascentId: number | string,
    isIndoor = false,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'ascent-id': ascentId.toString(),
      'ngsw-bypass': 'true',
    };
    if (isIndoor || typeof ascentId === 'string') {
      headers['is-indoor'] = 'true';
    }
    return headers;
  }

  async uploadPhoto(
    ascentId: number | string,
    file: File,
    isIndoor = false,
  ): Promise<Partial<RouteAscentWithExtras> | null> {
    if (!this.isBrowser) return null;

    try {
      const [base64, metadata] = await Promise.all([
        this.fileToBase64(file),
        extractPhotoMetadata(file),
      ]);
      await this.supabase.whenReady();

      const headers = this.buildPhotoHeaders(ascentId, isIndoor);
      const { data: uploadRes, error } =
        await this.supabase.client.functions.invoke<{
          path?: string;
          photo_width?: number | null;
          photo_height?: number | null;
          photo_lqip?: string | null;
        }>('upload-route-ascent-photo', {
          body: {
            file_name: file.name,
            content_type: file.type,
            base64,
            width: metadata?.width,
            height: metadata?.height,
            lqip: metadata?.lqip,
          },
          headers,
        });

      if (error) throw error;

      return {
        ...(uploadRes?.path ? { photo_path: uploadRes.path } : {}),
        photo_width: uploadRes?.photo_width ?? metadata?.width ?? null,
        photo_height: uploadRes?.photo_height ?? metadata?.height ?? null,
        photo_lqip: uploadRes?.photo_lqip ?? metadata?.lqip ?? null,
      };
    } catch (e) {
      console.error('[AscentMediaService] uploadPhoto error', e);
      throw e;
    }
  }

  async deletePhoto(
    ascentId: number | string,
    isIndoor = false,
  ): Promise<Partial<RouteAscentWithExtras> | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();

    const headers = this.buildPhotoHeaders(ascentId, isIndoor);
    const { error } = await this.supabase.client.functions.invoke(
      'delete-route-ascent-photo',
      {
        headers,
      },
    );

    if (error) {
      console.error('[AscentMediaService] deletePhoto error', error);
      throw error;
    }

    return {
      photo_path: null,
      photo_width: null,
      photo_height: null,
      photo_lqip: null,
    };
  }

  async backfillPhotoMetadata(
    ascentId: number | string,
    isIndoor: boolean,
    signedUrl: string,
  ): Promise<PhotoMetadata | null> {
    if (!this.isBrowser || !ascentId || !signedUrl) return null;

    const key = `${isIndoor ? 'indoor' : 'outdoor'}-${ascentId}`;
    if (this.backfilledAscentKeys.has(key)) return null;
    this.backfilledAscentKeys.add(key);

    try {
      const response = await fetch(signedUrl);
      if (!response.ok) return null;
      const blob = await response.blob();
      const meta = await extractPhotoMetadata(blob);
      if (!meta || !meta.width || !meta.height) return null;

      await this.supabase.whenReady();
      await this.supabase.client.rpc('backfill_ascent_photo_metadata', {
        p_ascent_id: String(ascentId),
        p_is_indoor: isIndoor,
        p_width: meta.width,
        p_height: meta.height,
        p_lqip: meta.lqip || '',
      });

      return meta;
    } catch {
      return null;
    }
  }

  async deleteOrphanedPhoto(
    ascentId: number | string,
    photoPath: string,
    isIndoor = false,
  ): Promise<void> {
    if (!this.isBrowser || !photoPath) return;
    try {
      await this.supabase.whenReady();
      const headers = this.buildPhotoHeaders(ascentId, isIndoor);
      await this.supabase.client.functions.invoke('delete-route-ascent-photo', {
        body: { photo_path: photoPath },
        headers,
      });
    } catch (e) {
      console.warn('[AscentMediaService] deleteOrphanedPhoto error', e);
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }
}
