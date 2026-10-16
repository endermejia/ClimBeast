import { TestBed } from '@angular/core/testing';

import { beforeEach, describe, expect, it } from 'vitest';

import { AscentsService } from '../services/ascents.service';

import { COMMON_TEST_PROVIDERS } from '../testing';
import { AscentInfoPipe } from './ascent-info.pipe';

describe('AscentInfoPipe', () => {
  let pipe: AscentInfoPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...COMMON_TEST_PROVIDERS, AscentsService, AscentInfoPipe],
    });

    pipe = TestBed.inject(AscentInfoPipe);
  });

  it('returns default ascent info for null or undefined input', () => {
    const resultNull = pipe.transform(null);
    expect(resultNull).toBeDefined();
    expect(resultNull.icon).toBeDefined();
    expect(resultNull.background).toBeDefined();

    const resultUndefined = pipe.transform(undefined);
    expect(resultUndefined).toEqual(resultNull);
  });

  it('returns specific ascent info for known ascent types', () => {
    const rpInfo = pipe.transform('rp');
    expect(rpInfo.icon).toBe('@tui.circle');
    expect(rpInfo.background).toBe('var(--tui-status-negative)');

    const flashInfo = pipe.transform('f');
    expect(flashInfo.icon).toBe('@tui.zap');
    expect(flashInfo.background).toBe('var(--tui-status-warning)');
  });

  it('falls back to default for unknown ascent type', () => {
    const unknownInfo = pipe.transform('unknown_type');
    const defaultInfo = pipe.transform('default');
    expect(unknownInfo).toEqual(defaultInfo);
  });
});
