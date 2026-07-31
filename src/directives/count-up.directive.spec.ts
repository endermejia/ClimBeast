import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { describe, it, expect } from 'vitest';

import { CountUpDirective } from './count-up.directive';

@Component({
  template: `<div [appCountUp]="target" [duration]="duration"></div>`,
  imports: [CountUpDirective],
})
class TestHostComponent {
  target = 100;
  duration = 800;
}

describe('CountUpDirective', () => {
  it('should create directive', async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestHostComponent);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should have initial currentValue of 0', async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestHostComponent);
    await fixture.whenStable();

    const directiveEl = fixture.debugElement.children[0];
    const directive = directiveEl.injector.get(CountUpDirective);
    expect(directive.currentValue()).toBe(0);
  });

  it('should accept target input', async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.target = 200;
    await fixture.whenStable();

    const directiveEl = fixture.debugElement.children[0];
    const directive = directiveEl.injector.get(CountUpDirective);
    expect(directive.target()).toBe(200);
  });

  it('should accept duration input', async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.duration = 1200;
    await fixture.whenStable();

    const directiveEl = fixture.debugElement.children[0];
    const directive = directiveEl.injector.get(CountUpDirective);
    expect(directive.duration()).toBe(1200);
  });
});
