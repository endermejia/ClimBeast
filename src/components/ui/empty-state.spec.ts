import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { EmptyStateComponent } from './empty-state';

describe('EmptyStateComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should have default message', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    expect(fixture.componentInstance.message()).toBe('empty');
  });

  it('should have default icon', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    expect(fixture.componentInstance.icon()).toBe('@tui.package-open');
  });

  it('should accept custom inputs via setInput', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('message', 'custom.msg');
    fixture.componentRef.setInput('icon', '@tui.star');
    expect(fixture.componentInstance.message()).toBe('custom.msg');
    expect(fixture.componentInstance.icon()).toBe('@tui.star');
  });
});
