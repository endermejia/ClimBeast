import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';

import { FilterStateService } from './filter-state.service';
import { LocalStorage } from './local-storage';
import { MockLocalStorage } from '../testing';
import { ORDERED_GRADE_VALUES } from '../models';

describe('FilterStateService', () => {
  let service: FilterStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FilterStateService,
        { provide: LocalStorage, useClass: MockLocalStorage },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    service = TestBed.inject(FilterStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have default area list grade range', () => {
    expect(service.areaListGradeRange()).toEqual([
      0,
      ORDERED_GRADE_VALUES.length - 1,
    ]);
  });

  it('should have default feed grade range', () => {
    expect(service.feedGradeRange()).toEqual([
      0,
      ORDERED_GRADE_VALUES.length - 1,
    ]);
  });

  it('should have default empty categories', () => {
    expect(service.areaListCategories()).toEqual([]);
    expect(service.feedCategories()).toEqual([]);
  });

  it('should have default indoor/outdoor', () => {
    expect(service.areaListShowIndoor()).toBe(false);
    expect(service.areaListShowOutdoor()).toBe(true);
  });

  it('should set grade range', () => {
    service.areaListGradeRange.set([10, 25]);
    expect(service.areaListGradeRange()).toEqual([10, 25]);
  });

  it('should set categories', () => {
    service.areaListCategories.set([0, 1]);
    expect(service.areaListCategories()).toEqual([0, 1]);
  });
});
