import { describe, expect, it } from 'vitest';

import { toProxiedDesnivelUrl } from './desnivel.utils';

describe('toProxiedDesnivelUrl', () => {
  it('rewrites https://www.desnivel.com URLs to /api/desnivel/', () => {
    expect(
      toProxiedDesnivelUrl(
        'https://www.desnivel.com/images/2026/11/alexa-frame-16.jpg',
      ),
    ).toBe('/api/desnivel/images/2026/11/alexa-frame-16.jpg');
  });

  it('rewrites http://desnivel.com URLs without www to /api/desnivel/', () => {
    expect(
      toProxiedDesnivelUrl(
        'http://desnivel.com/images/2026/11/alexa-frame-16-750x440.jpg',
      ),
    ).toBe('/api/desnivel/images/2026/11/alexa-frame-16-750x440.jpg');
  });

  it('leaves already proxied /api/desnivel URLs untouched', () => {
    expect(
      toProxiedDesnivelUrl('/api/desnivel/images/2026/11/alexa-frame-16.jpg'),
    ).toBe('/api/desnivel/images/2026/11/alexa-frame-16.jpg');
  });

  it('leaves other domain URLs untouched', () => {
    expect(toProxiedDesnivelUrl('https://example.com/photo.jpg')).toBe(
      'https://example.com/photo.jpg',
    );
  });

  it('returns undefined for empty, null, or undefined input', () => {
    expect(toProxiedDesnivelUrl('')).toBeUndefined();
    expect(toProxiedDesnivelUrl(null)).toBeUndefined();
    expect(toProxiedDesnivelUrl(undefined)).toBeUndefined();
  });
});
