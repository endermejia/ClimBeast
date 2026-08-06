import { TestBed } from '@angular/core/testing';

import { of } from 'rxjs';
import { describe, it, expect, beforeEach } from 'vitest';

import { SelectivePreloadingStrategy } from './selective-preloading.strategy';

describe('SelectivePreloadingStrategy', () => {
  let strategy: SelectivePreloadingStrategy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SelectivePreloadingStrategy],
    });
    strategy = TestBed.inject(SelectivePreloadingStrategy);
  });

  it('should be created', () => {
    expect(strategy).toBeTruthy();
  });

  it('should preload high demand routes like home and area', () => {
    const fn = () => of('loaded');
    strategy.preload({ path: 'home' }, fn).subscribe((val) => {
      expect(val).toBe('loaded');
    });
    strategy.preload({ path: 'admin' }, fn).subscribe((val) => {
      expect(val).toBe('loaded');
    });
  });

  it('should not preload unrecognized routes without data.preload', () => {
    const fn = () => of('loaded');
    strategy.preload({ path: 'unknown' }, fn).subscribe((val) => {
      expect(val).toBeNull();
    });
  });
});
