import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { AscentsService } from '../../services/ascents.service';
import { RoutesService } from '../../services/routes.service';

import { TopoRoutesTableComponent } from './topo-routes-table';
import type { TopoRouteRow } from './topo.types';

function createMockTopoRouteRow(
  routeId: number,
  name = `Route ${routeId}`,
): TopoRouteRow {
  return {
    index: 0,
    name,
    grade: 15,
    slug: `route-${routeId}`,
    height: 12,
    moves: 20,
    climbed: false,
    project: false,
    link: ['/route', `${routeId}`],
    _ref: {
      topo_id: 1,
      route_id: routeId,
      order: 1,
      route: {
        id: routeId,
        name,
        grade: '6a',
        climbing_kind: 'sport',
        own_ascent: null,
      },
    } as unknown as TopoRouteRow['_ref'],
  };
}

@Component({
  standalone: true,
  imports: [TopoRoutesTableComponent],
  template: `
    <app-topo-routes-table
      [sortedTableData]="data()"
      [columns]="['name']"
      [hasAccess]="true"
      [selectedRouteId]="selectedRouteId()"
      [sorter]="sorter"
      [topoId]="1"
    />
  `,
})
class TestHostComponent {
  data = signal<TopoRouteRow[]>([
    createMockTopoRouteRow(101, 'Via Uno'),
    createMockTopoRouteRow(102, 'Via Dos'),
  ]);
  selectedRouteId = signal<number | null>(null);
  sorter = () => 0;
}

describe('TopoRoutesTableComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: AscentsService,
          useValue: { ascentInfo: signal({}) },
        },
        {
          provide: RoutesService,
          useValue: { toggleProject: () => Promise.resolve() },
        },
      ],
    }).compileComponents();
  });

  it('does not display route link button on any row when no route is selected', async () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const linkButtons = fixture.nativeElement.querySelectorAll(
      'td a[iconstart="@tui.arrow-up-right"], td a[data-icon-start="tui"]',
    );
    expect(linkButtons.length).toBe(0);
  });

  it('displays route link button only on the selected route row', async () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.selectedRouteId.set(102);
    fixture.detectChanges();
    await fixture.whenStable();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);

    const firstRowLink = rows[0].querySelector('a');
    const secondRowLink = rows[1].querySelector('a');

    expect(firstRowLink).toBeNull();
    expect(secondRowLink).not.toBeNull();
    expect(secondRowLink?.getAttribute('href')).toBe('/route/102');
  });
});
