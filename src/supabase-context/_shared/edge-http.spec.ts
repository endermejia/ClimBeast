import { describe, expect, it } from 'vitest';

import {
  ALLOWED_ORIGINS,
  buildCorsHeaders,
  extractBearerToken,
  jsonResponse,
  R2_STORAGE_URL,
  rewriteStorageUrlToR2,
} from './edge-http';

describe('edge-http helpers', () => {
  describe('rewriteStorageUrlToR2', () => {
    const supabaseUrl = 'https://example.supabase.co';

    it('rewrites Supabase storage URLs to the default R2 storage URL', () => {
      const result = rewriteStorageUrlToR2(
        'https://example.supabase.co/storage/v1/object/avatar/user-1.png',
        supabaseUrl,
      );

      expect(result).toBe(
        `${R2_STORAGE_URL}/storage/v1/object/avatar/user-1.png`,
      );
    });

    it('normalizes trailing slashes on supabaseUrl and r2Url', () => {
      const result = rewriteStorageUrlToR2(
        'https://example.supabase.co/storage/v1/object/topos/42.webp?upsert=true',
        'https://example.supabase.co/',
        'https://custom-r2.example.dev/',
      );

      expect(result).toBe(
        'https://custom-r2.example.dev/storage/v1/object/topos/42.webp?upsert=true',
      );
    });

    it('returns null for non-storage Supabase URLs', () => {
      expect(
        rewriteStorageUrlToR2(
          'https://example.supabase.co/rest/v1/topos?select=id',
          supabaseUrl,
        ),
      ).toBeNull();
      expect(
        rewriteStorageUrlToR2(
          'https://other.supabase.co/storage/v1/object/avatar/a.png',
          supabaseUrl,
        ),
      ).toBeNull();
    });

    it('returns null when supabaseUrl is empty', () => {
      expect(
        rewriteStorageUrlToR2('/storage/v1/object/avatar/a.png', ''),
      ).toBeNull();
    });
  });

  describe('buildCorsHeaders', () => {
    it('returns standard CORS headers for each allowed origin', () => {
      for (const origin of ALLOWED_ORIGINS) {
        expect(buildCorsHeaders(origin)).toEqual({
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Headers':
            'authorization, x-client-info, apikey, content-type, ngsw-bypass',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        });
      }
    });

    it('includes extra allowed headers before ngsw-bypass', () => {
      expect(buildCorsHeaders('https://climbeast.com', ['topo-id'])).toEqual({
        'Access-Control-Allow-Origin': 'https://climbeast.com',
        'Access-Control-Allow-Headers':
          'authorization, x-client-info, apikey, content-type, topo-id, ngsw-bypass',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      });

      expect(
        buildCorsHeaders('http://localhost:4200', ['ascent-id', 'is-indoor']),
      ).toEqual({
        'Access-Control-Allow-Origin': 'http://localhost:4200',
        'Access-Control-Allow-Headers':
          'authorization, x-client-info, apikey, content-type, ascent-id, is-indoor, ngsw-bypass',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      });
    });

    it('returns an empty object for disallowed or missing origins', () => {
      expect(buildCorsHeaders('https://evil.example.com')).toEqual({});
      expect(buildCorsHeaders('https://evil.example.com', ['topo-id'])).toEqual(
        {},
      );
      expect(buildCorsHeaders('')).toEqual({});
    });
  });

  describe('extractBearerToken', () => {
    it('extracts the token from Bearer authorization headers case-insensitively', () => {
      expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
      expect(extractBearerToken('bearer   token-123')).toBe('token-123');
      expect(extractBearerToken('BEARER jwt-value')).toBe('jwt-value');
    });

    it('returns empty string for null, empty, or prefix-only headers', () => {
      expect(extractBearerToken(null)).toBe('');
      expect(extractBearerToken('')).toBe('');
      expect(extractBearerToken('Bearer ')).toBe('');
      expect(extractBearerToken('   ')).toBe('');
    });

    it('returns raw token when no Bearer prefix is present', () => {
      expect(extractBearerToken('raw-token-value')).toBe('raw-token-value');
    });
  });

  describe('jsonResponse', () => {
    it('creates a JSON Response with status, Content-Type, and CORS headers', async () => {
      const corsHeaders = buildCorsHeaders('https://climbeast.com', [
        'topo-id',
      ]);
      const res = jsonResponse({ ok: true, id: 7 }, 201, corsHeaders);

      expect(res.status).toBe(201);
      expect(res.headers.get('Content-Type')).toBe('application/json');
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://climbeast.com',
      );
      expect(res.headers.get('Access-Control-Allow-Headers')).toBe(
        'authorization, x-client-info, apikey, content-type, topo-id, ngsw-bypass',
      );
      expect(await res.json()).toEqual({ ok: true, id: 7 });
    });

    it('creates a JSON Response cleanly when CORS headers are empty', async () => {
      const res = jsonResponse({ error: 'Unauthorized' }, 401, {});

      expect(res.status).toBe(401);
      expect(res.headers.get('Content-Type')).toBe('application/json');
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(await res.json()).toEqual({ error: 'Unauthorized' });
    });
  });
});
