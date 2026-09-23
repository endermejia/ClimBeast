import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IS_BROWSER } from '../../app/is-browser';

import { ChartRoutesByGradeComponent } from './chart-routes-by-grade';

describe('ChartRoutesByGradeComponent', () => {
  let fixture: ComponentFixture<ChartRoutesByGradeComponent>;
  let component: ChartRoutesByGradeComponent;
  let componentRef: ComponentRef<ChartRoutesByGradeComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartRoutesByGradeComponent, TranslateModule.forRoot()],
      providers: [provideRouter([]), { provide: IS_BROWSER, useValue: true }],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ChartRoutesByGradeComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('grades', { 16: 10, 18: 5 });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render total routes as plain text when routesLink is not provided', () => {
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a');
    expect(link).toBeNull();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('15');
    expect(text).toContain('routes');
  });

  it('should render total routes as a link when routesLink is provided', () => {
    componentRef.setInput('routesLink', ['/area', 'el-chorro']);
    componentRef.setInput('queryParams', { tab: 'routes' });
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a');
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/area/el-chorro?tab=routes');
    expect(link.textContent).toContain('15');
    expect(link.textContent).toContain('routes');
  });

  it('should still render link when a band is active', () => {
    componentRef.setInput('routesLink', ['/area', 'el-chorro']);
    componentRef.setInput('queryParams', { tab: 'routes' });
    component.activeItemIndex.set(1);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a');
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/area/el-chorro?tab=routes');
    expect(link.textContent).toContain('15');
  });

  it('should not navigate when clicking outside <a> on the chart ring', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    componentRef.setInput('routesLink', ['/area', 'el-chorro']);
    componentRef.setInput('queryParams', { tab: 'routes' });
    fixture.detectChanges();

    const chartElem = fixture.nativeElement.querySelector('tui-ring-chart');
    expect(chartElem).toBeTruthy();

    chartElem.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
