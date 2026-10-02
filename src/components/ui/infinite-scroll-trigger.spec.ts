import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { InfiniteScrollTriggerComponent } from './infinite-scroll-trigger';

describe('InfiniteScrollTriggerComponent', () => {
  let component: InfiniteScrollTriggerComponent;
  let fixture: ComponentFixture<InfiniteScrollTriggerComponent>;
  let observerCallback: IntersectionObserverCallback;

  class MockObserver implements IntersectionObserver {
    static observeSpy = vi.fn();
    static disconnectSpy = vi.fn();

    readonly root: Element | Document | null = null;
    readonly rootMargin: string = '';
    readonly scrollMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];

    constructor(callback: IntersectionObserverCallback) {
      observerCallback = callback;
    }

    observe(target: Element): void {
      MockObserver.observeSpy(target);
    }

    disconnect(): void {
      MockObserver.disconnectSpy();
    }

    unobserve(_target: Element): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  beforeEach(async () => {
    MockObserver.observeSpy = vi.fn();
    MockObserver.disconnectSpy = vi.fn();

    vi.stubGlobal('IntersectionObserver', MockObserver);

    await TestBed.configureTestingModule({
      imports: [InfiniteScrollTriggerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InfiniteScrollTriggerComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize observer outside Angular zone and observe host element', () => {
    const ngZone = TestBed.inject(NgZone);
    const runOutsideAngularSpy = vi.spyOn(ngZone, 'runOutsideAngular');

    fixture.detectChanges(); // triggers ngAfterViewInit

    expect(runOutsideAngularSpy).toHaveBeenCalled();
    expect(MockObserver.observeSpy).toHaveBeenCalledWith(fixture.nativeElement);
  });

  it('should emit intersect output inside NgZone when element intersects', () => {
    fixture.detectChanges();

    const ngZone = TestBed.inject(NgZone);
    const runSpy = vi.spyOn(ngZone, 'run');

    let emitted = false;
    component.intersect.subscribe(() => {
      emitted = true;
    });

    const mockEntry = { isIntersecting: true } as IntersectionObserverEntry;
    observerCallback([mockEntry], {} as IntersectionObserver);

    expect(runSpy).toHaveBeenCalled();
    expect(emitted).toBe(true);
  });

  it('should not emit intersect output when element does not intersect', () => {
    fixture.detectChanges();

    let emitted = false;
    component.intersect.subscribe(() => {
      emitted = true;
    });

    const mockEntry = { isIntersecting: false } as IntersectionObserverEntry;
    observerCallback([mockEntry], {} as IntersectionObserver);

    expect(emitted).toBe(false);
  });

  it('should disconnect observer on destroy', () => {
    fixture.detectChanges();
    fixture.destroy(); // triggers ngOnDestroy

    expect(MockObserver.disconnectSpy).toHaveBeenCalled();
  });
});
