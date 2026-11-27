import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TuiDialogService } from '@taiga-ui/core';

import { TranslateService } from '@ngx-translate/core';
import { describe, expect, it, vi } from 'vitest';

import { AppDialogsService } from '../../services/app-dialogs.service';
import { AscentsService } from '../../services/ascents.service';
import { BreadcrumbsService } from '../../services/breadcrumbs.service';
import { IndoorDataService } from '../../services/indoor-data.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { RoutesService } from '../../services/routes.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { ToposService } from '../../services/topos.service';

import type { TopoDetail, TopoRouteWithRoute } from '../../models';

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

  testBuildHeaderActions(
    topo: TopoDetail,
    permissions: { canDraw: boolean; canEdit: boolean; canDelete: boolean },
    handlers: {
      onDraw: (topo: TopoDetail) => void;
      onEdit: (topo: TopoDetail) => void;
      onDelete: (topo: TopoDetail) => void;
    },
  ) {
    return this.buildTopoHeaderActions(topo, permissions, handlers);
  }

  testMapTopoRouteToRow(
    tr: TopoRouteWithRoute,
    link: string[],
    extra?: { moves?: number },
  ) {
    return this.mapTopoRouteToRow(tr, link, extra);
  }

  testMapTopoRoutesForEditor(topo: TopoDetail) {
    return this.mapTopoRoutesForEditor(topo);
  }

  testConfirmDeleteTopo(topo: TopoDetail, onConfirm: () => Promise<unknown>) {
    this.confirmDeleteTopo(topo, onConfirm);
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
  function setup(options?: { isBrowser?: boolean; confirmResult?: boolean }) {
    const outdoorTopoDetail = signal<TopoDetail | null>(null);
    const outdoorSelectedTopoId = signal<string | null>(null);
    const indoorTopoDetail = signal<TopoDetail | null>(null);
    const indoorSelectedTopoId = signal<string | null>(null);
    const confirmSpy = vi
      .fn()
      .mockResolvedValue(options?.confirmResult ?? false);

    TestBed.configureTestingModule({
      imports: [TestTopoPageComponent],
      providers: [
        provideRouter([]),
        { provide: IS_BROWSER, useValue: options?.isBrowser ?? false },
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
        { provide: TuiDialogService, useValue: { open: vi.fn() } },
        { provide: AppDialogsService, useValue: { confirm: confirmSpy } },
        {
          provide: TranslateService,
          useValue: { instant: vi.fn((key: string) => key) },
        },
        { provide: ToastService, useValue: {} },
      ],
    });

    const fixture = TestBed.createComponent(TestTopoPageComponent);
    return {
      fixture,
      comp: fixture.componentInstance,
      outdoorTopoDetail,
      indoorTopoDetail,
      confirmSpy,
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

  it('builds header actions according to draw/edit/delete permissions and invokes callbacks', () => {
    const { comp } = setup();
    const topo = makeTopo(5, [1]);
    const onDraw = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const allActions = comp.testBuildHeaderActions(
      topo,
      { canDraw: true, canEdit: true, canDelete: true },
      { onDraw, onEdit, onDelete },
    );
    expect(allActions.map((a) => a.label)).toEqual(['draw', 'edit', 'delete']);
    allActions.forEach((a) => a.action());
    expect(onDraw).toHaveBeenCalledWith(topo);
    expect(onEdit).toHaveBeenCalledWith(topo);
    expect(onDelete).toHaveBeenCalledWith(topo);

    const drawOnly = comp.testBuildHeaderActions(
      topo,
      { canDraw: true, canEdit: false, canDelete: true },
      { onDraw, onEdit, onDelete },
    );
    expect(drawOnly.map((a) => a.label)).toEqual(['draw']);
  });

  it('maps topo routes to table rows and editor payload', () => {
    const { comp } = setup();
    const topo = makeTopo(5, [10]);
    const tr = topo.topo_routes[0];
    tr.route.own_ascent = { type: 'redpoint' } as never;
    tr.route.project = true;

    const row = comp.testMapTopoRouteToRow(tr, ['/area', 'a', 'c', 'r'], {
      moves: 12,
    });
    expect(row.climbed).toBe(true);
    expect(row.project).toBe(true);
    expect(row.moves).toBe(12);
    expect(row.link).toEqual(['/area', 'a', 'c', 'r']);

    const editorRoutes = comp.testMapTopoRoutesForEditor(topo);
    expect(editorRoutes).toHaveLength(1);
    expect(editorRoutes[0].topo_id).toBe(5);
    expect(editorRoutes[0].route_id).toBe(10);
  });

  it('confirmDeleteTopo runs onConfirm only in browser when dialog confirms', async () => {
    const { comp, confirmSpy } = setup({
      isBrowser: true,
      confirmResult: true,
    });
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    comp.testConfirmDeleteTopo(makeTopo(5, [1]), onConfirm);

    await Promise.resolve();
    await Promise.resolve();

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('confirmDeleteTopo does not invoke onConfirm when dialog is cancelled', async () => {
    const { comp, confirmSpy } = setup({
      isBrowser: true,
      confirmResult: false,
    });
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    comp.testConfirmDeleteTopo(makeTopo(5, [1]), onConfirm);

    await Promise.resolve();
    await Promise.resolve();

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
