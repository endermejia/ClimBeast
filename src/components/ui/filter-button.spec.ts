import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideEventPlugins } from '@taiga-ui/event-plugins';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FilterButtonComponent } from './filter-button';

describe('FilterButtonComponent', () => {
  let fixture: ComponentFixture<FilterButtonComponent>;
  let component: FilterButtonComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterButtonComponent, TranslateModule.forRoot()],
      providers: [
        provideEventPlugins(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterButtonComponent);
    component = fixture.componentInstance;
  });

  it('should create with default inputs', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.hasActiveFilters()).toBe(false);
    expect(component.size()).toBe('l');
  });

  it('should hide notification badge when hasActiveFilters is false', () => {
    fixture.componentRef.setInput('hasActiveFilters', false);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('tui-badge-notification');
    expect(badge).toBeNull();
  });

  it('should render notification badge when hasActiveFilters is true', () => {
    fixture.componentRef.setInput('hasActiveFilters', true);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('tui-badge-notification');
    expect(badge).not.toBeNull();
  });

  it('should emit clicked when the button is clicked', () => {
    fixture.detectChanges();
    const clickSpy = vi.fn();
    component.clicked.subscribe(clickSpy);

    const button = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;
    button.click();

    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('should accept a custom size input', () => {
    fixture.componentRef.setInput('size', 'm');
    fixture.detectChanges();

    expect(component.size()).toBe('m');
  });
});
