import {
  computed,
  inject,
  Injectable,
  resource,
  signal,
  WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';

import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { UserProfileDto } from '../models';

import { Database } from '../models/supabase-generated';

import { CACHE_KEYS } from '../constants/cache-keys';

import { IS_BROWSER } from '../app/is-browser';

import { CacheService } from './cache.service';

@Injectable({ providedIn: 'root' })
export class SupabaseAuthService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly router = inject(Router);
  private readonly cache = inject(CacheService);

  readonly _session: WritableSignal<Session | null> = signal<Session | null>(
    null,
  );
  readonly _lastEvent: WritableSignal<string | null> = signal<string | null>(
    null,
  );

  readonly session = computed(() => this._session());
  readonly lastAuthEvent = computed(() => this._lastEvent());
  readonly authUser = computed(() => this.session()?.user ?? null);
  readonly authUserId = computed(() => this.authUser()?.id ?? null);

  /** Function getter to access client dynamically from caller */
  private clientGetter: (() => SupabaseClient<Database>) | null = null;

  setClientGetter(getter: () => SupabaseClient<Database>): void {
    this.clientGetter = getter;
  }

  private get client(): SupabaseClient<Database> {
    if (!this.clientGetter) {
      throw new Error('Supabase client not set in SupabaseAuthService');
    }
    return this.clientGetter();
  }

  readonly userProfileResource = resource({
    params: () => this.authUserId(),
    loader: async ({ params: userId }) => {
      if (!userId || !this.isBrowser) return null;
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
        { fallbackValue: null, logTag: 'SupabaseAuthService' },
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
      if (!userId || !this.isBrowser) return [];
      const cacheKey = CACHE_KEYS.adminAreas(userId);
      return this.cache.fetchOrCache(
        cacheKey,
        async () => {
          const { data, error } = await this.client
            .from('area_admins')
            .select('area_id')
            .eq('user_id', userId);
          if (error) {
            console.error(
              '[SupabaseAuthService] adminAreasResource error',
              error,
            );
            return [];
          }
          return data.map((d) => d.area_id);
        },
        { fallbackValue: [] as number[], logTag: 'SupabaseAuthService' },
      );
    },
  });

  readonly adminAreas = computed(() => {
    const val = this.adminAreasResource.value();
    if (val !== undefined) return val;
    const userId = this.authUserId();
    if (!userId) return [];
    return this.cache.get<number[]>(CACHE_KEYS.adminAreas(userId), []);
  });

  readonly adminIndoorCentersResource = resource({
    params: () => ({
      userId: this.authUserId(),
    }),
    loader: async ({ params: { userId } }) => {
      if (!userId || !this.isBrowser) return [];
      const cacheKey = CACHE_KEYS.adminIndoorCenters(userId);
      return this.cache.fetchOrCache(
        cacheKey,
        async () => {
          const { data, error } = await this.client
            .from('indoor_center_admins')
            .select('center_id')
            .eq('user_id', userId);
          if (error) {
            console.error(
              '[SupabaseAuthService] adminIndoorCentersResource error',
              error,
            );
            return [];
          }
          return data
            .map((d) => d.center_id)
            .filter((id): id is string => !!id);
        },
        { fallbackValue: [] as string[], logTag: 'SupabaseAuthService' },
      );
    },
  });

  readonly adminIndoorCenters = computed(() => {
    const val = this.adminIndoorCentersResource.value();
    if (val !== undefined) return val;
    const userId = this.authUserId();
    if (!userId) return [];
    return this.cache.get<string[]>(CACHE_KEYS.adminIndoorCenters(userId), []);
  });

  readonly routesetterIndoorCentersResource = resource({
    params: () => ({
      userId: this.authUserId(),
    }),
    loader: async ({ params: { userId } }) => {
      if (!userId || !this.isBrowser) return [];
      const { data, error } = await this.client
        .from('indoor_center_routesetters')
        .select('center_id')
        .eq('user_id', userId);
      if (error) {
        console.error(
          '[SupabaseAuthService] routesetterIndoorCentersResource error',
          error,
        );
        return [];
      }
      return data.map((d) => d.center_id).filter((id): id is string => !!id);
    },
  });

  readonly routesetterIndoorCenters = computed(
    () => this.routesetterIndoorCentersResource.value() ?? [],
  );

  async getUserProfile(userId: string): Promise<UserProfileDto | null> {
    const { data, error } = await this.client
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[SupabaseAuthService] getUserProfile error', error);
      return null;
    }

    return data;
  }

  async getSession(
    clientSupplier?: SupabaseClient<Database> | null,
  ): Promise<Session | null> {
    const activeClient =
      clientSupplier || (this.clientGetter ? this.client : null);
    if (!activeClient) return null;
    const { data, error } = await activeClient.auth.getSession();
    if (error) {
      console.warn('[SupabaseAuthService] getSession error', error);
    }
    const sess = data?.session ?? null;
    this._session.set(sess);
    return sess;
  }

  async register(email: string, password: string) {
    return this.client.auth.signUp({ email, password });
  }

  async login(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email, password });
  }

  async logout(clientSupplier?: SupabaseClient<Database> | null) {
    const activeClient =
      clientSupplier || (this.clientGetter ? this.client : null);
    if (!activeClient) {
      void this.router.navigateByUrl('/login');
      return;
    }
    try {
      const { error } = await activeClient.auth.signOut({
        scope: 'local' as const,
      });
      if (error) {
        console.error('[SupabaseAuthService] signOut(local) error', error);
      }
    } catch (e) {
      console.error('[SupabaseAuthService] signOut exception', e);
    } finally {
      void this.router.navigateByUrl('/login');
    }
  }

  async deleteAccount(): Promise<void> {
    const response = await this.client.functions.invoke('delete-user', {
      method: 'POST',
      headers: {
        'ngsw-bypass': 'true',
      },
    });

    if (response.error) {
      console.error(
        '[SupabaseAuthService] deleteAccount error',
        response.error,
      );
      throw response.error;
    }

    await this.logout();
  }

  async resetPassword(email: string, redirectTo?: string) {
    return this.client.auth.resetPasswordForEmail(
      email,
      redirectTo ? { redirectTo } : undefined,
    );
  }

  async updatePassword(newPassword: string) {
    return this.client.auth.updateUser({ password: newPassword });
  }
}
