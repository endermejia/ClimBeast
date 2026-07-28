import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CdkDragDrop } from '@angular/cdk/drag-drop';

import {
  fileToDataUrl,
  reorderGallery,
  createNewPhoto,
  COMMON_IMAGE_EDITOR_CONFIG,
} from './image-gallery.utils';

describe('fileToDataUrl', () => {
  it('resolves with data URL string', async () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const result = await fileToDataUrl(file);
    expect(result).toContain('data:image/png');
  });

  it('rejects on read error', async () => {
    const file = new File([''], 'bad.png', { type: 'image/png' });
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(
      function (this: FileReader) {
        setTimeout(
          () => (this.onerror as EventListener)?.(new ProgressEvent('error')),
          0,
        );
        return undefined as unknown as void;
      },
    );
    await expect(fileToDataUrl(file)).rejects.toBeDefined();
  });
});

describe('reorderGallery', () => {
  const photo1 = {
    id: '1',
    file: new File([''], 'a.png'),
    preview: 'preview1',
  };
  const photo2 = {
    id: '2',
    file: new File([''], 'b.png'),
    preview: 'preview2',
  };

  it('moves an existing image within imageUrls', () => {
    const event = {
      previousIndex: 0,
      currentIndex: 1,
    } as CdkDragDrop<unknown[]>;

    const result = reorderGallery(event, ['url1', 'url2', 'url3'], []);

    expect(result.imageUrls).toEqual(['url2', 'url1', 'url3']);
    expect(result.newPhotos).toEqual([]);
  });

  it('moves a new photo within newPhotos', () => {
    const event = {
      previousIndex: 0,
      currentIndex: 1,
    } as CdkDragDrop<unknown[]>;

    const result = reorderGallery(event, [], [photo1, photo2]);

    expect(result.imageUrls).toEqual([]);
    expect(result.newPhotos).toEqual([photo2, photo1]);
  });

  it('moves item from existing to new section', () => {
    const event = {
      previousIndex: 0,
      currentIndex: 2,
    } as CdkDragDrop<unknown[]>;

    const result = reorderGallery(event, ['url1'], [photo1]);

    // Combined: [existing(url1), new(photo1)]
    // Move index 0 to index 2 would clamp to index 1
    expect(result.imageUrls.length + result.newPhotos.length).toBe(2);
  });

  it('handles empty arrays', () => {
    const event = {
      previousIndex: 0,
      currentIndex: 0,
    } as CdkDragDrop<unknown[]>;

    const result = reorderGallery(event, [], []);

    expect(result.imageUrls).toEqual([]);
    expect(result.newPhotos).toEqual([]);
  });
});

describe('createNewPhoto', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-uuid-123',
    });
  });

  it('creates a NewPhoto with generated id', () => {
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    const result = createNewPhoto(file, 'data:preview');

    expect(result).toEqual({
      id: 'test-uuid-123',
      file,
      preview: 'data:preview',
    });
  });
});

describe('COMMON_IMAGE_EDITOR_CONFIG', () => {
  it('has three aspect ratios', () => {
    expect(COMMON_IMAGE_EDITOR_CONFIG.aspectRatios).toHaveLength(3);
  });

  it('has correct ratios', () => {
    expect(COMMON_IMAGE_EDITOR_CONFIG.aspectRatios[0].ratio).toBe(1);
    expect(COMMON_IMAGE_EDITOR_CONFIG.aspectRatios[1].ratio).toBeCloseTo(4 / 3);
    expect(COMMON_IMAGE_EDITOR_CONFIG.aspectRatios[2].ratio).toBeCloseTo(
      16 / 9,
    );
  });

  it('allows free aspect ratio', () => {
    expect(COMMON_IMAGE_EDITOR_CONFIG.allowFree).toBe(true);
  });

  it('has resize and quality settings', () => {
    expect(COMMON_IMAGE_EDITOR_CONFIG.resizeToWidth).toBe(1000);
    expect(COMMON_IMAGE_EDITOR_CONFIG.imageQuality).toBe(75);
  });
});
