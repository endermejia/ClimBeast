import { describe, expect, it } from 'vitest';

import { calculateViewerMinScale } from './zoom-pan.utils';

describe('calculateViewerMinScale', () => {
  it('keeps a wide image from shrinking below the viewer width', () => {
    expect(calculateViewerMinScale(800, 600, 1600, 1200)).toBe(0.5);
  });

  it('keeps an image at its current scale when it already fits', () => {
    expect(calculateViewerMinScale(800, 600, 400, 600)).toBe(1);
  });

  it('uses the minimum floor when dimensions are unavailable', () => {
    expect(calculateViewerMinScale(0, 600, 1600, 1200)).toBe(0.1);
  });
});
