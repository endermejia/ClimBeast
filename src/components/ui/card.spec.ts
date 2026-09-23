import { Component, ComponentRef, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { IS_BROWSER } from '../../app/is-browser';

import { AppCardComponent, PlaceCardItem } from './card';

@Component({
  template: `
    <app-card appearance="floating">
      <span title>Shell title</span>
      <div content>Shell content</div>
      <div extra>Shell extra</div>
    </app-card>
  `,
  imports: [AppCardComponent],
})
class ShellHostComponent {}

describe('AppCardComponent', () => {
  let fixture: ComponentFixture<AppCardComponent>;
  let component: AppCardComponent;
  let componentRef: ComponentRef<AppCardComponent>;

  const mockArea: Partial<PlaceCardItem> = {
    name: 'El Chorro',
    slug: 'el-chorro',
    crags_count: 12,
    topos_count: 3,
    liked: true,
    grades: { 16: 5, 18: 10 }, // 6a: 5, 6b: 10
  };

  const mockCrag: Partial<PlaceCardItem> = {
    name: 'La Ceja',
    slug: 'la-ceja',
    area_name: 'El Chorro',
    area_slug: 'el-chorro',
    routes_count: 24,
    topos_count: 2,
    approach: 15,
    grades: { 16: 5, 18: 10 },
  };

  const mockIndoor: Partial<PlaceCardItem> = {
    name: 'Boulder Bloc',
    slug: 'boulder-bloc',
    city: 'Madrid',
    country: 'Spain',
    routes_count: 40,
    topos: [{ id: 1, name: 'Topo 1', slug: 'topo-1' }],
    grades: { 16: 40 },
  };

  const linksOf = (f: ComponentFixture<unknown>): (string | null)[] =>
    Array.from(f.nativeElement.querySelectorAll('a')).map((a) =>
      (a as HTMLAnchorElement).getAttribute('href'),
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppCardComponent,
        ShellHostComponent,
        TranslateModule.forRoot(),
      ],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: false },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppCardComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('kind', 'area');
  });

  describe('shell mode (no kind/item)', () => {
    it('should project title, content and extra slots', () => {
      const hostFixture = TestBed.createComponent(ShellHostComponent);
      hostFixture.detectChanges();

      const text = hostFixture.nativeElement.textContent as string;
      expect(text).toContain('Shell title');
      expect(text).toContain('Shell content');
      expect(text).toContain('Shell extra');
    });

    it('should not render the place chart in shell mode', () => {
      const hostFixture = TestBed.createComponent(ShellHostComponent);
      hostFixture.detectChanges();

      expect(
        hostFixture.nativeElement.querySelector('app-chart-routes-by-grade'),
      ).toBeNull();
    });
  });

  describe('place mode', () => {
    it('should create component instance', () => {
      componentRef.setInput('item', mockArea);
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should transform item input and set default liked and grades', () => {
      componentRef.setInput('item', { name: 'Rodellar', slug: 'rodellar' });
      fixture.detectChanges();

      const result = component.item();
      expect(result?.name).toBe('Rodellar');
      expect(result?.slug).toBe('rodellar');
      expect(result?.liked).toBe(false);
      expect(result?.grades).toEqual({});
    });

    it('should set custom appearance input', () => {
      componentRef.setInput('item', mockArea);
      componentRef.setInput('appearance', 'flat');
      fixture.detectChanges();

      expect(component.appearance()).toBe('flat');
    });

    it('should render area stats with routes count from grades', () => {
      componentRef.setInput('item', mockArea);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('15'); // sum of grades (routes across sectors)
      expect(text).toContain('12');
      expect(text).toContain('3');
    });

    it('should link area stats to their segmented tabs', () => {
      componentRef.setInput('item', mockArea);
      fixture.detectChanges();

      const hrefs = linksOf(fixture);
      expect(hrefs).toContain('/area/el-chorro?tab=routes');
      expect(hrefs).toContain('/area/el-chorro?tab=crags');
      expect(hrefs).toContain('/area/el-chorro?tab=topos');
    });

    it('should render icons for routes, crags and topos in area mode', () => {
      componentRef.setInput('item', mockArea);
      fixture.detectChanges();

      const icons = Array.from(
        fixture.nativeElement.querySelectorAll('tui-icon'),
      ) as HTMLElement[];
      const iconNames = icons.map((i) => i.getAttribute('icon'));
      expect(iconNames).toContain('@tui.route');
      expect(iconNames).toContain('@tui.layout-grid');
      expect(fixture.nativeElement.querySelector('.bg-current')).toBeTruthy(); // topo mask icon
    });

    it('should show the liked heart when item is liked', () => {
      componentRef.setInput('item', mockArea);
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('[aria-label="favorite"]'),
      ).toBeTruthy();
    });

    it('should hide the topos stat when the area has no topos', () => {
      componentRef.setInput('item', {
        name: 'Rodellar',
        slug: 'rodellar',
        crags_count: 4,
        topos_count: 0,
        grades: { 16: 5 },
      });
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).not.toContain('topos');
      expect(linksOf(fixture)).not.toContain('/area/rodellar?tab=topos');
      expect(fixture.nativeElement.querySelector('.bg-current')).toBeNull();
    });

    it('should render crag stats with approach', () => {
      componentRef.setInput('kind', 'crag');
      componentRef.setInput('item', mockCrag);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('24'); // routes_count
      expect(text).toContain('15 min.');
      expect(text).toContain('(El Chorro)'); // area next to the name, in parentheses
    });

    it('should link the area name in the title to the area page', () => {
      componentRef.setInput('kind', 'crag');
      componentRef.setInput('item', mockCrag);
      fixture.detectChanges();

      expect(linksOf(fixture)).toContain('/area/el-chorro');
    });

    it('should not show the area name when showAreaName is false', () => {
      componentRef.setInput('kind', 'crag');
      componentRef.setInput('showAreaName', false);
      componentRef.setInput('item', mockCrag);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent as string).not.toContain(
        'El Chorro',
      );
      expect(linksOf(fixture)).not.toContain('/area/el-chorro');
    });

    it('should link crag stats to their segmented tabs', () => {
      componentRef.setInput('kind', 'crag');
      componentRef.setInput('item', mockCrag);
      fixture.detectChanges();

      const hrefs = linksOf(fixture);
      expect(hrefs).toContain('/area/el-chorro/la-ceja?tab=routes');
      expect(hrefs).toContain('/area/el-chorro/la-ceja?tab=topos');
    });

    it('should hide the topos stat when the crag has no topos', () => {
      componentRef.setInput('kind', 'crag');
      componentRef.setInput('item', {
        name: 'La Ceja',
        slug: 'la-ceja',
        area_slug: 'el-chorro',
        routes_count: 10,
        topos_count: 0,
      });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent as string).not.toContain(
        'topos',
      );
      expect(fixture.nativeElement.querySelector('.bg-current')).toBeNull();
    });

    it('should render indoor stats and link routes/topos tabs and city search', () => {
      componentRef.setInput('kind', 'indoor');
      componentRef.setInput('item', mockIndoor);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('40');
      expect(text).toContain('(Madrid)');
      expect(text).toContain('Spain');

      const hrefs = linksOf(fixture);
      expect(hrefs).toContain('/indoor/boulder-bloc?tab=routes');
      expect(hrefs).toContain('/indoor/boulder-bloc?tab=topos');
      expect(hrefs).toContain('/indoor?q=Madrid');
    });

    it('should hide the topos stat when the indoor center has no topos', () => {
      componentRef.setInput('kind', 'indoor');
      componentRef.setInput('item', {
        name: 'Boulder Bloc',
        slug: 'boulder-bloc',
        city: 'Madrid',
        routes_count: 40,
        topos: [],
      });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent as string).not.toContain(
        'topos',
      );
      expect(linksOf(fixture)).not.toContain('/indoor/boulder-bloc?tab=topos');
    });

    it('should compute routes count from grades when routes_count is absent', () => {
      componentRef.setInput('item', {
        name: 'Rodellar',
        slug: 'rodellar',
        grades: { 23: 7, 25: 8 }, // 7a: 7, 7b: 8
      });
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('15'); // 7 + 8
    });
  });
});
