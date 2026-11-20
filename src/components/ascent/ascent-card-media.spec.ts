import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TuiDialogService } from '@taiga-ui/core';

import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AscentsService } from '../../services/ascents.service';
import {
  ConsentService,
  SPEED_INSIGHTS_INJECTOR,
} from '../../services/consent.service';
import { LocalStorage } from '../../services/local-storage';
import { SupabaseService } from '../../services/supabase.service';

import { IS_BROWSER } from '../../app/is-browser';
import { MockLocalStorage, MockSupabaseService } from '../../testing';
import { AscentCardMediaComponent } from './ascent-card-media';

describe('AscentCardMediaComponent (YouTube consent gating & progressive photo loading)', () => {
  let storage: MockLocalStorage;
  let consent: ConsentService;
  let mockAscentsService: {
    backfillPhotoMetadata: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    storage = new MockLocalStorage();
    mockAscentsService = {
      backfillPhotoMetadata: vi.fn().mockResolvedValue(null),
    };

    await TestBed.configureTestingModule({
      imports: [AscentCardMediaComponent, TranslateModule.forRoot()],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        { provide: LocalStorage, useValue: storage },
        { provide: SPEED_INSIGHTS_INJECTOR, useValue: vi.fn() },
        { provide: SupabaseService, useClass: MockSupabaseService },
        { provide: AscentsService, useValue: mockAscentsService },
        {
          provide: TuiDialogService,
          useValue: { open: vi.fn().mockReturnValue(of(false)) },
        },
      ],
    }).compileComponents();

    consent = TestBed.inject(ConsentService);
  });

  it('blocks YouTube iframe before external media consent is granted', async () => {
    const fixture = TestBed.createComponent(AscentCardMediaComponent);
    fixture.componentRef.setInput('videoUrl', 'https://youtu.be/dQw4w9WgXcQ');
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('iframe')).toBeNull();
    expect(el.textContent).toContain('cookies.youtubeBlockedTitle');
  });

  it('auto-loads youtube-nocookie iframe when external media consent is granted', async () => {
    consent.acceptAll();

    const fixture = TestBed.createComponent(AscentCardMediaComponent);
    fixture.componentRef.setInput('videoUrl', 'https://youtu.be/dQw4w9WgXcQ');
    fixture.detectChanges();
    await fixture.whenStable();

    const iframe = (fixture.nativeElement as HTMLElement).querySelector(
      'iframe',
    );
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('src')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
  });

  it('mounts iframe on demand for a single card without changing global consent', async () => {
    const fixture = TestBed.createComponent(AscentCardMediaComponent);
    fixture.componentRef.setInput('videoUrl', 'https://youtu.be/dQw4w9WgXcQ');
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    );
    const loadOnceBtn = buttons.find((b) =>
      b.textContent?.includes('cookies.youtubeLoadOnce'),
    );
    expect(loadOnceBtn).toBeTruthy();

    loadOnceBtn?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('iframe'),
    ).not.toBeNull();
    expect(consent.externalMediaAllowed()).toBe(false);
    expect(consent.hasDecided()).toBe(false);
  });

  it('persists externalMedia consent and mounts iframe when clicking enable always', async () => {
    const fixture = TestBed.createComponent(AscentCardMediaComponent);
    fixture.componentRef.setInput('videoUrl', 'https://youtu.be/dQw4w9WgXcQ');
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    );
    const enableAlwaysBtn = buttons.find((b) =>
      b.textContent?.includes('cookies.youtubeEnableAlways'),
    );
    expect(enableAlwaysBtn).toBeTruthy();

    enableAlwaysBtn?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(consent.externalMediaAllowed()).toBe(true);
    expect(consent.hasDecided()).toBe(true);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('iframe'),
    ).not.toBeNull();
  });

  it('reserves exact photo aspect ratio, renders blurred LQIP + skeleton while loading, and sharpens on load', async () => {
    const mockSupabase = TestBed.inject(SupabaseService);
    vi.spyOn(mockSupabase, 'getAscentSignedUrl').mockResolvedValue(
      'https://example.com/signed-photo.webp',
    );

    const lqipDataUri = 'data:image/webp;base64,UklGRiQAAABXRUJQ';
    const fixture = TestBed.createComponent(AscentCardMediaComponent);
    fixture.componentRef.setInput('ascentId', 22440);
    fixture.componentRef.setInput('photoPath', 'user-1/22440.webp');
    fixture.componentRef.setInput('photoWidth', 1200);
    fixture.componentRef.setInput('photoHeight', 1500);
    fixture.componentRef.setInput('photoLqip', lqipDataUri);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const imgs = Array.from(el.querySelectorAll('img'));
    expect(imgs.length).toBe(2);

    const lqipImg = imgs[0];
    const mainImg = imgs[1];

    // Wrapper reserves exact 1200 / 1500 aspect ratio
    const wrapper = mainImg.parentElement as HTMLElement;
    expect(wrapper.style.aspectRatio).toContain('1200');
    expect(wrapper.style.aspectRatio).toContain('1500');

    // Before load: LQIP is visible, skeleton is present, main image is blurred/transparent
    expect(lqipImg.getAttribute('src')).toBe(lqipDataUri);
    expect(lqipImg.classList.contains('opacity-0')).toBe(false);
    expect(el.querySelector('[tuiSkeleton]')).not.toBeNull();
    expect(mainImg.classList.contains('opacity-0')).toBe(true);
    expect(mainImg.classList.contains('blur-md')).toBe(true);

    // Simulate image load completion
    mainImg.dispatchEvent(new Event('load'));
    fixture.detectChanges();

    // After load: main image is sharp & opaque, LQIP fades out, skeleton removed
    expect(mainImg.classList.contains('opacity-0')).toBe(false);
    expect(mainImg.classList.contains('blur-md')).toBe(false);
    expect(lqipImg.classList.contains('opacity-0')).toBe(true);
    expect(el.querySelector('[tuiSkeleton]')).toBeNull();
    expect(mockAscentsService.backfillPhotoMetadata).not.toHaveBeenCalled();
  });

  it('triggers self-healing backfillPhotoMetadata when legacy photo has no stored dimensions or LQIP', async () => {
    const mockSupabase = TestBed.inject(SupabaseService);
    vi.spyOn(mockSupabase, 'getAscentSignedUrl').mockResolvedValue(
      'https://example.com/legacy-photo.webp',
    );

    const fixture = TestBed.createComponent(AscentCardMediaComponent);
    fixture.componentRef.setInput('ascentId', 21536);
    fixture.componentRef.setInput('photoPath', 'user-1/21536.webp');

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const mainImg = el.querySelector('img') as HTMLImageElement;
    expect(mainImg).not.toBeNull();

    mainImg.dispatchEvent(new Event('load'));
    fixture.detectChanges();

    expect(mockAscentsService.backfillPhotoMetadata).toHaveBeenCalledWith(
      21536,
      false,
      'https://example.com/legacy-photo.webp',
    );
  });
});
