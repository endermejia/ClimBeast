import { Component, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideTaiga, TUI_DARK_MODE, TuiRoot } from '@taiga-ui/core';
import { provideEventPlugins } from '@taiga-ui/event-plugins';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TourService, TourStep } from '../../services/tour.service';

import { ExploreMapFabComponent } from './explore-map-fab';

@Component({
  imports: [ExploreMapFabComponent, TuiRoot],
  template: `
    <tui-root>
      <app-explore-map-fab />
    </tui-root>
  `,
})
class ExploreMapFabHostComponent {}

describe('ExploreMapFabComponent', () => {
  let fixture: ComponentFixture<ExploreMapFabHostComponent>;

  const mockIsActive = signal(false);
  const mockStep = signal<TourStep>(TourStep.OFF);
  const mockTourService = {
    isActive: mockIsActive,
    step: mockStep,
    next: vi.fn().mockResolvedValue(undefined),
    finish: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    mockIsActive.set(false);
    mockStep.set(TourStep.OFF);
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [ExploreMapFabHostComponent, TranslateModule.forRoot()],
      providers: [
        provideTaiga({ fontScaling: false }),
        provideEventPlugins(),
        provideRouter([]),
        { provide: TUI_DARK_MODE, useValue: signal(false) },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: TourService, useValue: mockTourService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExploreMapFabHostComponent);
  });

  it('should create and render map button linking to /explore', () => {
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      'app-explore-map-fab button',
    ) as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.getAttribute('routerlink')).toBe('/explore');
  });

  it('should not render pulse or advance tour when tour is inactive', () => {
    mockIsActive.set(false);
    mockStep.set(TourStep.EXPLORE_MAP);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('tui-pulse')).toBeNull();

    const button = fixture.nativeElement.querySelector(
      'app-explore-map-fab button',
    ) as HTMLButtonElement;
    button.click();

    expect(mockTourService.next).not.toHaveBeenCalled();
  });

  it('should not render pulse or advance tour on a different tour step', () => {
    mockIsActive.set(true);
    mockStep.set(TourStep.HOME);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('tui-pulse')).toBeNull();

    const button = fixture.nativeElement.querySelector(
      'app-explore-map-fab button',
    ) as HTMLButtonElement;
    button.click();

    expect(mockTourService.next).not.toHaveBeenCalled();
  });

  it('should render pulse, tour hint dropdown, and advance tour when clicked on TourStep.EXPLORE_MAP', () => {
    mockIsActive.set(true);
    mockStep.set(TourStep.EXPLORE_MAP);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('tui-pulse')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-tour-hint')).not.toBeNull();

    const button = fixture.nativeElement.querySelector(
      'app-explore-map-fab button',
    ) as HTMLButtonElement;
    button.click();

    expect(mockTourService.next).toHaveBeenCalledOnce();
  });
});
