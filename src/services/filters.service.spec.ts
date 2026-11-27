import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TuiDialogService } from '@taiga-ui/core';

import { TranslateService } from '@ngx-translate/core';
import { EMPTY, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FilterDialog } from '../components/dialogs/filter-dialog';

import { ORDERED_GRADE_VALUES } from '../models';

import { IS_BROWSER } from '../app/is-browser';
import { MockLocalStorage } from '../testing';
import { FilterStateService } from './filter-state.service';
import { FiltersService } from './filters.service';
import { LocalStorage } from './local-storage';

const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('FiltersService', () => {
  let service: FiltersService;
  let filterState: FilterStateService;
  let dialogOpenSpy: ReturnType<typeof vi.fn>;
  let translateInstantSpy: ReturnType<typeof vi.fn>;
  const maxIndex = ORDERED_GRADE_VALUES.length - 1;

  beforeEach(() => {
    dialogOpenSpy = vi.fn();
    translateInstantSpy = vi.fn((key: string) => key);

    TestBed.configureTestingModule({
      providers: [
        FiltersService,
        FilterStateService,
        { provide: LocalStorage, useClass: MockLocalStorage },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        { provide: TuiDialogService, useValue: { open: dialogOpenSpy } },
        {
          provide: TranslateService,
          useValue: { instant: translateInstantSpy },
        },
      ],
    });

    service = TestBed.inject(FiltersService);
    filterState = TestBed.inject(FilterStateService);
  });

  describe('openFilters', () => {
    it('passes current area list state and default visibility flags to the dialog', async () => {
      filterState.areaListCategories.set([0, 1]);
      filterState.areaListGradeRange.set([4, 12]);
      filterState.areaListShade.set(['shade_morning']);
      filterState.areaListShowIndoor.set(true);
      filterState.areaListShowOutdoor.set(true);
      filterState.areaListToposOnly.set(true);

      dialogOpenSpy.mockReturnValue(EMPTY);

      service.openFilters();
      await flushAsync();

      expect(translateInstantSpy).toHaveBeenCalledWith('filters');
      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      const [, options] = dialogOpenSpy.mock.calls[0];
      expect(options).toMatchObject({
        label: 'filters',
        size: 'l',
        dismissible: false,
        data: {
          categories: [0, 1],
          gradeRange: [4, 12],
          selectedShade: ['shade_morning'],
          indoor: true,
          outdoor: true,
          toposOnly: true,
          showCategories: true,
          showShade: true,
          showGradeRange: true,
          showIndoorOutdoor: false,
          showToposOnly: false,
        },
      });
    });

    it('forwards explicit visibility option overrides', async () => {
      dialogOpenSpy.mockReturnValue(EMPTY);

      service.openFilters({
        showShade: false,
        showCategories: false,
        showGradeRange: false,
        showIndoorOutdoor: true,
        showToposOnly: true,
      });
      await flushAsync();

      const [, options] = dialogOpenSpy.mock.calls[0];
      expect(options.data).toMatchObject({
        showShade: false,
        showCategories: false,
        showGradeRange: false,
        showIndoorOutdoor: true,
        showToposOnly: true,
      });
    });

    it('updates all area list signals and clamps/sorts gradeRange on apply', async () => {
      const dialogResult: FilterDialog = {
        categories: [2],
        gradeRange: [999.4, -5.6],
        selectedShade: ['shade_afternoon', 'sun_all_day'],
        indoor: true,
        outdoor: false,
        toposOnly: true,
      };
      dialogOpenSpy.mockReturnValue(of(dialogResult));

      service.openFilters();
      await flushAsync();

      expect(filterState.areaListGradeRange()).toEqual([0, maxIndex]);
      expect(filterState.areaListCategories()).toEqual([2]);
      expect(filterState.areaListShade()).toEqual([
        'shade_afternoon',
        'sun_all_day',
      ]);
      expect(filterState.areaListShowIndoor()).toBe(true);
      expect(filterState.areaListShowOutdoor()).toBe(false);
      expect(filterState.areaListToposOnly()).toBe(true);
    });

    it('handles reversed and fractional grade ranges and optional undefined flags', async () => {
      filterState.areaListShowIndoor.set(true);
      filterState.areaListShowOutdoor.set(true);
      filterState.areaListToposOnly.set(true);

      dialogOpenSpy.mockReturnValue(
        of({
          categories: undefined as unknown as number[],
          gradeRange: [15.4, 3.6],
        } as FilterDialog),
      );

      service.openFilters();
      await flushAsync();

      expect(filterState.areaListGradeRange()).toEqual([4, 15]);
      expect(filterState.areaListCategories()).toEqual([]);
      expect(filterState.areaListShade()).toEqual([]);
      // Optional booleans remain untouched when omitted from result
      expect(filterState.areaListShowIndoor()).toBe(true);
      expect(filterState.areaListShowOutdoor()).toBe(true);
      expect(filterState.areaListToposOnly()).toBe(true);
    });

    it('does not modify state when dialog is cancelled (null or empty)', async () => {
      filterState.areaListGradeRange.set([2, 8]);
      filterState.areaListCategories.set([1]);

      dialogOpenSpy.mockReturnValue(of(null));
      service.openFilters();
      await flushAsync();

      expect(filterState.areaListGradeRange()).toEqual([2, 8]);
      expect(filterState.areaListCategories()).toEqual([1]);

      dialogOpenSpy.mockReturnValue(EMPTY);
      service.openFilters();
      await flushAsync();

      expect(filterState.areaListGradeRange()).toEqual([2, 8]);
      expect(filterState.areaListCategories()).toEqual([1]);
    });
  });

  describe('openIndoorListFilters', () => {
    it('passes indoor list state with expected flags and applies clamped result', async () => {
      filterState.indoorListGradeRange.set([3, 10]);
      filterState.indoorListToposOnly.set(false);

      dialogOpenSpy.mockReturnValue(
        of({
          categories: [],
          gradeRange: [20, 5],
          toposOnly: true,
        } satisfies FilterDialog),
      );

      service.openIndoorListFilters();
      await flushAsync();

      const [, options] = dialogOpenSpy.mock.calls[0];
      expect(options.data).toEqual({
        categories: [],
        gradeRange: [3, 10],
        toposOnly: false,
        showCategories: false,
        showShade: false,
        showGradeRange: true,
        showIndoorOutdoor: false,
        showToposOnly: true,
      });

      expect(filterState.indoorListGradeRange()).toEqual([5, 20]);
      expect(filterState.indoorListToposOnly()).toBe(true);
    });

    it('preserves indoorListToposOnly when omitted and ignores null cancel', async () => {
      filterState.indoorListGradeRange.set([1, 7]);
      filterState.indoorListToposOnly.set(true);

      dialogOpenSpy.mockReturnValue(of(null));
      service.openIndoorListFilters();
      await flushAsync();
      expect(filterState.indoorListGradeRange()).toEqual([1, 7]);
      expect(filterState.indoorListToposOnly()).toBe(true);

      dialogOpenSpy.mockReturnValue(
        of({
          categories: [],
          gradeRange: [-2, maxIndex + 10],
        } as FilterDialog),
      );
      service.openIndoorListFilters();
      await flushAsync();
      expect(filterState.indoorListGradeRange()).toEqual([0, maxIndex]);
      expect(filterState.indoorListToposOnly()).toBe(true);
    });
  });

  describe('openIndoorRouteFilters', () => {
    it('passes indoor routes state and applies categories, toposOnly, and clamped gradeRange', async () => {
      filterState.indoorRoutesCategories.set([1]);
      filterState.indoorRoutesGradeRange.set([2, 9]);
      filterState.indoorRoutesToposOnly.set(false);

      dialogOpenSpy.mockReturnValue(
        of({
          categories: [0, 1],
          gradeRange: [14.7, 6.2],
          toposOnly: true,
        } satisfies FilterDialog),
      );

      service.openIndoorRouteFilters();
      await flushAsync();

      const [, options] = dialogOpenSpy.mock.calls[0];
      expect(options.data).toEqual({
        categories: [1],
        gradeRange: [2, 9],
        toposOnly: false,
        showCategories: true,
        showShade: false,
        showGradeRange: true,
        showIndoorOutdoor: false,
        showToposOnly: true,
      });

      expect(filterState.indoorRoutesGradeRange()).toEqual([6, 15]);
      expect(filterState.indoorRoutesCategories()).toEqual([0, 1]);
      expect(filterState.indoorRoutesToposOnly()).toBe(true);
    });

    it('defaults missing gradeRange/categories and ignores cancel', async () => {
      filterState.indoorRoutesGradeRange.set([4, 8]);
      filterState.indoorRoutesCategories.set([0]);
      filterState.indoorRoutesToposOnly.set(true);

      dialogOpenSpy.mockReturnValue(EMPTY);
      service.openIndoorRouteFilters();
      await flushAsync();
      expect(filterState.indoorRoutesGradeRange()).toEqual([4, 8]);
      expect(filterState.indoorRoutesCategories()).toEqual([0]);

      dialogOpenSpy.mockReturnValue(of({} as FilterDialog));
      service.openIndoorRouteFilters();
      await flushAsync();
      expect(filterState.indoorRoutesGradeRange()).toEqual([0, maxIndex]);
      expect(filterState.indoorRoutesCategories()).toEqual([]);
      expect(filterState.indoorRoutesToposOnly()).toBe(true);
    });
  });
});
