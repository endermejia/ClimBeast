import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TuiDialogService } from '@taiga-ui/core';

import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ConsentService,
  SPEED_INSIGHTS_INJECTOR,
} from '../../services/consent.service';
import { LocalStorage } from '../../services/local-storage';
import { SupabaseService } from '../../services/supabase.service';

import { IS_BROWSER } from '../../app/is-browser';
import { MockLocalStorage, MockSupabaseService } from '../../testing';
import { AscentCardMediaComponent } from './ascent-card-media';

describe('AscentCardMediaComponent (YouTube consent gating)', () => {
  let storage: MockLocalStorage;
  let consent: ConsentService;

  beforeEach(async () => {
    storage = new MockLocalStorage();

    await TestBed.configureTestingModule({
      imports: [AscentCardMediaComponent, TranslateModule.forRoot()],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        { provide: LocalStorage, useValue: storage },
        { provide: SPEED_INSIGHTS_INJECTOR, useValue: vi.fn() },
        { provide: SupabaseService, useClass: MockSupabaseService },
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
});
