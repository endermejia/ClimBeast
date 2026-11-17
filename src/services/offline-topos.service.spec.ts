import { TestBed } from '@angular/core/testing';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TopoDetail } from '../models';

import { CACHE_KEYS } from '../constants';

import { IS_BROWSER } from '../app/is-browser';
import { MockSupabaseService } from '../testing';

import { CacheService } from './cache.service';
import { OfflineToposService } from './offline-topos.service';
import { OutdoorDataService } from './outdoor-data.service';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { TopoImageCacheService } from './topo-image-cache.service';

function makeTopoDetail(id: number, photo: string | null): TopoDetail {
  return {
    id,
    name: `Topo ${id}`,
    slug: `topo-${id}`,
    photo,
    crag_id: 1,
    created_at: '',
    legacy: false,
    shade_afternoon: false,
    shade_change_hour: null,
    shade_morning: false,
    topo_routes: [],
  } as unknown as TopoDetail;
}

describe('OfflineToposService', () => {
  let service: OfflineToposService;
  let mockSupabase: MockSupabaseService;
  let cache: CacheService;
  let outdoorData: OutdoorDataService;
  let topoImageCache: TopoImageCacheService;
  let toast: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseService, useClass: MockSupabaseService },
        { provide: IS_BROWSER, useValue: true },
        {
          provide: ToastService,
          useValue: {
            success: vi.fn(),
            error: vi.fn(),
          },
        },
      ],
    });

    service = TestBed.inject(OfflineToposService);
    mockSupabase = TestBed.inject(
      SupabaseService,
    ) as unknown as MockSupabaseService;
    cache = TestBed.inject(CacheService);
    cache.clear();
    outdoorData = TestBed.inject(OutdoorDataService);
    topoImageCache = TestBed.inject(TopoImageCacheService);
    toast = TestBed.inject(ToastService);
  });

  it('reports unavailable when topo detail or image is missing', async () => {
    vi.spyOn(topoImageCache, 'has').mockResolvedValue(false);

    const status = await service.checkToposAvailability([
      { id: 1, photo: 'topos/1.webp' },
      { id: 2, photo: null },
    ]);

    expect(status).toEqual({
      total: 2,
      cachedCount: 0,
      allAvailable: false,
    });
  });

  it('requires both cached routes (TopoDetail) and cached image for topos with photo', async () => {
    cache.set(CACHE_KEYS.topoDetail(1), makeTopoDetail(1, 'topos/1.webp'));
    cache.set(CACHE_KEYS.topoDetail(2), makeTopoDetail(2, null));
    vi.spyOn(topoImageCache, 'has').mockResolvedValue(false);

    const partial = await service.checkToposAvailability([
      { id: 1, photo: 'topos/1.webp' },
      { id: 2, photo: null },
    ]);
    expect(partial).toEqual({
      total: 2,
      cachedCount: 1,
      allAvailable: false,
    });

    vi.spyOn(topoImageCache, 'has').mockResolvedValue(true);
    const full = await service.checkToposAvailability([
      { id: 1, photo: 'topos/1.webp' },
      { id: 2, photo: null },
    ]);
    expect(full).toEqual({
      total: 2,
      cachedCount: 2,
      allAvailable: true,
    });
  });

  it('downloads all topo details and images and marks them available', async () => {
    mockSupabase.setOnline(true);
    const cachedImages = new Set<string>();

    vi.spyOn(outdoorData, 'cacheTopoDetail').mockImplementation(async (id) => {
      const detail = makeTopoDetail(id, `topos/${id}.webp`);
      cache.set(CACHE_KEYS.topoDetail(id), detail);
      return detail;
    });
    vi.spyOn(topoImageCache, 'prefetch').mockImplementation(async (url) => {
      if (url) cachedImages.add(url);
      return true;
    });
    vi.spyOn(topoImageCache, 'has').mockImplementation(async (url) =>
      url ? cachedImages.has(url) : false,
    );

    const ok = await service.downloadTopos('area:test', [
      { id: 10, photo: 'topos/10.webp' },
      { id: 11, photo: null },
    ]);

    expect(ok).toBe(true);
    expect(toast.success).toHaveBeenCalledWith('offline.toposDownloaded');

    const status = await service.checkToposAvailability([
      { id: 10, photo: 'topos/10.webp' },
      { id: 11, photo: null },
    ]);
    expect(status.allAvailable).toBe(true);
  });

  it('does not download when offline', async () => {
    mockSupabase.setOnline(false);
    const spy = vi.spyOn(outdoorData, 'cacheTopoDetail');

    const ok = await service.downloadTopos('crag:test', [
      { id: 10, photo: 'topos/10.webp' },
    ]);

    expect(ok).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});
