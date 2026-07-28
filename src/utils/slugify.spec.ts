import { describe, it, expect } from 'vitest';
import {
  slugify,
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
  });
});
