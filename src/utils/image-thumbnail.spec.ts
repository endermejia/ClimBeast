import { describe, expect, it, vi } from 'vitest';

import { extractPhotoMetadata, generateThumbnail } from './image-thumbnail';

describe('generateThumbnail', () => {
  it('falls back to original file on image load error or timeout', async () => {
    const file = new File(['mock'], 'sample.png', { type: 'image/png' });

    const originalImage = window.Image;
    class ErrorImage {
      onload: (() => void) | null = null;
      onerror: ((err: unknown) => void) | null = null;
      set src(_val: string) {
        setTimeout(() => this.onerror?.(new Error('Mock load failure')), 5);
      }
    }
    (window as unknown as { Image: unknown }).Image = ErrorImage;

    try {
      const result = await generateThumbnail(file);
      expect(result).toBeDefined();
      expect(result.file).toBe(file);
      expect(result.base64).toBe('');
    } finally {
      (window as unknown as { Image: unknown }).Image = originalImage;
    }
  });

  it('generates thumbnail when canvas and image succeed', async () => {
    const file = new File(['mock'], 'photo.jpg', { type: 'image/jpeg' });

    // Mock Image
    const originalImage = window.Image;
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 1200;
      height = 800;
      set src(_val: string) {
        setTimeout(() => this.onload?.(), 5);
      }
    }
    (window as unknown as { Image: unknown }).Image = MockImage;

    // Mock Canvas toBlob and getContext
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(
      (tagName: string) => {
        if (tagName === 'canvas') {
          const canvas = originalCreateElement('canvas');
          canvas.getContext = vi.fn().mockReturnValue({
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
            drawImage: vi.fn(),
          } as unknown as CanvasRenderingContext2D);
          canvas.toBlob = (callback: BlobCallback) => {
            callback(new Blob(['thumb'], { type: 'image/webp' }));
          };
          return canvas;
        }
        return originalCreateElement(tagName);
      },
    );

    try {
      const result = await generateThumbnail(file);
      expect(result.file.name).toBe('photo_thumb.webp');
      expect(result.file.type).toBe('image/webp');
      expect(result.base64).toContain('data:image/webp;base64');
    } finally {
      (window as unknown as { Image: unknown }).Image = originalImage;
      vi.restoreAllMocks();
    }
  });
});

describe('extractPhotoMetadata', () => {
  it('returns dimensions and WebP LQIP data URI for valid image blob', async () => {
    const file = new File(['mock'], 'photo.webp', { type: 'image/webp' });

    const originalImage = window.Image;
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 1200;
      naturalHeight = 1500;
      width = 1200;
      height = 1500;
      set src(_val: string) {
        setTimeout(() => this.onload?.(), 5);
      }
    }
    (window as unknown as { Image: unknown }).Image = MockImage;

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(
      (tagName: string) => {
        if (tagName === 'canvas') {
          const canvas = originalCreateElement('canvas');
          canvas.getContext = vi.fn().mockReturnValue({
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'medium',
            drawImage: vi.fn(),
          } as unknown as CanvasRenderingContext2D);
          canvas.toDataURL = vi
            .fn()
            .mockReturnValue('data:image/webp;base64,UklGRiQAAABXRUJQ');
          return canvas;
        }
        return originalCreateElement(tagName);
      },
    );

    try {
      const meta = await extractPhotoMetadata(file);
      expect(meta).toEqual({
        width: 1200,
        height: 1500,
        lqip: 'data:image/webp;base64,UklGRiQAAABXRUJQ',
      });
    } finally {
      (window as unknown as { Image: unknown }).Image = originalImage;
      vi.restoreAllMocks();
    }
  });

  it('returns null when image fails to load', async () => {
    const file = new File(['mock'], 'broken.webp', { type: 'image/webp' });

    const originalImage = window.Image;
    class ErrorImage {
      onload: (() => void) | null = null;
      onerror: ((err: unknown) => void) | null = null;
      set src(_val: string) {
        setTimeout(() => this.onerror?.(new Error('Load failed')), 5);
      }
    }
    (window as unknown as { Image: unknown }).Image = ErrorImage;

    try {
      const meta = await extractPhotoMetadata(file);
      expect(meta).toBeNull();
    } finally {
      (window as unknown as { Image: unknown }).Image = originalImage;
    }
  });
});
