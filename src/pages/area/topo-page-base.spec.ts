import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TuiDialogService } from '@taiga-ui/core';

import { TranslateService } from '@ngx-translate/core';
import { describe, expect, it, vi } from 'vitest';

import { AscentsService } from '../../services/ascents.service';
import { BreadcrumbsService } from '../../services/breadcrumbs.service';
import { IndoorDataService } from '../../services/indoor-data.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { RoutesService } from '../../services/routes.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { ToposService } from '../../services/topos.service';

import type { TopoDetail } from '../../models';

import { IS_BROWSER } from '../../app/is-browser';

import { TopoPageBase } from './topo-page-base';

@Component({
  selector: 'app-test-topo-page',
  template: '',
})
class TestTopoPageComponent extends TopoPageBase {
  readonly indoorMode = signal(false);
  override isIndoor = computed(() => this.indoorMode());
  readonly onRouteParamSelectedSpy = vi.fn();

  get currentSelectedRouteId(): string | number | null {
    return this.selectedRouteId();
  }

  setManualSelection(value: string | number | null): void {
    this.selectedRouteId.set(value);
  }

  protected override onRouteParamSelected(routeId: string | number): void {
    this.onRouteParamSelectedSpy(routeId);
  }
}

function makeTopo(
  id: number | string,
  routeIds: (number | string)[],
): TopoDetail {
  return {
    id,
    name: `Topo ${id}`,
    topo_routes: routeIds.map((routeId, idx) => ({
      topo_id: id,
      route_id: routeId,
      number: idx + 1,
      path: null,
      route: {
        id: routeId,
        name: `Route ${routeId}`,
        slug: `route-${routeId}`,
        grade: 15,
      },
    })),
  } as unknown as TopoDetail;
}

describe('TopoPageBase route query param selection', () => {
  function setup() {
    const outdoorTopoDetail = signal<TopoDetail | null>(null);
    const outdoorSelectedTopoId = signal<string | null>(null);
    const indoorTopoDetail = signal<TopoDetail | null>(null);
    const indoorSelectedTopoId = signal<string | null>(null);

    TestBed.configureTestingModule({
      imports: [TestTopoPageComponent],
      providers: [
        provideRouter([]),
        { provide: IS_BROWSER, useValue: false },
        {
          provide: OutdoorDataService,
          useValue: {
            topoDetail: outdoorTopoDetail,
            selectedTopoId: outdoorSelectedTopoId,
            topoDetailResource: { isLoading: () => false },
            cragDetail: signal(null),
            areaTopos: signal([]),
            selectTopo: (
              _a: string | null,
              _c: string | null,
              id: string | null,
            ) => outdoorSelectedTopoId.set(id),
          },
        },
        {
          provide: IndoorDataService,
          useValue: {
            topoDetail: indoorTopoDetail,
            selectedTopoId: indoorSelectedTopoId,
            selectedCenterSlug: signal<string | null>(null),
            topoDetailResource: { isLoading: () => false },
            centerToposResource: { value: () => [] },
          },
        },
        {
          provide: BreadcrumbsService,
          useValue: { selectedIndoorCenter: signal(null) },
        },
        { provide: SupabaseService, useValue: {} },
        { provide: AscentsService, useValue: {} },
        { provide: ToposService, useValue: {} },
        { provide: RoutesService, useValue: {} },
        { provide: TuiDialogService, useValue: {} },
        { provide: TranslateService, useValue: {} },
        { provide: ToastService, useValue: {} },
      ],
    });

    const fixture = TestBed.createComponent(TestTopoPageComponent);
    return {
      fixture,
      comp: fixture.componentInstance,
      outdoorTopoDetail,
      indoorTopoDetail,
    };
  }

  it('preselects the outdoor route matching the route query param with its native numeric id', () => {
    const { fixture, comp, outdoorTopoDetail } = setup();
    fixture.componentRef.setInput('id', '5');
    fixture.componentRef.setInput('route', '42');
    fixture.detectChanges();

    expect(comp.currentSelectedRouteId).toBeNull();

    outdoorTopoDetail.set(makeTopo(5, [41, 42, 43]));
    fixture.detectChanges();

    expect(comp.currentSelectedRouteId).toBe(42);
    expect(typeof comp.currentSelectedRouteId).toBe('number');
    expect(comp.onRouteParamSelectedSpy).toHaveBeenCalledWith(42);
  });

  it('preselects the indoor route matching the route query param', () => {
    const { fixture, comp, indoorTopoDetail } = setup();
    comp.indoorMode.set(true);
    fixture.componentRef.setInput('id', 'topo-uuid-1');
    fixture.componentRef.setInput('route', 'route-uuid-2');
    fixture.detectChanges();

    indoorTopoDetail.set(
      makeTopo('topo-uuid-1', ['route-uuid-1', 'route-uuid-2']),
    );
    fixture.detectChanges();

    expect(comp.currentSelectedRouteId).toBe('route-uuid-2');
    expect(comp.onRouteParamSelectedSpy).toHaveBeenCalledWith('route-uuid-2');
  });

  it('does not overwrite manual selection when the same topo reloads and clears selection on topo switch', () => {
    const { fixture, comp, outdoorTopoDetail } = setup();
    fixture.componentRef.setInput('id', '5');
    fixture.componentRef.setInput('route', '42');
    outdoorTopoDetail.set(makeTopo(5, [41, 42, 43]));
    fixture.detectChanges();

    expect(comp.currentSelectedRouteId).toBe(42);

    // User manually selects another route
    comp.setManualSelection(43);
    outdoorTopoDetail.set(makeTopo(5, [41, 42, 43]));
    fixture.detectChanges();
    expect(comp.currentSelectedRouteId).toBe(43);

    // User switches to another topo without a route query param
    fixture.componentRef.setInput('id', '6');
    fixture.componentRef.setInput('route', undefined);
    outdoorTopoDetail.set(makeTopo(6, [61, 62]));
    fixture.detectChanges();
    expect(comp.currentSelectedRouteId).toBeNull();
  });
});
