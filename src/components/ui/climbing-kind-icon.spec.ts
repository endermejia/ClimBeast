import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TranslateModule } from '@ngx-translate/core';
import { describe, it, expect, beforeEach } from 'vitest';

import { IS_BROWSER } from '../../app/is-browser';
import { ClimbingKindIconComponent } from './climbing-kind-icon';

describe('ClimbingKindIconComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClimbingKindIconComponent, TranslateModule.forRoot()],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ClimbingKindIconComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should use default mountain icon when kind is not provided', () => {
    const fixture = TestBed.createComponent(ClimbingKindIconComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance['icon']()).toBe('@tui.mountain');
  });

  it('should return sport icon for sport kind', () => {
    const fixture = TestBed.createComponent(ClimbingKindIconComponent);
    fixture.componentRef.setInput('kind', 'sport');
    fixture.detectChanges();
    expect(fixture.componentInstance['icon']()).toBe('/image/sport.svg');
  });

  it('should return boulder icon for boulder kind', () => {
    const fixture = TestBed.createComponent(ClimbingKindIconComponent);
    fixture.componentRef.setInput('kind', 'boulder');
    fixture.detectChanges();
    expect(fixture.componentInstance['icon']()).toBe('/image/boulder.svg');
  });

  it('should return null hint when showHint is false', () => {
    const fixture = TestBed.createComponent(ClimbingKindIconComponent);
    fixture.componentRef.setInput('kind', 'sport');
    fixture.componentRef.setInput('showHint', false);
    fixture.detectChanges();
    expect(fixture.componentInstance['hint']()).toBeNull();
  });
});
