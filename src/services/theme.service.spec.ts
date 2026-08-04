import { TestBed } from '@angular/core/testing';

import { describe, it, expect, beforeEach } from 'vitest';

import { Themes } from '../models';

import { COMMON_TEST_PROVIDERS } from '../testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ThemeService, ...COMMON_TEST_PROVIDERS],
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
