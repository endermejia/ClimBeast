import { TestBed } from '@angular/core/testing';

import { describe, it, expect, beforeEach } from 'vitest';

import { Themes } from '../models';

import { MockSupabaseService } from '../testing';
import { SupabaseService } from './supabase.service';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: SupabaseService, useClass: MockSupabaseService },
      ],
    });
    service = TestBed.inject(ThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should default to light theme', () => {
    expect(service.theme()).toBe(Themes.LIGHT);
  });

  it('should set theme', () => {
    service.setTheme(Themes.DARK);
    expect(service.theme()).toBe(Themes.DARK);
  });

  it('should not set same theme', () => {
    service.setTheme(Themes.LIGHT);
    expect(service.theme()).toBe(Themes.LIGHT);
  });

  it('should expose readonly selectedTheme', () => {
    expect(service.selectedTheme()).toBe(Themes.LIGHT);
  });
});
