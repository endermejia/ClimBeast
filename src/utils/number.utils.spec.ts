import { describe, it, expect } from 'vitest';
import { clamp, progressPercent } from './number.utils';

describe('clamp', () => {
  it('should clamp value below min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('should clamp value above max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('should return value within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('should handle value equal to min', () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });

  it('should handle value equal to max', () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('progressPercent', () => {
  it('should calculate percentage', () => {
    expect(progressPercent(50, 100)).toBe(50);
  });

  it('should floor the result', () => {
    expect(progressPercent(1, 3)).toBe(33);
  });

  it('should return 0 for zero total', () => {
    expect(progressPercent(5, 0)).toBe(0);
  });

  it('should cap at 100', () => {
    expect(progressPercent(200, 100)).toBe(100);
  });

  it('should return 0 for zero completed', () => {
    expect(progressPercent(0, 100)).toBe(0);
  });
});
