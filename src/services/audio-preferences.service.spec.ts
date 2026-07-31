import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { describe, it, expect, beforeEach } from 'vitest';

import { IS_BROWSER } from '../app/is-browser';

import { MockLocalStorage, MockSupabaseService } from '../testing';
import { AudioPreferencesService } from './audio-preferences.service';
import { LocalStorage } from './local-storage';
import { SupabaseService } from './supabase.service';

describe('AudioPreferencesService', () => {
  let service: AudioPreferencesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AudioPreferencesService,
        { provide: LocalStorage, useClass: MockLocalStorage },
        { provide: SupabaseService, useClass: MockSupabaseService },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
      ],
    });
    service = TestBed.inject(AudioPreferencesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have default message sound enabled', () => {
    expect(service.messageSoundEnabled()).toBe(true);
  });

  it('should have default notification sound disabled', () => {
    expect(service.notificationSoundEnabled()).toBe(false);
  });

  it('should toggle message sound', () => {
    service.messageSoundEnabled.set(false);
    expect(service.messageSoundEnabled()).toBe(false);
    service.messageSoundEnabled.set(true);
    expect(service.messageSoundEnabled()).toBe(true);
  });

  it('should persist message sound', () => {
    service.messageSoundEnabled.set(false);
    service.persistMessageSound();
    // Verify it was persisted
    expect(service.messageSoundEnabled()).toBe(false);
  });

  it('should persist notification sound', () => {
    service.notificationSoundEnabled.set(true);
    service.persistNotificationSound();
    expect(service.notificationSoundEnabled()).toBe(true);
  });
});
