import { describe, it, expect } from 'vitest';
import { remToPx } from './rem-to-px';

describe('remToPx', () => {
  it('should convert rem to px using default base (16)', () => {
    expect(remToPx('1rem')).toBe(16);
  });

  it('should convert multiple rem', () => {
    expect(remToPx('2rem')).toBe(32);
  });

  it('should return px as-is', () => {
    expect(remToPx('16px')).toBe(16);
  });

  it('should return 0 for empty string', () => {
    expect(remToPx('')).toBe(0);
  });

  it('should return 0 for invalid value', () => {
    expect(remToPx('abc')).toBe(0);
  });

  it('should handle decimal rem', () => {
    expect(remToPx('0.5rem')).toBe(8);
  });

  it('should round result', () => {
    expect(remToPx('1.5rem')).toBe(24);
  });
});
