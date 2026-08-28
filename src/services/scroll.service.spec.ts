import { TestBed } from '@angular/core/testing';

import { lastValueFrom, take } from 'rxjs';

import { describe, it, expect, beforeEach } from 'vitest';

import { ScrollService } from './scroll.service';

describe('ScrollService', () => {
  let service: ScrollService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ScrollService],
    });
    service = TestBed.inject(ScrollService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should emit on scrollToTop$', async () => {
    const emitted = lastValueFrom(service.scrollToTop$.pipe(take(1)));
    service.scrollToTop();
    await expect(emitted).resolves.toBeUndefined();
  });

  it('should emit multiple times', async () => {
    const emitted = lastValueFrom(service.scrollToTop$.pipe(take(3)));
    service.scrollToTop();
    service.scrollToTop();
    service.scrollToTop();
    await expect(emitted).resolves.toBeUndefined();
  });
});
