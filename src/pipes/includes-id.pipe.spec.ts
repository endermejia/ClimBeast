import { describe, expect, it } from 'vitest';

import { IncludesIdPipe } from './includes-id.pipe';

describe('IncludesIdPipe', () => {
  const pipe = new IncludesIdPipe();

  it('should return false for null or undefined items', () => {
    expect(pipe.transform(null, 1)).toBe(false);
    expect(pipe.transform(undefined, '1')).toBe(false);
  });

  it('should return false for null or undefined id', () => {
    expect(pipe.transform([{ id: 1 }], null)).toBe(false);
    expect(pipe.transform([1, 2, 3], undefined)).toBe(false);
  });

  it('should find matching string or numeric id in array of objects', () => {
    const items = [{ id: 10 }, { id: 'abc' }, { id: 20 }];
    expect(pipe.transform(items, 10)).toBe(true);
    expect(pipe.transform(items, 'abc')).toBe(true);
    expect(pipe.transform(items, 99)).toBe(false);
  });

  it('should find matching item in array of primitive numbers or strings', () => {
    const primitiveItems = [1, 'test', 42];
    expect(pipe.transform(primitiveItems, 42)).toBe(true);
    expect(pipe.transform(primitiveItems, 'test')).toBe(true);
    expect(pipe.transform(primitiveItems, 'missing')).toBe(false);
  });

  it('should handle array with null or undefined elements', () => {
    const mixed = [null, undefined, { id: 5 }, 'item'];
    expect(pipe.transform(mixed, 5)).toBe(true);
    expect(pipe.transform(mixed, 'item')).toBe(true);
    expect(pipe.transform(mixed, 10)).toBe(false);
  });
});
