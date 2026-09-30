import { describe, it, expect } from 'vitest';

import { clamp, formatAscentCount, progressPercent } from './number.utils';

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

describe('formatAscentCount', () => {
  it('should return "0" for 0, null, undefined or NaN', () => {
    expect(formatAscentCount(0)).toBe('0');
    expect(formatAscentCount(null)).toBe('0');
    expect(formatAscentCount(undefined)).toBe('0');
    expect(formatAscentCount(Number.NaN)).toBe('0');
  });

  it('should return raw number as string when below 1000', () => {
    expect(formatAscentCount(1)).toBe('1');
    expect(formatAscentCount(12)).toBe('12');
    expect(formatAscentCount(500)).toBe('500');
    expect(formatAscentCount(999)).toBe('999');
  });

  it('should format values between 1000 and 999999 with K', () => {
    expect(formatAscentCount(1000)).toBe('1K');
    expect(formatAscentCount(1040)).toBe('1K');
    expect(formatAscentCount(1050)).toBe('1.1K');
    expect(formatAscentCount(1400)).toBe('1.4K');
    expect(formatAscentCount(1500)).toBe('1.5K');
    expect(formatAscentCount(1999)).toBe('2K');
    expect(formatAscentCount(10000)).toBe('10K');
    expect(formatAscentCount(10500)).toBe('10.5K');
    expect(formatAscentCount(999400)).toBe('999.4K');
  });

  it('should format values above 1000000 with M', () => {
    expect(formatAscentCount(999960)).toBe('1M');
    expect(formatAscentCount(1000000)).toBe('1M');
    expect(formatAscentCount(1400000)).toBe('1.4M');
    expect(formatAscentCount(2500000)).toBe('2.5M');
  });
});
