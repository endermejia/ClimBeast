import { Injectable, signal, WritableSignal, computed } from '@angular/core';
import { ResourceRef } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { vi } from 'vitest';

import { UserProfileDto } from '../models';

function createMockResource<T>(
  value: T,
): ResourceRef<T> & { _setValue: (v: T) => void } {
  const s = signal<T | undefined>(value);
  const ref = {
    value: s.asReadonly(),
    reload: vi.fn(),
    hasValue: () => value !== undefined,
    status: signal('resolved' as const),
    error: signal(null),
    _setValue: (v: T) => s.set(v),
  } as unknown as ResourceRef<T> & { _setValue: (v: T) => void };
  return ref;
}

@Injectable()
export class MockSupabaseService {
  private readonly _session: WritableSignal<Session | null> = signal(null);
  private readonly _userProfile: WritableSignal<UserProfileDto | null> =
    signal(null);

  readonly session = computed(() => this._session());
  readonly authUser = computed(() => this._session()?.user ?? null);
  readonly authUserId = computed(() => this.authUser()?.id ?? null);

  readonly userProfileResource = createMockResource<UserProfileDto | null>(
    null,
  );
  readonly userProfile = computed(() => this._userProfile());
  readonly adminAreasResource = createMockResource<number[]>([]);
  readonly adminAreas = computed(() => [] as number[]);
  readonly adminIndoorCentersResource = createMockResource<string[]>([]);
  readonly adminIndoorCenters = computed(() => [] as string[]);

  readonly client = {
    from: (_table: string) => ({
      select: (_cols?: string) => ({
        eq: (_col: string, _val: unknown) => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
          then: (resolve: (v: { data: unknown; error: null }) => void) =>
            resolve({ data: null, error: null }),
        }),
        in: (_col: string, _vals: unknown[]) => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
        }),
        ilike: (_col: string, _pattern: string) => ({
          eq: (_col2: string, _val: unknown) => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
        order: (_col: string, _opts?: { ascending: boolean }) => ({
          range: (_from: number, _to: number) =>
            Promise.resolve({ data: [], error: null, count: 0 }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
        limit: (_count: number) => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
        then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
          resolve({ data: [], error: null }),
      }),
      insert: (_data: unknown) => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
        then: (resolve: (v: { data: unknown; error: null }) => void) =>
          resolve({ data: null, error: null }),
      }),
      update: (_data: unknown) => ({
        eq: (_col: string, _val: unknown) => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
          then: (resolve: (v: { data: unknown; error: null }) => void) =>
            resolve({ data: null, error: null }),
        }),
      }),
      delete: () => ({
        eq: (_col: string, _val: unknown) =>
          Promise.resolve({ data: null, error: null }),
      }),
      upsert: (_data: unknown) => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
        then: (resolve: (v: { data: unknown; error: null }) => void) =>
          resolve({ data: null, error: null }),
      }),
    }),
    storage: {
      from: (_bucket: string) => ({
        createSignedUrl: (_path: string, _expires: number) =>
          Promise.resolve({
            data: { signedUrl: 'https://mock.url' },
            error: null,
          }),
        upload: (_path: string, _file: File) =>
          Promise.resolve({ data: { path: 'mock/path' }, error: null }),
        remove: (_paths: string[]) =>
          Promise.resolve({ data: null, error: null }),
      }),
    },
    auth: {
      signOut: () => Promise.resolve({ error: null }),
      getSession: () =>
        Promise.resolve({ data: { session: this._session() }, error: null }),
      onAuthStateChange: (_callback: (event: string) => void) => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
  };

  setSession(session: Session | null): void {
    this._session.set(session);
  }

  setUserProfile(profile: UserProfileDto | null): void {
    this._userProfile.set(profile);
  }

  async whenReady(): Promise<void> {}
  async getSession(): Promise<Session | null> {
    return this._session();
  }
  async logout(): Promise<void> {
    this._session.set(null);
    this._userProfile.set(null);
  }
  buildAvatarUrl(path?: string | null): string {
    return path
      ? `https://mock.supabase.co/storage/v1/object/public/avatar/${path}`
      : '';
  }
  getPublicUrl(bucket: string, path: string | null | undefined): string {
    return path
      ? `https://mock.supabase.co/storage/v1/object/public/${bucket}/${path}`
      : '';
  }
  async getTopoSignedUrl(path: string | null | undefined): Promise<string> {
    return path ? `https://mock.url/signed/${path}` : '';
  }
  async getUserProfile(_userId: string): Promise<UserProfileDto | null> {
    return this._userProfile();
  }
}
