import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { describe, it, expect } from 'vitest';

import { COMMON_TEST_PROVIDERS } from '../testing';
import { AscentCountDirective } from './ascent-count.directive';

@Component({
  template: `<span [appAscentCount]="count()" #ref="appAscentCount"></span>`,
  imports: [AscentCountDirective],
})
class TestHostComponent {
  readonly count = signal<number | null | undefined>(1400);
}

describe('AscentCountDirective', () => {
  it('should create directive and format 1400 as 1.4K', async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [...COMMON_TEST_PROVIDERS],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const spanEl: HTMLElement = fixture.nativeElement.querySelector('span');
    expect(spanEl.textContent).toBe('1.4K');
  });

  it('should format values below 1000 as raw number', async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [...COMMON_TEST_PROVIDERS],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.count.set(42);
    fixture.detectChanges();
    await fixture.whenStable();

    const spanEl: HTMLElement = fixture.nativeElement.querySelector('span');
    expect(spanEl.textContent).toBe('42');
  });

  it('should format values above 1000000 as 1.4M', async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [...COMMON_TEST_PROVIDERS],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.count.set(1400000);
    fixture.detectChanges();
    await fixture.whenStable();

    const spanEl: HTMLElement = fixture.nativeElement.querySelector('span');
    expect(spanEl.textContent).toBe('1.4M');
  });

  it('should update reactively when signal changes', async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [...COMMON_TEST_PROVIDERS],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const spanEl: HTMLElement = fixture.nativeElement.querySelector('span');
    expect(spanEl.textContent).toBe('1.4K');

    fixture.componentInstance.count.set(1000);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(spanEl.textContent).toBe('1K');

    fixture.componentInstance.count.set(2500000);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(spanEl.textContent).toBe('2.5M');
  });
});
