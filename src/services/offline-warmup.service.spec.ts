import { TestBed } from '@angular/core/testing';

import type { Session } from '@supabase/supabase-js';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CACHE_KEYS } from '../constants';

import { IS_BROWSER } from '../app/is-browser';
import { MockSupabaseService } from '../testing';

import { CacheService } from './cache.service';
import { OfflineWarmupService } from './offline-warmup.service';
import { OutdoorDataService } from './outdoor-data.service';
import { SupabaseService } from './supabase.service';

function createSession(): Session {
  return {
    user: { id: 'user-1', email: 'test@example.com' },
    access_token: 'token',
  } as unknown as Session;
}

describe('OfflineWarmupService', () => {
  let service: OfflineWarmupService;
  let mockSupabase: MockSupabaseService;
  let cache: CacheService;
  let outdoorData: OutdoorDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseService, useClass: MockSupabaseService },
        { provide: IS_BROWSER, useValue: true },
      ],
    });
    service = TestBed.inject(OfflineWarmupService);
    mockSupabase = TestBed.inject(
      SupabaseService,
    ) as unknown as MockSupabaseService;
    cache = TestBed.inject(CacheService);
    // localStorage de jsdom persiste entre tests: limpiar para aislar cada caso.
    cache.clear();
    outdoorData = TestBed.inject(OutdoorDataService);
    vi.spyOn(outdoorData, 'reloadAreasList').mockImplementation(
      () => undefined,
    );
  });

  it('does not warm the cache without session', () => {
    mockSupabase.setSession(null);
    mockSupabase.setOnline(true);

    service.warmup();

    expect(outdoorData.reloadAreasList).not.toHaveBeenCalled();
  });

  it('does not warm the cache when offline', () => {
    mockSupabase.setSession(createSession());
    mockSupabase.setOnline(false);

    service.warmup();

    expect(outdoorData.reloadAreasList).not.toHaveBeenCalled();
  });

  it('reloads the areas list when online with session and no cached data', () => {
    mockSupabase.setSession(createSession());
    mockSupabase.setOnline(true);

    service.warmup();

    expect(outdoorData.reloadAreasList).toHaveBeenCalled();
  });

  it('skips the reload when the cached list is fresh', () => {
    mockSupabase.setSession(createSession());
    mockSupabase.setOnline(true);
    cache.set(`${CACHE_KEYS.areasList}_user-1`, []);

    service.warmup();

    expect(outdoorData.reloadAreasList).not.toHaveBeenCalled();
  });

  it('warms at most once per page load', () => {
    mockSupabase.setSession(createSession());
    mockSupabase.setOnline(true);

    service.warmup();
    service.warmup();

    expect(outdoorData.reloadAreasList).toHaveBeenCalledTimes(1);
  });
});
