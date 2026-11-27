import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { extractPhotoMetadata, PhotoMetadata } from '../utils';

import { IS_BROWSER } from '../app/is-browser';
import { MockSupabaseService } from '../testing/mock-supabase.service';
import { AscentMediaService } from './ascent-media.service';
import { SupabaseService } from './supabase.service';

vi.mock('../utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils')>();
  return {
    ...actual,
    extractPhotoMetadata: vi.fn(),
  };
});

const mockedExtractPhotoMetadata = vi.mocked(extractPhotoMetadata);

describe('AscentMediaService', () => {
  let service: AscentMediaService;
  let mockSupabase: MockSupabaseService;

  function configure(isBrowser = true): AscentMediaService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AscentMediaService,
        { provide: PLATFORM_ID, useValue: isBrowser ? 'browser' : 'server' },
        { provide: IS_BROWSER, useValue: isBrowser },
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    });
    return TestBed.inject(AscentMediaService);
  }

  beforeEach(() => {
    mockSupabase = new MockSupabaseService();
    mockedExtractPhotoMetadata.mockReset();
    mockedExtractPhotoMetadata.mockResolvedValue({
      width: 800,
      height: 600,
      lqip: 'data:image/webp;base64,abc',
    });
    service = configure(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('buildPhotoHeaders', () => {
    it('builds headers without is-indoor for numeric outdoor ascents', () => {
      expect(service.buildPhotoHeaders(42, false)).toEqual({
        'ascent-id': '42',
        'ngsw-bypass': 'true',
      });
    });

    it('adds is-indoor when isIndoor is true or ascentId is a string', () => {
      expect(service.buildPhotoHeaders(42, true)).toEqual({
        'ascent-id': '42',
        'ngsw-bypass': 'true',
        'is-indoor': 'true',
      });
      expect(service.buildPhotoHeaders('uuid-1', false)).toEqual({
        'ascent-id': 'uuid-1',
        'ngsw-bypass': 'true',
        'is-indoor': 'true',
      });
    });
  });

  describe('uploadPhoto', () => {
    it('returns null on server platform', async () => {
      const ssrService = configure(false);
      const file = new File(['abc'], 'a.jpg', { type: 'image/jpeg' });
      expect(await ssrService.uploadPhoto(1, file)).toBeNull();
    });

    it('encodes file, sends extracted metadata, and returns merged photo changes', async () => {
      const invokeSpy = vi
        .spyOn(mockSupabase.client.functions, 'invoke')
        .mockResolvedValue({
          data: {
            path: 'user-1/42.jpg',
            photo_width: 1024,
            photo_height: null,
            photo_lqip: null,
          },
          error: null,
        });

      const file = new File(['hello'], 'climb.jpg', { type: 'image/jpeg' });
      const changes = await service.uploadPhoto(42, file, false);

      expect(invokeSpy).toHaveBeenCalledWith(
        'upload-route-ascent-photo',
        expect.objectContaining({
          body: expect.objectContaining({
            file_name: 'climb.jpg',
            content_type: 'image/jpeg',
            base64: expect.stringMatching(/^data:image\/jpeg;base64,/),
            width: 800,
            height: 600,
            lqip: 'data:image/webp;base64,abc',
          }),
          headers: {
            'ascent-id': '42',
            'ngsw-bypass': 'true',
          },
        }),
      );

      expect(changes).toEqual({
        photo_path: 'user-1/42.jpg',
        photo_width: 1024,
        photo_height: 600,
        photo_lqip: 'data:image/webp;base64,abc',
      });
    });

    it('passes is-indoor header for indoor ascents and throws on edge error', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        /* noop */
      });
      const invokeSpy = vi
        .spyOn(mockSupabase.client.functions, 'invoke')
        .mockResolvedValue({ data: null, error: new Error('upload failed') });

      const file = new File(['hello'], 'indoor.jpg', { type: 'image/jpeg' });
      await expect(service.uploadPhoto('uuid-9', file, true)).rejects.toThrow(
        'upload failed',
      );
      expect(invokeSpy).toHaveBeenCalledWith(
        'upload-route-ascent-photo',
        expect.objectContaining({
          headers: {
            'ascent-id': 'uuid-9',
            'ngsw-bypass': 'true',
            'is-indoor': 'true',
          },
        }),
      );
      errorSpy.mockRestore();
    });
  });

  describe('deletePhoto', () => {
    it('returns null on server platform', async () => {
      const ssrService = configure(false);
      expect(await ssrService.deletePhoto(1)).toBeNull();
    });

    it('invokes delete-route-ascent-photo and returns nulled fields', async () => {
      const invokeSpy = vi
        .spyOn(mockSupabase.client.functions, 'invoke')
        .mockResolvedValue({ data: { success: true }, error: null });

      const changes = await service.deletePhoto(7, false);
      expect(invokeSpy).toHaveBeenCalledWith('delete-route-ascent-photo', {
        headers: {
          'ascent-id': '7',
          'ngsw-bypass': 'true',
        },
      });
      expect(changes).toEqual({
        photo_path: null,
        photo_width: null,
        photo_height: null,
        photo_lqip: null,
      });
    });

    it('throws when delete edge function returns an error', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        /* noop */
      });
      vi.spyOn(mockSupabase.client.functions, 'invoke').mockResolvedValue({
        data: null,
        error: new Error('delete failed'),
      });

      await expect(service.deletePhoto('uuid-2', true)).rejects.toThrow(
        'delete failed',
      );
      errorSpy.mockRestore();
    });
  });

  describe('backfillPhotoMetadata', () => {
    it('returns null on server or missing inputs', async () => {
      const ssrService = configure(false);
      expect(
        await ssrService.backfillPhotoMetadata(
          1,
          false,
          'https://example.com/a.jpg',
        ),
      ).toBeNull();
      expect(
        await service.backfillPhotoMetadata(
          0,
          false,
          'https://example.com/a.jpg',
        ),
      ).toBeNull();
      expect(await service.backfillPhotoMetadata(1, false, '')).toBeNull();
    });

    it('fetches signedUrl, invokes backfill RPC, and deduplicates subsequent calls', async () => {
      const meta: PhotoMetadata = {
        width: 1200,
        height: 900,
        lqip: 'data:image/webp;base64,xyz',
      };
      mockedExtractPhotoMetadata.mockResolvedValue(meta);

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(new Blob(['img'])),
      } as unknown as Response);

      const first = await service.backfillPhotoMetadata(
        55,
        false,
        'https://example.com/55.jpg',
      );
      expect(first).toEqual(meta);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(mockSupabase.client.rpc).toHaveBeenCalledWith(
        'backfill_ascent_photo_metadata',
        {
          p_ascent_id: '55',
          p_is_indoor: false,
          p_width: 1200,
          p_height: 900,
          p_lqip: 'data:image/webp;base64,xyz',
        },
      );

      // Duplicate call for same key should short-circuit without fetching again
      const second = await service.backfillPhotoMetadata(
        55,
        false,
        'https://example.com/55.jpg',
      );
      expect(second).toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('returns null when fetch response is not ok or metadata is empty', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
      } as unknown as Response);

      expect(
        await service.backfillPhotoMetadata(
          99,
          true,
          'https://example.com/99.jpg',
        ),
      ).toBeNull();
    });
  });

  describe('deleteOrphanedPhoto', () => {
    it('no-ops on server or empty photoPath', async () => {
      const invokeSpy = vi.spyOn(mockSupabase.client.functions, 'invoke');
      const ssrService = configure(false);
      await ssrService.deleteOrphanedPhoto(1, 'path/1.jpg');
      await service.deleteOrphanedPhoto(1, '');
      expect(invokeSpy).not.toHaveBeenCalled();
    });

    it('invokes delete-route-ascent-photo with photo_path body and swallows failures', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        /* noop */
      });
      const invokeSpy = vi
        .spyOn(mockSupabase.client.functions, 'invoke')
        .mockRejectedValue(new Error('network error'));

      await expect(
        service.deleteOrphanedPhoto('uuid-3', 'user-1/uuid-3.jpg', true),
      ).resolves.toBeUndefined();

      expect(invokeSpy).toHaveBeenCalledWith('delete-route-ascent-photo', {
        body: { photo_path: 'user-1/uuid-3.jpg' },
        headers: {
          'ascent-id': 'uuid-3',
          'ngsw-bypass': 'true',
          'is-indoor': 'true',
        },
      });
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
