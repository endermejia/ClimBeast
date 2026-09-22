import { describe, it, expect } from 'vitest';

import {
  slugify,
  sectorSlug,
  normalizeNameStrict,
  normalizeName,
  matchesQuery,
} from './slugify';

describe('slugify', () => {
  it('should convert "Hello World" to "hello-world"', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('should handle empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('should handle null', () => {
    expect(slugify(null)).toBe('');
  });

  it('should handle undefined', () => {
    expect(slugify(undefined)).toBe('');
  });

  it('should remove diacritics', () => {
    expect(slugify('Café')).toBe('cafe');
    expect(slugify('Ñoño')).toBe('nono');
  });

  it('should collapse multiple hyphens', () => {
    expect(slugify('hello---world')).toBe('hello-world');
  });

  it('should trim leading/trailing hyphens', () => {
    expect(slugify('-hello-')).toBe('hello');
  });

  it('should lowercase', () => {
    expect(slugify('HELLO')).toBe('hello');
  });

  it('should trim whitespace', () => {
    expect(slugify('  hello  ')).toBe('hello');
  });
});

describe('sectorSlug', () => {
  it('slugifies the sector name', () => {
    expect(sectorSlug('Los Becerriles')).toBe('los-becerriles');
  });

  it('falls back to "general" for empty or whitespace-only names', () => {
    expect(sectorSlug('')).toBe('general');
    expect(sectorSlug('   ')).toBe('general');
    expect(sectorSlug(null)).toBe('general');
    expect(sectorSlug(undefined)).toBe('general');
  });

  it('trims before slugifying', () => {
    expect(sectorSlug('  El Muro  ')).toBe('el-muro');
  });

  it('falls back to "general" when nothing alphanumeric remains', () => {
    expect(sectorSlug('---')).toBe('general');
  });
});

describe('normalizeNameStrict', () => {
  it('should normalize but keep hyphens', () => {
    expect(normalizeNameStrict('V.T.')).toBe('v.t.');
  });

  it('should remove quotes', () => {
    expect(normalizeNameStrict("O'Brien")).toBe('obrien');
  });
});

describe('normalizeName', () => {
  it('should replace non-alphanumeric with spaces', () => {
    expect(normalizeName('V.T.')).toBe('v t');
  });

  it('should collapse whitespace', () => {
    expect(normalizeName('hello   world')).toBe('hello world');
  });
});

describe('matchesQuery', () => {
  it('should match when query words are present', () => {
    expect(matchesQuery('Sierra de Guara', 'guara')).toBe(true);
  });

  it('should not match when query words are missing', () => {
    expect(matchesQuery('Sierra de Guara', 'malaga')).toBe(false);
  });

  it('should match empty query', () => {
    expect(matchesQuery('anything', '')).toBe(true);
    expect(matchesQuery('anything', null)).toBe(true);
    expect(matchesQuery('anything', undefined)).toBe(true);
    expect(matchesQuery('anything', '   ')).toBe(true);
  });

  it('should return false for null/undefined source when query is present', () => {
    expect(matchesQuery(null, 'guara')).toBe(false);
    expect(matchesQuery(undefined, 'guara')).toBe(false);
    expect(matchesQuery('', 'guara')).toBe(false);
  });

  it('should ignore accents and casing (e.g. Raúl matches raul and RAUL)', () => {
    expect(matchesQuery('Raúl Rodríguez', 'raul')).toBe(true);
    expect(matchesQuery('Raúl Rodríguez', 'RAUL')).toBe(true);
    expect(matchesQuery('Raúl Rodríguez', 'rodriguez')).toBe(true);
    expect(matchesQuery('Raúl Rodríguez', 'RODRÍGUEZ')).toBe(true);
    expect(matchesQuery('Raúl Rodríguez', 'raul rod')).toBe(true);
    expect(matchesQuery('Raúl Rodríguez', 'juan')).toBe(false);
  });

  it('should handle repeated queries consistently using memoized cache', () => {
    const query = 'Sierra Guara';
    const items = [
      'Sierra de Guara',
      'Sierra Nevada',
      'Mascarat Guara',
      'Guara Sierra',
    ];
    const results = items.map((item) => matchesQuery(item, query));
    expect(results).toEqual([true, false, false, true]);
  });
});
