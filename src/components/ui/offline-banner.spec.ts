import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideRouter } from '@angular/router';

import { OfflineBannerComponent } from './offline-banner';
import { GlobalData } from '../../services/global-data';
import { SupabaseService } from '../../services/supabase.service';
import { LocalStorage } from '../../services/local-storage';
import { IS_BROWSER } from '../../app/is-browser';
import {
  MockGlobalData,
  MockSupabaseService,
  MockLocalStorage,
} from '../../testing';

describe('OfflineBannerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfflineBannerComponent],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        { provide: GlobalData, useClass: MockGlobalData },
        { provide: SupabaseService, useClass: MockSupabaseService },
        { provide: LocalStorage, useClass: MockLocalStorage },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OfflineBannerComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
