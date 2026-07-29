import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  inject,
  Injectable,
  InjectionToken,
  PLATFORM_ID,
  Provider,
  resource,
  signal,
  WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';

import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { UserProfileDto } from '../models';
import { SupabaseNotInitializedError } from '../models';
import { Database } from '../models/supabase-generated';

import { CACHE_KEYS } from '../constants/cache-keys';

import { ENV_SUPABASE_URL } from '../environments/environment';
import { CacheService } from './cache.service';
import { LocalStorage } from './local-storage';
import { SignedUrlCache } from './signed-url-cache';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export const SUPABASE_URL = new InjectionToken<string>('SUPABASE_URL');
export const SUPABASE_ANON_KEY = new InjectionToken<string>(
  'SUPABASE_ANON_KEY',
);

export function provideSupabaseConfig(config: SupabaseConfig): Provider[] {
  return [
    { provide: SUPABASE_URL, useValue: config.url },
    { provide: SUPABASE_ANON_KEY, useValue: config.anonKey },
  ];
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly url = inject(SUPABASE_URL, { optional: true });
  private readonly anonKey = inject(SUPABASE_ANON_KEY, { optional: true });
  private readonly router = inject(Router);
  private readonly localStorage = inject(LocalStorage);
  private readonly cache = inject(CacheService);
  private readonly signedUrlCache = inject(SignedUrlCache);

  private _client: SupabaseClient<Database> | null = null;
  private _readyResolve: (() => void) | null = null;
  private readonly _ready: Promise<void>;

  // Auth state
  private readonly _session: WritableSignal<Session | null> =
    signal<Session | null>(null);
  private readonly _lastEvent: WritableSignal<string | null> = signal<
    string | null
  >(null);
  readonly session = computed(() => this._session());
  readonly lastAuthEvent = computed(() => this._lastEvent());
  readonly authUser = computed(() => this.session()?.user ?? null);
  readonly authUserId = computed(() => this.authUser()?.id ?? null);
  readonly userProfileResource = resource({
    params: () => this.authUserId(),
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return null;
      const cacheKey = CACHE_KEYS.userProfile(userId);
      return this.cache.fetchOrCache(
        cacheKey,
        async () => {
          const { data, error } = await this.client
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          if (error) {
            throw error;
          }

          if (data) {
            return data;
          } else {
            await this.logout();
            return null;
          }
        },
        { fallbackValue: null, logTag: 'SupabaseService' },
      );
    },
  });
  readonly userProfile = computed(() => {
    const val = this.userProfileResource.value();
    if (val !== undefined) return val;
    const userId = this.authUserId();
    if (!userId) return null;
    return this.cache.get<UserProfileDto | null>(
      CACHE_KEYS.userProfile(userId),
      null,
    );
  });

  readonly adminAreasResource = resource({
    params: () => ({
      userId: this.authUserId(),
    }),
    loader: async ({ params: { userId } }) => {
      if (!userId) return [];
      const { data, error } = await this.client
        .from('area_admins')
        .select('area_id')
        .eq('user_id', userId);
      if (error) {
        console.error('[SupabaseService] adminAreasResource error', error);
        return [];
      }
      return data.map((d) => d.area_id);
    },
  });

  readonly adminAreas = computed(() => this.adminAreasResource.value() ?? []);

  readonly adminIndoorCentersResource = resource({
    params: () => ({
      userId: this.authUserId(),
    }),
    loader: async ({ params: { userId } }) => {
      if (!userId) return [];
      const { data, error } = await this.client
        .from('indoor_center_admins')
        .select('center_id')
        .eq('user_id', userId);
      if (error) {
        console.error(
          '[SupabaseService] adminIndoorCentersResource error',
          error,
        );
        return [];
      }
      return data.map((d) => d.center_id).filter((id): id is string => !!id);
    },
  });

  readonly adminIndoorCenters = computed(
    () => this.adminIndoorCentersResource.value() ?? [],
  );

  /**
   * Builds a complete public URL for an avatar stored in the Supabase "avatar" bucket
   * from a relative path (e.g.: "avatars/xyz.jpg").
   * Does not access browser APIs; is SSR-safe.
   */
  async getUserProfile(userId: string): Promise<UserProfileDto | null> {
    const { data, error } = await this.client
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[SupabaseService] getUserProfile error', error);
      return null;
    }

    return data;
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

  /**
   * Gets a signed URL for a topo photo stored in the private "topos" bucket.
   */
  async getTopoSignedUrl(
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

    await this.whenReady();

    const { data, error } = await this.client.storage
      .from('topos')
      .createSignedUrl(path, 31536000); // 1 year

    if (error) {
      console.warn(
        '[SupabaseService] getTopoSignedUrl error, trying fallback',
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
        console.warn('[SupabaseService] Invalid URL when setting version:', e);
      }
    }

    const expiresAt = Date.now() + 31536000 * 1000 - 86400000;
    const entry = { url: finalUrl, expiresAt };
    this.signedUrlCache.set(cacheKey, entry);
    this.signedUrlCache.set(lastValidKey, entry);

    return finalUrl;
  }

  /**
   * Gets a signed URL for an ascent photo stored in the private "route-ascent-photos" bucket.
   */
  async getAscentSignedUrl(
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

    await this.whenReady();

    const bucket =
      path.startsWith('ascents/') || path.startsWith('centers/')
        ? 'indoor-assets'
        : 'route-ascent-photos';
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(path, 3600, options); // 1 hour

    if (error) {
      console.warn('[SupabaseService] getAscentSignedUrl error', error);
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

  constructor() {
    this._ready = new Promise<void>(
      (resolve) => (this._readyResolve = resolve),
    );
    if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined') {
      // Fire and forget; guard/UI can await whenReady() if needed
      void this.initClient();
    } else {
      // On server, we consider the service not ready and without a client
      this._readyResolve?.();
    }
  }

  /** SSR-safe dynamic import and client initialization */
  private async initClient(): Promise<void> {
    if (this._client) return;
    if (!this.url || !this.anonKey) {
      console.warn(
        '[SupabaseService] Missing SUPABASE config. Provide it via provideSupabaseConfig({ url, anonKey }).',
      );
      this._readyResolve?.();
      this._readyResolve = null;
      return;
    }
    try {
      const { createClient } = await import('@supabase/supabase-js');
      this._client = createClient<Database>(this.url, this.anonKey, {
        global: {
          fetch: async (url, options) => {
            // Do NOT reject immediately when offline — let the request reach
            // the Service Worker so it can serve a cached response from its
            // dataGroups (supabase-api / supabase-storage).
            const controller = new AbortController();
            // Use shorter timeout when offline so the request fails quickly
            // when the NGSW has no cached response. When online, allow up to
            // 8 seconds for slow connections.
            const isOffline =
              typeof navigator !== 'undefined' && !navigator.onLine;
            const timeoutMs = isOffline ? 3000 : 8000;
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            if (options?.signal) {
              options.signal.addEventListener('abort', () =>
                controller.abort(),
              );
            }
            try {
              const response = await fetch(url, {
                ...options,
                signal: controller.signal,
              });
              clearTimeout(timeoutId);
              return response;
            } catch (err) {
              clearTimeout(timeoutId);
              throw err;
            }
          },
        },
        auth: {
          storage: this.localStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      });
      // Subscribe to auth state changes BEFORE calling getSession().
      // Supabase fires INITIAL_SESSION immediately from localStorage (no network call),
      // which is sufficient for routing guards to determine auth state offline.
      // Token refresh for expired tokens happens in the background via getSession().
      this._client.auth.onAuthStateChange((event, sess) => {
        this._session.set(sess ?? null);
        this._lastEvent.set(event ?? null);
        // Resolve _ready on the first event (INITIAL_SESSION) so guards never
        // block waiting for a network token refresh when offline.
        if (this._readyResolve) {
          this._readyResolve();
          this._readyResolve = null;
        }
      });
      // Trigger session validation in the background. This may refresh an expired
      // token via network, but we don't await it to avoid blocking whenReady() offline.
      void this._client.auth.getSession();
    } catch (e) {
      console.error('[SupabaseService] Failed to initialize client', e);
      // Ensure _ready always resolves even on unexpected errors.
      this._readyResolve?.();
      this._readyResolve = null;
    }
  }

  /** Returns a promise which resolves when client init attempt is finished (browser only) */
  whenReady(): Promise<void> {
    return this._ready;
  }

  /** Direct access to Supabase client (browser only). Throws if not initialized. */
  get client() {
    if (!this._client) {
      throw new SupabaseNotInitializedError();
    }
    return this._client;
  }

  /** Convenience: fetch and return current session (browser only); updates signal */
  async getSession(): Promise<Session | null> {
    if (!this._client) return null;
    const { data, error } = await this._client.auth.getSession();
    if (error) {
      console.warn('[SupabaseService] getSession error', error);
    }
    const sess = data?.session ?? null;
    this._session.set(sess);
    return sess;
  }

  async register(email: string, password: string) {
    if (!this._client) throw new Error('Supabase client not ready');
    return this._client.auth.signUp({ email, password });
  }

  async login(email: string, password: string) {
    if (!this._client) throw new Error('Supabase client not ready');
    return this._client.auth.signInWithPassword({ email, password });
  }

  async logout() {
    // Ensure we only attempt to sign out in the browser where the client exists
    if (!this._client) {
      // Even if no client (SSR or not initialized), navigate to login to reset UI state
      void this.router.navigateByUrl('/login');
      return;
    }
    try {
      const { error } = await this._client.auth.signOut({
        scope: 'local' as const,
      });
      if (error) {
        console.error('[SupabaseService] signOut(local) error', error);
      }
    } catch (e) {
      console.error('[SupabaseService] signOut exception', e);
    } finally {
      // Always redirect to login to ensure predictable UX
      void this.router.navigateByUrl('/login');
    }
  }

  async deleteAccount(): Promise<void> {
    if (!this._client) throw new Error('Supabase client not ready');

    const response = await this.client.functions.invoke('delete-user', {
      method: 'POST',
      headers: {
        'ngsw-bypass': 'true',
      },
    });

    if (response.error) {
      console.error('[SupabaseService] deleteAccount error', response.error);
      throw response.error;
    }

    await this.logout();
  }

  /** Send password reset email */
  async resetPassword(email: string, redirectTo?: string) {
    if (!this._client) throw new Error('Supabase client not ready');
    return this._client.auth.resetPasswordForEmail(
      email,
      redirectTo ? { redirectTo } : undefined,
    );
  }

  /** Complete password recovery by setting a new password (after PASSWORD_RECOVERY) */
  async updatePassword(newPassword: string) {
    if (!this._client) throw new Error('Supabase client not ready');
    return this._client.auth.updateUser({ password: newPassword });
  }

  /** Upload avatar image to Supabase Edge Function */
  async uploadAvatar(
    file: File,
  ): Promise<{ path: string; publicUrl: string } | null> {
    if (!this._client) throw new Error('Supabase client not ready');

    const base64 = await this.fileToBase64(file);
    const payload = {
      file_name: file.name,
      content_type: file.type,
      base64: base64,
    };

    const response = await this.client.functions.invoke('upload-avatar', {
      body: payload,
      headers: {
        'ngsw-bypass': 'true',
      },
    });

    if (response.error) {
      console.error('[SupabaseService] uploadAvatar error', response.error);
      throw response.error;
    }

    return response.data;
  }

  /** Helper: Convert File to base64 string */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove the data:...;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
