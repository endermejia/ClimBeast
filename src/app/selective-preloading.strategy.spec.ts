import { TestBed } from '@angular/core/testing';

import { firstValueFrom, of } from 'rxjs';
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

  it('should preload high demand routes like home and area', async () => {
    const fn = () => of('loaded');
    await expect(
      firstValueFrom(strategy.preload({ path: 'home' }, fn)),
    ).resolves.toBe('loaded');
    await expect(
      firstValueFrom(strategy.preload({ path: 'admin' }, fn)),
    ).resolves.toBe('loaded');
  });

  it('should not preload unrecognized routes without data.preload', async () => {
    const fn = () => of('loaded');
    await expect(
      firstValueFrom(strategy.preload({ path: 'unknown' }, fn)),
    ).resolves.toBeNull();
  });
});
