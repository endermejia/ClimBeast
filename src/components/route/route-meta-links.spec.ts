import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { SupabaseService } from '../../services/supabase.service';

import { IS_BROWSER } from '../../app/is-browser';
import { MockSupabaseService } from '../../testing/mock-supabase.service';
import { RouteMetaLinksComponent, RouteMetaTopoLink } from './route-meta-links';

describe('RouteMetaLinksComponent', () => {
  let fixture: ComponentFixture<RouteMetaLinksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouteMetaLinksComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        { provide: SupabaseService, useClass: MockSupabaseService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RouteMetaLinksComponent);
  });

  it('omits both sections and hides host when equippers and topos are empty', () => {
    fixture.detectChanges();

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.classList.contains('hidden')).toBe(true);
    expect(hostEl.querySelectorAll('a')).toHaveLength(0);
    expect(hostEl.textContent?.trim()).toBe('');
  });

  it('renders equippers with and without avatars linking to /equipper/:id', () => {
    fixture.componentRef.setInput('equippers', [
      { id: 1, name: 'Ana', avatar: 'avatars/ana.jpg' },
      { id: 2, name: 'Luis', avatar: null },
    ]);
    fixture.detectChanges();

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.classList.contains('hidden')).toBe(false);
    expect(hostEl.textContent).toContain('equippers');
    expect(hostEl.textContent).not.toContain('topo');

    const links = Array.from(
      hostEl.querySelectorAll('a'),
    ) as HTMLAnchorElement[];
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toBe('/equipper/1');
    expect(links[0].textContent).toContain('Ana');
    expect(links[0].querySelector('img')).not.toBeNull();
    expect(links[0].querySelector('img')?.getAttribute('alt')).toBe('Ana');

    expect(links[1].getAttribute('href')).toBe('/equipper/2');
    expect(links[1].textContent).toContain('Luis');
    expect(links[1].querySelector('img')).toBeNull();
  });

  it('renders a single topo with singular heading and info appearance', () => {
    const topos: RouteMetaTopoLink[] = [
      {
        id: 10,
        name: 'Main Wall',
        link: ['/area', 'el-chorro', 'la-ceja', 'topo', 10],
        queryParams: { route: 42 },
        hasPath: true,
      },
    ];
    fixture.componentRef.setInput('topos', topos);
    fixture.detectChanges();

    const hostEl = fixture.nativeElement as HTMLElement;
    const heading = hostEl.querySelector('span.uppercase');
    expect(heading?.textContent?.trim()).toBe('topo');
    expect(hostEl.textContent).not.toContain('equippers');

    const link = hostEl.querySelector('a') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe(
      '/area/el-chorro/la-ceja/topo/10?route=42',
    );
    expect(link.getAttribute('data-appearance')).toBe('info');
    expect(link.textContent?.trim()).toBe('Main Wall');
  });

  it('renders multiple topos with plural heading and warning/info appearances', () => {
    const topos: RouteMetaTopoLink[] = [
      {
        id: 't-1',
        name: 'Sector A',
        link: ['/indoor', 'gym-1', 'topo', 't-1'],
        queryParams: { route: 'r-9' },
        hasPath: false,
      },
      {
        id: 't-2',
        name: 'Sector B',
        link: ['/indoor', 'gym-1', 'topo', 't-2'],
        queryParams: { route: 'r-9' },
        hasPath: undefined,
      },
    ];
    fixture.componentRef.setInput('topos', topos);
    fixture.detectChanges();

    const hostEl = fixture.nativeElement as HTMLElement;
    const heading = hostEl.querySelector('span.uppercase');
    expect(heading?.textContent?.trim()).toBe('topos');

    const links = Array.from(
      hostEl.querySelectorAll('a'),
    ) as HTMLAnchorElement[];
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('data-appearance')).toBe('warning');
    expect(links[0].getAttribute('href')).toBe(
      '/indoor/gym-1/topo/t-1?route=r-9',
    );
    expect(links[1].getAttribute('data-appearance')).toBe('info');
    expect(links[1].getAttribute('href')).toBe(
      '/indoor/gym-1/topo/t-2?route=r-9',
    );
  });
});
