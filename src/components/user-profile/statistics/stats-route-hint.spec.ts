import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { AscentType, AscentTypes, RouteScore } from '../../../models';

import { StatsRouteHintComponent } from './stats-route-hint';

describe('StatsRouteHintComponent', () => {
  let fixture: ComponentFixture<StatsRouteHintComponent>;
  let componentRef: ComponentRef<StatsRouteHintComponent>;

  const sampleRoutes: RouteScore[] = [
    {
      name: 'La Rambla',
      gradeLabel: '9a+',
      gradeId: 31,
      score: 1200,
      type: AscentTypes.RP,
      areaSlug: 'siurana',
      cragSlug: 'el-pati',
      routeSlug: 'la-rambla',
    },
    {
      name: 'Boulder Flash',
      gradeLabel: '7b',
      gradeId: 20,
      score: 850,
      type: AscentTypes.F,
      areaSlug: '',
      cragSlug: '',
      routeSlug: 'boulder-flash',
      isIndoor: true,
      centerSlug: 'sharma-climbing',
    },
    {
      name: 'Vista Directa',
      gradeLabel: '7a',
      gradeId: 18,
      score: 800,
      type: AscentTypes.OS,
      areaSlug: 'chulilla',
      cragSlug: 'oasis',
      routeSlug: 'vista-directa',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatsRouteHintComponent, TranslateModule.forRoot()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(StatsRouteHintComponent);
    componentRef = fixture.componentRef;
  });

  it('renders header title, value, and optional ascentCount', () => {
    componentRef.setInput('title', 'ascents');
    componentRef.setInput('value', '7a+');
    componentRef.setInput('ascentCount', 12);
    componentRef.setInput('routes', sampleRoutes);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const titleEl = host.querySelector('.trend-hint-title');
    const scoreEl = host.querySelector('.trend-hint-score');

    expect(titleEl?.textContent).toContain('12');
    expect(titleEl?.textContent).toContain('ascents');
    expect(scoreEl?.textContent?.trim()).toBe('7a+');
  });

  it('renders outdoor and indoor router links correctly', () => {
    componentRef.setInput('title', 'Top 10');
    componentRef.setInput('value', '2,850 points');
    componentRef.setInput('routes', sampleRoutes);
    fixture.detectChanges();

    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a.route-name'),
    ) as HTMLAnchorElement[];

    expect(links).toHaveLength(3);
    expect(links[0].getAttribute('href')).toBe(
      '/area/siurana/el-pati/la-rambla',
    );
    expect(links[1].getAttribute('href')).toBe(
      '/indoor/sharma-climbing/route/boulder-flash',
    );
    expect(links[2].getAttribute('href')).toBe(
      '/area/chulilla/oasis/vista-directa',
    );
  });

  it('applies redpoint, flash, and onsight classes and renders grade and score', () => {
    componentRef.setInput('title', 'Top 10');
    componentRef.setInput('value', '2,850');
    componentRef.setInput('routes', sampleRoutes);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const rows = Array.from(host.querySelectorAll('.trend-route-row'));
    expect(rows).toHaveLength(3);

    const rpLink = rows[0].querySelector('a.route-name');
    expect(rpLink?.classList.contains('redpoint')).toBe(true);
    expect(rpLink?.classList.contains('flash')).toBe(false);
    expect(rpLink?.classList.contains('onsight')).toBe(false);
    expect(
      rows[0].querySelector('.route-score-grade')?.textContent?.trim(),
    ).toBe('9a+');
    expect(rows[0].querySelector('.route-score-val')?.textContent?.trim()).toBe(
      '1200',
    );

    const flashLink = rows[1].querySelector('a.route-name');
    expect(flashLink?.classList.contains('flash')).toBe(true);
    expect(flashLink?.classList.contains('redpoint')).toBe(false);

    const osLink = rows[2].querySelector('a.route-name');
    expect(osLink?.classList.contains('onsight')).toBe(true);
    expect(osLink?.classList.contains('redpoint')).toBe(false);
  });

  it('falls back to anonymous label when route name is empty and omits list when empty', () => {
    componentRef.setInput('title', '2026');
    componentRef.setInput('value', '0 points');
    componentRef.setInput('routes', []);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.trend-routes')).toBeNull();

    componentRef.setInput('routes', [
      {
        ...sampleRoutes[0],
        name: '',
        type: undefined as unknown as AscentType,
      },
    ]);
    componentRef.setInput('compact', true);
    fixture.detectChanges();

    const link = host.querySelector('a.route-name');
    expect(link?.textContent?.trim()).toBe('anonymous');
    expect(link?.classList.contains('redpoint')).toBe(true);
    expect(
      host
        .querySelector('.trend-hint')
        ?.classList.contains('trend-hint--compact'),
    ).toBe(true);
  });
});
