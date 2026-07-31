import { TestBed } from '@angular/core/testing';

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

  it('should emit on scrollToTop$', () => {
    let emitted = false;
    service.scrollToTop$.subscribe(() => {
      emitted = true;
    });
    service.scrollToTop();
    expect(emitted).toBe(true);
  });

  it('should emit multiple times', () => {
    let count = 0;
    service.scrollToTop$.subscribe(() => {
      count++;
    });
    service.scrollToTop();
    service.scrollToTop();
    service.scrollToTop();
    expect(count).toBe(3);
  });
});
