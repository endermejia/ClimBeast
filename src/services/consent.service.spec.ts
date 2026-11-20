import { TestBed } from '@angular/core/testing';

import type { SpeedInsightsProps } from '@vercel/speed-insights';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CONSENT_MAX_AGE_MS,
  CONSENT_VERSION,
  StoredConsentRecord,
} from '../models';

import { STORAGE_KEYS } from '../constants';

import { IS_BROWSER } from '../app/is-browser';
import { MockLocalStorage } from '../testing';
import {
  ConsentService,
  SPEED_INSIGHTS_INJECTOR,
  SpeedInsightsInjector,
} from './consent.service';
import { LocalStorage } from './local-storage';

describe('ConsentService', () => {
  let storage: MockLocalStorage;
  let speedInsightsSpy: ReturnType<typeof vi.fn<SpeedInsightsInjector>>;

  function configure(isBrowser = true): ConsentService {
    TestBed.configureTestingModule({
      providers: [
        { provide: IS_BROWSER, useValue: isBrowser },
        { provide: LocalStorage, useValue: storage },
        { provide: SPEED_INSIGHTS_INJECTOR, useValue: speedInsightsSpy },
      ],
    });
    const service = TestBed.inject(ConsentService);
    TestBed.flushEffects();
    return service;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    storage = new MockLocalStorage();
    speedInsightsSpy = vi.fn<SpeedInsightsInjector>().mockReturnValue(null);
  });

  it('defaults to undecided with all optional categories disabled and does not load Speed Insights', () => {
    const service = configure();

    expect(service.hasDecided()).toBe(false);
    expect(service.analyticsAllowed()).toBe(false);
    expect(service.externalMediaAllowed()).toBe(false);
    expect(service.preferences()).toEqual({
      necessary: true,
      analytics: false,
      externalMedia: false,
    });
    expect(speedInsightsSpy).not.toHaveBeenCalled();
  });

  it('persists acceptAll, removes legacy key, and injects Speed Insights', () => {
    storage.setItem(STORAGE_KEYS.gdprAccepted, 'true');
    const service = configure();

    service.acceptAll();
    TestBed.flushEffects();

    expect(service.hasDecided()).toBe(true);
    expect(service.analyticsAllowed()).toBe(true);
    expect(service.externalMediaAllowed()).toBe(true);
    expect(storage.getItem(STORAGE_KEYS.gdprAccepted)).toBeNull();
    expect(storage.getItem(STORAGE_KEYS.cookieConsent)).toBeTruthy();
    expect(speedInsightsSpy).toHaveBeenCalledTimes(1);
  });

  it('persists rejectAll without injecting Speed Insights', () => {
    const service = configure();

    service.rejectAll();
    TestBed.flushEffects();

    expect(service.hasDecided()).toBe(true);
    expect(service.analyticsAllowed()).toBe(false);
    expect(service.externalMediaAllowed()).toBe(false);
    expect(speedInsightsSpy).not.toHaveBeenCalled();
  });

  it('cancels Speed Insights events via beforeSend when analytics consent is revoked', () => {
    let capturedProps: SpeedInsightsProps | undefined;
    speedInsightsSpy.mockImplementation((props) => {
      capturedProps = props;
      return null;
    });

    const service = configure();
    service.updatePreferences({ analytics: true, externalMedia: false });
    TestBed.flushEffects();

    expect(speedInsightsSpy).toHaveBeenCalledTimes(1);
    const sampleEvent = {
      type: 'vital' as const,
      url: 'https://climbeast.com',
    };
    expect(capturedProps?.beforeSend?.(sampleEvent)).toEqual(sampleEvent);

    // Revoke analytics in same session
    service.updatePreferences({ analytics: false });
    TestBed.flushEffects();

    expect(service.analyticsAllowed()).toBe(false);
    expect(capturedProps?.beforeSend?.(sampleEvent)).toBeNull();
    // Does not re-inject script
    expect(speedInsightsSpy).toHaveBeenCalledTimes(1);
  });

  it('restores valid stored consent on startup and initializes Speed Insights if analytics was accepted', () => {
    const stored: StoredConsentRecord = {
      necessary: true,
      analytics: true,
      externalMedia: false,
      version: CONSENT_VERSION,
      timestamp: Date.now() - 1000,
    };
    storage.setItem(STORAGE_KEYS.cookieConsent, JSON.stringify(stored));

    const service = configure();

    expect(service.hasDecided()).toBe(true);
    expect(service.analyticsAllowed()).toBe(true);
    expect(service.externalMediaAllowed()).toBe(false);
    expect(speedInsightsSpy).toHaveBeenCalledTimes(1);
  });

  it('ignores and cleans up expired consent (> 24 months)', () => {
    const expired: StoredConsentRecord = {
      necessary: true,
      analytics: true,
      externalMedia: true,
      version: CONSENT_VERSION,
      timestamp: Date.now() - CONSENT_MAX_AGE_MS - 1000,
    };
    storage.setItem(STORAGE_KEYS.cookieConsent, JSON.stringify(expired));

    const service = configure();

    expect(service.hasDecided()).toBe(false);
    expect(service.analyticsAllowed()).toBe(false);
    expect(storage.getItem(STORAGE_KEYS.cookieConsent)).toBeNull();
    expect(speedInsightsSpy).not.toHaveBeenCalled();
  });

  it('treats outdated policy version as undecided', () => {
    const oldVersion: StoredConsentRecord = {
      necessary: true,
      analytics: true,
      externalMedia: true,
      version: '2020-01-01',
      timestamp: Date.now(),
    };
    storage.setItem(STORAGE_KEYS.cookieConsent, JSON.stringify(oldVersion));

    const service = configure();

    expect(service.hasDecided()).toBe(false);
    expect(speedInsightsSpy).not.toHaveBeenCalled();
  });

  it('is SSR-safe and never injects Speed Insights on server', () => {
    const stored: StoredConsentRecord = {
      necessary: true,
      analytics: true,
      externalMedia: true,
      version: CONSENT_VERSION,
      timestamp: Date.now(),
    };
    storage.setItem(STORAGE_KEYS.cookieConsent, JSON.stringify(stored));

    const service = configure(false);

    expect(service.hasDecided()).toBe(false);
    expect(speedInsightsSpy).not.toHaveBeenCalled();
  });
});
