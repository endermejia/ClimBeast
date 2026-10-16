import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { describe, expect, it, beforeEach } from 'vitest';

import { AscentsService } from '../services/ascents.service';
import { COMMON_TEST_PROVIDERS } from '../testing';

import { AscentInfoPipe } from './ascent-info.pipe';

@Component({
  standalone: true,
  imports: [AscentInfoPipe],
  template: ``,
})
class TestHostComponent {}

describe('AscentInfoPipe (with DI)', () => {
  let pipe: AscentInfoPipe;

  beforeEach(() => {
    const fixture = TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [...COMMON_TEST_PROVIDERS, AscentsService, AscentInfoPipe],
    }).createComponent(TestHostComponent);

    pipe = fixture.debugElement.injector.get(AscentInfoPipe);
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
