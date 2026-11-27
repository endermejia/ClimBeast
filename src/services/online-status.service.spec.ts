import { createEnvironmentInjector, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { IS_BROWSER } from '../app/is-browser';

import { OnlineStatusService } from './online-status.service';

describe('OnlineStatusService', () => {
  const originalOnLine = navigator.onLine;

  function setNavigatorOnLine(value: boolean): void {
    Object.defineProperty(navigator, 'onLine', {
      value,
      configurable: true,
    });
  }

  afterEach(() => {
    setNavigatorOnLine(originalOnLine);
    vi.restoreAllMocks();
  });

  it('always reports online (isOffline = false) on SSR and attaches no window listeners', () => {
    setNavigatorOnLine(false);
    const addSpy = vi.spyOn(window, 'addEventListener');

    TestBed.configureTestingModule({
      providers: [{ provide: IS_BROWSER, useValue: false }],
    });

    const service = TestBed.inject(OnlineStatusService);
    expect(service.isOffline()).toBe(false);
    expect(addSpy).not.toHaveBeenCalledWith('online', expect.any(Function));
    expect(addSpy).not.toHaveBeenCalledWith('offline', expect.any(Function));

    window.dispatchEvent(new Event('offline'));
    expect(service.isOffline()).toBe(false);
  });

  it('initializes from navigator.onLine when true in browser', () => {
    setNavigatorOnLine(true);

    TestBed.configureTestingModule({
      providers: [{ provide: IS_BROWSER, useValue: true }],
    });

    const service = TestBed.inject(OnlineStatusService);
    expect(service.isOffline()).toBe(false);
  });

  it('initializes from navigator.onLine when false in browser', () => {
    setNavigatorOnLine(false);

    TestBed.configureTestingModule({
      providers: [{ provide: IS_BROWSER, useValue: true }],
    });

    const service = TestBed.inject(OnlineStatusService);
    expect(service.isOffline()).toBe(true);
  });

  it('updates isOffline reactively on window offline and online events', () => {
    setNavigatorOnLine(true);

    TestBed.configureTestingModule({
      providers: [{ provide: IS_BROWSER, useValue: true }],
    });

    const service = TestBed.inject(OnlineStatusService);
    expect(service.isOffline()).toBe(false);

    window.dispatchEvent(new Event('offline'));
    expect(service.isOffline()).toBe(true);

    window.dispatchEvent(new Event('online'));
    expect(service.isOffline()).toBe(false);
  });

  it('removes window listeners when destroyed', () => {
    setNavigatorOnLine(true);
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    TestBed.configureTestingModule({
      providers: [{ provide: IS_BROWSER, useValue: true }],
    });

    const childInjector = createEnvironmentInjector(
      [OnlineStatusService],
      TestBed.inject(EnvironmentInjector),
    );
    const service = childInjector.get(OnlineStatusService);

    window.dispatchEvent(new Event('offline'));
    expect(service.isOffline()).toBe(true);

    childInjector.destroy();

    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    window.dispatchEvent(new Event('online'));
    expect(service.isOffline()).toBe(true);
  });
});
