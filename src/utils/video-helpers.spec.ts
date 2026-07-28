import { describe, it, expect } from 'vitest';

import {
  extractYoutubeId,
  getEmbedUrl,
  getThumbnailUrl,
} from './video-helpers';

describe('extractYoutubeId', () => {
  it('extracts id from youtu.be short URL', () => {
    expect(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    );
  });

  it('extracts id from youtube.com watch URL', () => {
    expect(
      extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    ).toBe('dQw4w9WgXcQ');
  });

  it('extracts id from youtube.com embed URL', () => {
    expect(extractYoutubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    );
  });

  it('extracts id from youtube.com v/ URL', () => {
    expect(extractYoutubeId('https://www.youtube.com/v/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    );
  });

  it('extracts id from youtube.com short watch URL', () => {
    expect(extractYoutubeId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    );
  });

  it('extracts id with query params', () => {
    expect(
      extractYoutubeId(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120s&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
      ),
    ).toBe('dQw4w9WgXcQ');
  });

  it('returns null for invalid URL', () => {
    expect(extractYoutubeId('https://example.com/video')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractYoutubeId('')).toBeNull();
  });

  it('returns null for URL with too short ID', () => {
    expect(extractYoutubeId('https://youtu.be/abc')).toBeNull();
  });
});

describe('getEmbedUrl', () => {
  it('returns embed URL for valid YouTube URL', () => {
    expect(getEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    );
  });

  it('returns null for invalid URL', () => {
    expect(getEmbedUrl('https://example.com')).toBeNull();
  });
});

describe('getThumbnailUrl', () => {
  it('returns thumbnail URL for valid YouTube URL', () => {
    expect(getThumbnailUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg',
    );
  });

  it('returns null for invalid URL', () => {
    expect(getThumbnailUrl('not-a-url')).toBeNull();
  });
});
