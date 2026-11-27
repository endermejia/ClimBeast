import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideEventPlugins } from '@taiga-ui/event-plugins';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TopoRouteWithRoute } from '../../models';

import { TopoPathEditorSidebarComponent } from './topo-path-editor-sidebar';
import { type RoutePathMeta } from './topo-path-editor.utils';

function makeTopoRoute(id: number, name: string): TopoRouteWithRoute {
  return {
    topo_id: 10,
    route_id: id,
    number: id,
    path: null,
    route: {
      id,
      name,
      slug: `route-${id}`,
      grade: 14,
      climbing_kind: 'sport',
    } as TopoRouteWithRoute['route'],
  };
}

describe('TopoPathEditorSidebarComponent', () => {
  let fixture: ComponentFixture<TopoPathEditorSidebarComponent>;
  let component: TopoPathEditorSidebarComponent;
  let componentRef: ComponentRef<TopoPathEditorSidebarComponent>;

  const route1 = makeTopoRoute(1, 'El Capitan');
  const route2 = makeTopoRoute(2, 'La Directa');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopoPathEditorSidebarComponent, TranslateModule.forRoot()],
      providers: [provideEventPlugins()],
    }).compileComponents();

    fixture = TestBed.createComponent(TopoPathEditorSidebarComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('isOpen', true);
    componentRef.setInput('isIndoor', false);
    componentRef.setInput('topoRoutes', [route1, route2]);
    componentRef.setInput('selectedRoute', null);
    componentRef.setInput(
      'routePathsMeta',
      new Map<string | number, RoutePathMeta>([
        [1, { hasPath: true, isTraverse: false }],
        [2, { hasPath: false, isTraverse: true }],
      ]),
    );
    componentRef.setInput('showRouteSelector', false);
    componentRef.setInput('availableRoutes', [route1.route, route2.route]);
    componentRef.setInput('selectedRoutesForMultiselect', [
      route1.route,
      route2.route,
    ]);
    componentRef.setInput('canCreateRoute', true);
    componentRef.setInput('canReorderRoutes', true);
    componentRef.setInput('canEditSelectedRoute', true);
    componentRef.setInput('canEditSelectedLine', true);
    componentRef.setInput('deletePointTipKey', 'topos.editor.deletePoint');
    componentRef.setInput('selectedRoutePathType', 'line');
    componentRef.setInput('selectedRouteIsTraverse', false);
    componentRef.setInput('lineWidth', 2);
    fixture.detectChanges();
  });

  it('renders route rows with outdoor numbering and hides numbers in indoor mode', () => {
    const items = fixture.nativeElement.querySelectorAll('.route-item');
    expect(items).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('.route-num')).toHaveLength(
      2,
    );

    componentRef.setInput('isIndoor', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.route-num')).toHaveLength(
      0,
    );
  });

  it('emits routeSelect when clicking a route item and reveals tips & path controls when selected', () => {
    const selectSpy = vi.fn<(tr: TopoRouteWithRoute) => void>();
    component.routeSelect.subscribe(selectSpy);

    expect(fixture.nativeElement.querySelector('.tips')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.path-type-control'),
    ).toBeNull();

    const firstRow = fixture.nativeElement.querySelector(
      '.route-item[data-route-id="1"]',
    ) as HTMLElement;
    firstRow.click();
    expect(selectSpy).toHaveBeenCalledWith(route1);

    componentRef.setInput('selectedRoute', route1);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tips')).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('.path-type-control'),
    ).not.toBeNull();
  });

  it('emits pathTypeChange, traverseToggle, toggleRouteSelector, and createNewRoute', () => {
    const pathTypeSpy = vi.fn<(type: 'line' | 'circle') => void>();
    const traverseSpy = vi.fn();
    const selectorSpy = vi.fn();
    const createSpy = vi.fn();

    component.pathTypeChange.subscribe(pathTypeSpy);
    component.traverseToggle.subscribe(traverseSpy);
    component.toggleRouteSelector.subscribe(selectorSpy);
    component.createNewRoute.subscribe(createSpy);

    componentRef.setInput('selectedRoute', route1);
    fixture.detectChanges();

    const pathButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.path-type-control button'),
    ) as HTMLButtonElement[];
    expect(pathButtons).toHaveLength(3);

    pathButtons[0].click();
    pathButtons[1].click();
    pathButtons[2].click();

    expect(pathTypeSpy).toHaveBeenNthCalledWith(1, 'line');
    expect(pathTypeSpy).toHaveBeenNthCalledWith(2, 'circle');
    expect(traverseSpy).toHaveBeenCalledTimes(1);

    const headerButtons = Array.from(
      fixture.nativeElement.querySelectorAll('aside > div:first-child button'),
    ) as HTMLButtonElement[];
    headerButtons[0].click();
    headerButtons[1].click();

    expect(selectorSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it('emits pathRemove and routeEdit for the selected route', () => {
    const removeSpy = vi.fn<(tr: TopoRouteWithRoute) => void>();
    const editSpy = vi.fn();
    component.pathRemove.subscribe(removeSpy);
    component.routeEdit.subscribe(editSpy);

    componentRef.setInput('selectedRoute', route1);
    fixture.detectChanges();

    const selectedRow = fixture.nativeElement.querySelector(
      '.route-item[data-route-id="1"]',
    ) as HTMLElement;
    const editBtn = selectedRow.querySelector(
      'button[iconStart="@tui.pencil"]',
    ) as HTMLButtonElement;
    const deleteBtn = selectedRow.querySelector(
      'button[iconStart="@tui.trash"]',
    ) as HTMLButtonElement;

    editBtn.click();
    deleteBtn.click();

    expect(editSpy).toHaveBeenCalledWith(
      expect.objectContaining({ route: route1 }),
    );
    expect(removeSpy).toHaveBeenCalledWith(route1);
  });
});
