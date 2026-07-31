import { DOCUMENT, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';

import { describe, it, expect, beforeEach } from 'vitest';

import { IS_BROWSER } from '../app/is-browser';

import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let meta: Meta;
  let title: Title;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SeoService,
        Meta,
        Title,
        { provide: DOCUMENT, useValue: document },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
      ],
    });
    service = TestBed.inject(SeoService);
    meta = TestBed.inject(Meta);
    title = TestBed.inject(Title);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set page title', () => {
    service.setPage({ title: 'Test Page' });
    expect(title.getTitle()).toBeTruthy();
  });

  it('should update meta description', () => {
    service.setPage({ title: 'Test', description: 'Test description' });
    const tag = meta.getTag('name="description"');
    expect(tag?.getAttribute('content')).toBe('Test description');
  });

  it('should set OG tags', () => {
    service.setPage({
      title: 'Test',
      description: 'Description',
      imageUrl: 'https://example.com/image.png',
    });
    const ogImage = meta.getTag('property="og:image"');
    expect(ogImage?.getAttribute('content')).toBe(
      'https://example.com/image.png',
    );
  });

  it('should set canonical URL', () => {
    service.setPage({
      title: 'Test',
      canonicalUrl: 'https://example.com/page',
    });
    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute('href')).toBe('https://example.com/page');
  });
});
