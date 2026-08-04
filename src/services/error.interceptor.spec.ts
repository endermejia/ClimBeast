import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { IS_BROWSER } from '../app/is-browser';

import { MockSupabaseService } from '../testing';
import { errorInterceptor } from './error.interceptor';
import { SupabaseService } from './supabase.service';

describe('errorInterceptor', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseService, useClass: MockSupabaseService },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
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
