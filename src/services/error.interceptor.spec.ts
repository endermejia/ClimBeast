import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';

import { errorInterceptor } from './error.interceptor';
import { GlobalData } from './global-data';
import { SupabaseService } from './supabase.service';
import { MockGlobalData, MockSupabaseService } from '../testing';

describe('errorInterceptor', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: GlobalData, useClass: MockGlobalData },
        { provide: SupabaseService, useClass: MockSupabaseService },
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be provided', () => {
    expect(errorInterceptor).toBeDefined();
    expect(typeof errorInterceptor).toBe('function');
  });
});
