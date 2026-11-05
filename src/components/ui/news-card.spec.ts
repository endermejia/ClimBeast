import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { IS_BROWSER } from '../../app/is-browser';

import { NewsCardComponent } from './news-card';

import { NewsItem } from '../../models';

describe('NewsCardComponent', () => {
  const mockNewsItem: NewsItem = {
    kind: 'news',
    id: 101,
    title: 'Titulo noticia',
    link: 'https://www.desnivel.com/escalada/noticia-101',
    date: '2026-11-05T12:00:00Z',
    excerpt: '<p>Extracto</p>',
    image: 'https://www.desnivel.com/images/2026/11/foto.jpg',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewsCardComponent, TranslateModule.forRoot()],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
      ],
    }).compileComponents();
  });

  it('should create and rewrite image URL to /api/desnivel/', () => {
    const fixture = TestBed.createComponent(NewsCardComponent);
    fixture.componentRef.setInput('item', mockNewsItem);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.imageUrl()).toBe(
      '/api/desnivel/images/2026/11/foto.jpg',
    );
  });

  it('keeps already proxied image URLs', () => {
    const fixture = TestBed.createComponent(NewsCardComponent);
    fixture.componentRef.setInput('item', {
      ...mockNewsItem,
      image: '/api/desnivel/images/photo.jpg',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.imageUrl()).toBe(
      '/api/desnivel/images/photo.jpg',
    );
  });

  it('returns null when news item has no image', () => {
    const fixture = TestBed.createComponent(NewsCardComponent);
    fixture.componentRef.setInput('item', {
      ...mockNewsItem,
      image: undefined,
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.imageUrl()).toBeNull();
  });

  it('renders date using AscentDatePipe', () => {
    const fixture = TestBed.createComponent(NewsCardComponent);
    fixture.componentRef.setInput('item', mockNewsItem);
    fixture.detectChanges();

    const dateSpan = fixture.nativeElement.querySelector('header span.text-xs');
    expect(dateSpan?.textContent?.trim().length).toBeGreaterThan(0);
  });
});
