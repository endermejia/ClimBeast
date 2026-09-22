import { describe, expect, it } from 'vitest';

import { MaterialQuantityPipe } from './material-quantity.pipe';

describe('MaterialQuantityPipe', () => {
  const pipe = new MaterialQuantityPipe();

  it('returns quantity for existing material ID', () => {
    const quantities = { 101: 3, 102: 5 };
    expect(pipe.transform(quantities, 101)).toBe(3);
    expect(pipe.transform(quantities, 102)).toBe(5);
  });

  it('returns 0 for missing material ID', () => {
    const quantities = { 101: 3 };
    expect(pipe.transform(quantities, 999)).toBe(0);
  });

  it('returns 0 for null or undefined quantities map', () => {
    expect(pipe.transform(null, 101)).toBe(0);
    expect(pipe.transform(undefined, 101)).toBe(0);
  });
});
