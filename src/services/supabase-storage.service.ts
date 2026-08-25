import { inject, Injectable } from '@angular/core';

import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseNotInitializedError } from '../models';
import { Database } from '../models/supabase-generated';

import { ENV_SUPABASE_URL } from '../environments/environment';
import { SignedUrlCache } from './signed-url-cache';
import { SUPABASE_URL } from './supabase-config.service';

@Injectable({ providedIn: 'root' })
export class SupabaseStorageService {
  private readonly url = inject(SUPABASE_URL, { optional: true });
  private readonly signedUrlCache = inject(SignedUrlCache);

  /** Helper to get client from caller or throw */
  private getClient(
    client: SupabaseClient<Database> | null,
  ): SupabaseClient<Database> {
    if (!client) {
      throw new SupabaseNotInitializedError();
    }
    return client;
  }

  buildAvatarUrl(path?: string | null): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    const base = (this.url || ENV_SUPABASE_URL || '').replace(/\/$/, '');
    return `${base}/storage/v1/object/public/avatar/${path}`;
  }

  getPublicUrl(bucket: string, path: string | null | undefined): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const base = (this.url || ENV_SUPABASE_URL || '').replace(/\/$/, '');
    const rel = String(path).replace(/^\//, '');
    return `${base}/storage/v1/object/public/${bucket}/${rel}`;
  }

  async getTopoSignedUrl(
    client: SupabaseClient<Database> | null,
    whenReady: () => Promise<void>,
    path: string | null | undefined,
    version?: number,
  ): Promise<string> {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    const cacheKey = SignedUrlCache.key(
      'topo-url',
      path,
      version ? String(version) : undefined,
    );
    const lastValidKey = SignedUrlCache.key('topo-last-valid', path);

    const cached = this.signedUrlCache.get(cacheKey);
    if (cached) return cached.url;

    await whenReady();
    const activeClient = this.getClient(client);

    const { data, error } = await activeClient.storage
      .from('topos')
      .createSignedUrl(path, 31536000); // 1 year

    if (error) {
      console.warn(
        '[SupabaseStorageService] getTopoSignedUrl error, trying fallback',
        error,
      );
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      const lastValid = this.signedUrlCache.get(lastValidKey);
      if (lastValid) {
        if (isOffline || Date.now() < lastValid.expiresAt) {
          return lastValid.url;
        }
      }
      return '';
    }

    let finalUrl = data.signedUrl;
    if (version) {
      try {
        const u = new URL(finalUrl);
        u.searchParams.set('v', version.toString());
        finalUrl = u.toString();
      } catch (e: unknown) {
        console.warn(
          '[SupabaseStorageService] Invalid URL when setting version:',
          e,
        );
      }
    }

    const expiresAt = Date.now() + 31536000 * 1000 - 86400000;
    const entry = { url: finalUrl, expiresAt };
    this.signedUrlCache.set(cacheKey, entry);
    this.signedUrlCache.set(lastValidKey, entry);

    return finalUrl;
  }

  async getAscentSignedUrl(
    client: SupabaseClient<Database> | null,
    whenReady: () => Promise<void>,
    path: string | null | undefined,
    options?: {
      transform?: {
        width?: number;
        height?: number;
        resize?: 'cover' | 'contain' | 'fill';
        quality?: number;
        format?: 'origin';
      };
    },
  ): Promise<string> {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    const cacheKey = SignedUrlCache.key(
      'ascent-url',
      path,
      options ? JSON.stringify(options) : undefined,
    );
    const cached = this.signedUrlCache.get(cacheKey);
    if (cached) return cached.url;

    await whenReady();
    const activeClient = this.getClient(client);

    const bucket =
      path.startsWith('ascents/') || path.startsWith('centers/')
        ? 'indoor-assets'
        : 'route-ascent-photos';
    const { data, error } = await activeClient.storage
      .from(bucket)
      .createSignedUrl(path, 3600, options); // 1 hour

    if (error) {
      console.warn('[SupabaseStorageService] getAscentSignedUrl error', error);
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      if (isOffline) {
        const cached = this.signedUrlCache.get(cacheKey);
        if (cached) {
          return cached.url;
        }
      }
      return '';
    }

    const expiresAt = Date.now() + 3600 * 1000 - 300000;
    this.signedUrlCache.set(cacheKey, { url: data.signedUrl, expiresAt });

    return data.signedUrl;
  }

  async uploadAvatar(
    client: SupabaseClient<Database> | null,
    file: File,
  ): Promise<{ path: string; publicUrl: string } | null> {
    const activeClient = this.getClient(client);
    const base64 = await this.fileToBase64(file);
    const payload = {
      file_name: file.name,
      content_type: file.type,
      base64: base64,
    };

    const response = await activeClient.functions.invoke('upload-avatar', {
      body: payload,
      headers: {
        'ngsw-bypass': 'true',
      },
    });

    if (response.error) {
      console.error(
        '[SupabaseStorageService] uploadAvatar error',
        response.error,
      );
      throw response.error;
    }

    return response.data;
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
