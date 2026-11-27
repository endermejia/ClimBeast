import { Component, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { provideTaiga, TUI_DARK_MODE, TuiRoot } from '@taiga-ui/core';
import { provideEventPlugins } from '@taiga-ui/event-plugins';

import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AreasService } from '../../services/areas.service';
import { AuthStateService } from '../../services/auth-state.service';
import { CragsService } from '../../services/crags.service';
import { LocalStorage } from '../../services/local-storage';
import { MerchandiseService } from '../../services/merchandise.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { RoutesService } from '../../services/routes.service';
import { SearchService } from '../../services/search.service';
import { TourService, TourStep } from '../../services/tour.service';
import { VisitedAreasService } from '../../services/visited-areas.service';
import { VisitedCragsService } from '../../services/visited-crags.service';
import { VisitedIndoorCentersService } from '../../services/visited-indoor-centers.service';

import type { SearchData } from '../../models';

import { SearchDropdownComponent } from './search-dropdown';

@Component({
  imports: [SearchDropdownComponent, TuiRoot],
  template: `
    <tui-root>
      <app-search-dropdown [autoOpen]="autoOpen()" />
    </tui-root>
  `,
})
class SearchDropdownHostComponent {
  readonly autoOpen = signal(false);
}

describe('SearchDropdownComponent', () => {
  let fixture: ComponentFixture<SearchDropdownHostComponent>;

  const mockIsActive = signal(false);
  const mockStep = signal<TourStep>(TourStep.OFF);
  const searchResults = signal<SearchData | null>(null);

  const mockTourService = {
    isActive: mockIsActive,
    step: mockStep,
    next: vi.fn().mockResolvedValue(undefined),
    finish: vi.fn().mockResolvedValue(undefined),
  };

  const mockSearchService = {
    search: vi.fn((query: string) => of(query.trim() ? searchResults() : null)),
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    mockIsActive.set(false);
    mockStep.set(TourStep.OFF);
    searchResults.set(null);
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [SearchDropdownHostComponent, TranslateModule.forRoot()],
      providers: [
        provideTaiga({ fontScaling: false }),
        provideEventPlugins(),
        provideRouter([]),
        { provide: TUI_DARK_MODE, useValue: signal(false) },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: TourService, useValue: mockTourService },
        { provide: SearchService, useValue: mockSearchService },
        { provide: AreasService, useValue: { openAreaForm: vi.fn() } },
        { provide: CragsService, useValue: { openCragForm: vi.fn() } },
        { provide: RoutesService, useValue: { openRouteForm: vi.fn() } },
        {
          provide: AuthStateService,
          useValue: { isAdmin: signal(false) },
        },
        {
          provide: MerchandiseService,
          useValue: { getMerchandiseItems: vi.fn().mockResolvedValue([]) },
        },
        {
          provide: OutdoorDataService,
          useValue: {
            selectedArea: signal(null),
            selectedCrag: signal(null),
          },
        },
        {
          provide: LocalStorage,
          useValue: { getItem: vi.fn().mockReturnValue(null) },
        },
        {
          provide: VisitedAreasService,
          useValue: { visitedAreas: signal([]) },
        },
        {
          provide: VisitedCragsService,
          useValue: { visitedCrags: signal([]) },
        },
        {
          provide: VisitedIndoorCentersService,
          useValue: { visitedCenters: signal([]) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchDropdownHostComponent);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function getDropdownComponent(): SearchDropdownComponent {
    return fixture.debugElement.query(By.directive(SearchDropdownComponent))
      .componentInstance as SearchDropdownComponent;
  }

  it('should render result items via shared template in both "All" tab and category tab', async () => {
    searchResults.set({
      areas: [
        {
          title: 'Millena',
          href: '/area/millena',
          icon: '@tui.map-pin',
          type: 'area',
        },
      ],
      routes: [
        {
          title: 'Millena Crack',
          href: '/area/millena/sector/crack',
          grade: 20,
          type: 'route',
        },
      ],
    } as unknown as SearchData);

    fixture.detectChanges();
    const comp = getDropdownComponent();
    comp.searchOpen.set(true);
    comp.searchValue.set('Millena');
    fixture.detectChanges();

    await vi.advanceTimersByTimeAsync(350);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const allTabOptions = el.querySelectorAll('a[tuiOption]');
    expect(allTabOptions.length).toBe(2);
    expect(el.textContent).toContain('Millena');
    expect(el.textContent).toContain('Millena Crack');

    // Switch to category-specific tab (index 1 -> areas, index 2 -> routes)
    const activeTab = (
      comp as unknown as { activeSearchTab: { set: (v: number) => void } }
    ).activeSearchTab;
    activeTab.set(2);
    fixture.detectChanges();

    const categoryTabOptions = el.querySelectorAll('a[tuiOption]');
    expect(categoryTabOptions.length).toBe(1);
    expect(categoryTabOptions[0].textContent).toContain('Millena Crack');
  });

  it('should highlight the matching tour item with ring classes and pulse', async () => {
    searchResults.set({
      areas: [
        {
          title: 'Millena',
          href: '/area/millena',
          icon: '@tui.map-pin',
          type: 'area',
        },
        {
          title: 'Other Area',
          href: '/area/other',
          icon: '@tui.map-pin',
          type: 'area',
        },
      ],
    } as unknown as SearchData);

    mockIsActive.set(true);
    mockStep.set(TourStep.SEARCH);
    fixture.detectChanges();

    await vi.advanceTimersByTimeAsync(900);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const options = Array.from(el.querySelectorAll('a[tuiOption]'));
    expect(options.length).toBe(2);

    const highlighted = options.find((opt) =>
      opt.textContent?.includes('Millena'),
    );
    const nonHighlighted = options.find((opt) =>
      opt.textContent?.includes('Other Area'),
    );

    expect(highlighted?.classList.contains('ring-2')).toBe(true);
    expect(highlighted?.classList.contains('ring-negative')).toBe(true);
    expect(highlighted?.querySelector('tui-pulse')).not.toBeNull();
    expect(nonHighlighted?.classList.contains('ring-2')).toBe(false);
    expect(nonHighlighted?.querySelector('tui-pulse')).toBeNull();
  });

  it('should open search once when autoOpen is true and stay closed when closed', () => {
    fixture.componentInstance.autoOpen.set(true);
    fixture.detectChanges();

    const comp = getDropdownComponent();
    expect(comp.searchOpen()).toBe(true);

    comp.searchOpen.set(false);
    fixture.detectChanges();
    expect(comp.searchOpen()).toBe(false);
  });
});
