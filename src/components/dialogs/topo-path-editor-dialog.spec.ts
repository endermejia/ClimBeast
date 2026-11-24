import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TuiDialogService } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthStateService } from '../../services/auth-state.service';
import { IndoorDataService } from '../../services/indoor-data.service';
import { IndoorService } from '../../services/indoor.service';
import { LayoutService } from '../../services/layout.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { RoutesService } from '../../services/routes.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { ToposService } from '../../services/topos.service';

import { TopoPathEditorResult, TopoRouteWithRoute } from '../../models';

import { IS_BROWSER } from '../../app/is-browser';

import {
  TopoPathEditorConfig,
  TopoPathEditorDialogComponent,
} from './topo-path-editor-dialog';

describe('TopoPathEditorDialogComponent - deleting paths', () => {
  let mockToposService: {
    removeRoute: ReturnType<typeof vi.fn>;
    addRoute: ReturnType<typeof vi.fn>;
    updateRouteOrder: ReturnType<typeof vi.fn>;
    bulkUpdateRoutePaths: ReturnType<typeof vi.fn>;
  };
  let mockDialogs: { open: ReturnType<typeof vi.fn> };
  let completeWith: ReturnType<typeof vi.fn>;

  function createRoute(routeId: number, hasPath: boolean): TopoRouteWithRoute {
    return {
      topo_id: 10,
      route_id: routeId,
      number: 1,
      path: hasPath
        ? {
            points: [
              { x: 0.1, y: 0.9 },
              { x: 0.2, y: 0.2 },
            ],
            type: 'line',
          }
        : null,
      route: {
        id: routeId,
        name: `Route ${routeId}`,
        slug: `route-${routeId}`,
        grade: 14,
        climbing_kind: 'sport',
        height: 20,
        own_ascent: null,
        project: false,
      } as TopoRouteWithRoute['route'],
    };
  }

  async function setup(config: TopoPathEditorConfig) {
    mockToposService = {
      removeRoute: vi.fn().mockResolvedValue(undefined),
      addRoute: vi.fn().mockResolvedValue(undefined),
      updateRouteOrder: vi.fn().mockResolvedValue(undefined),
      bulkUpdateRoutePaths: vi.fn().mockResolvedValue(undefined),
    };
    mockDialogs = { open: vi.fn().mockReturnValue(of(true)) };
    completeWith = vi.fn();

    await TestBed.configureTestingModule({
      imports: [TopoPathEditorDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        {
          provide: POLYMORPHEUS_CONTEXT,
          useValue: { data: config, completeWith },
        },
        { provide: TuiDialogService, useValue: mockDialogs },
        { provide: ToposService, useValue: mockToposService },
        {
          provide: AuthStateService,
          useValue: {
            isAdmin: signal(true),
            adminIndoorCenters: signal([]),
            routesetterIndoorCenters: signal([]),
            canCreateIndoorRoute: vi.fn().mockReturnValue(true),
            canEditIndoorTopo: vi.fn().mockReturnValue(true),
            canEditIndoorRoute: vi.fn().mockReturnValue(true),
            canCreateIndoorLine: vi.fn().mockReturnValue(true),
            canEditIndoorLine: vi.fn().mockReturnValue(true),
          },
        },
        {
          provide: IndoorService,
          useValue: {
            getCenterById: vi.fn().mockResolvedValue(null),
            invalidateTopoCache: vi.fn(),
            reloadCenterRoutes: vi.fn(),
          },
        },
        {
          provide: IndoorDataService,
          useValue: { topoDetailResource: { reload: vi.fn() } },
        },
        {
          provide: LayoutService,
          useValue: {
            isMobile: signal(false),
            isNotDesktop: signal(false),
          },
        },
        {
          provide: OutdoorDataService,
          useValue: {
            cragDetail: signal(null),
            topoDetailResource: { reload: vi.fn() },
            cragDetailResource: { reload: vi.fn() },
          },
        },
        { provide: RoutesService, useValue: {} },
        {
          provide: SupabaseService,
          useValue: {
            whenReady: vi.fn().mockResolvedValue(undefined),
            authUserId: signal('user-1'),
            client: {
              from: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: [], error: null }),
                    single: vi
                      .fn()
                      .mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            },
          },
        },
        {
          provide: ToastService,
          useValue: { success: vi.fn(), error: vi.fn() },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TopoPathEditorDialogComponent);
    return fixture.componentInstance;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('persists path: null in outdoor standalone mode when a line is deleted and not redrawn', async () => {
    const tr1 = createRoute(1, true);
    const tr2 = createRoute(2, true);
    const component = await setup({
      imageUrl: 'https://example.com/topo.jpg',
      topoRoutes: [tr1, tr2],
      topoId: 10,
      standalone: true,
      isIndoor: false,
      cragId: 5,
    });

    await component.removePath(tr1);
    await component.saveAll();

    expect(mockToposService.bulkUpdateRoutePaths).toHaveBeenCalledWith(
      10,
      [
        { routeId: 1, path: null },
        expect.objectContaining({
          routeId: 2,
          path: expect.objectContaining({ points: tr2.path!.points }),
        }),
      ],
      false,
    );
    expect(completeWith).toHaveBeenCalledWith(true);
  });

  it('returns path: null in non-standalone mode when the only line is deleted', async () => {
    const tr1 = createRoute(1, true);
    const component = await setup({
      imageUrl: 'https://example.com/topo.jpg',
      topoRoutes: [tr1],
      topoId: 10,
      standalone: false,
      isIndoor: false,
      cragId: 5,
    });

    await component.removePath(tr1);
    await component.saveAll();

    expect(completeWith).toHaveBeenCalledWith(
      expect.objectContaining<Partial<TopoPathEditorResult>>({
        saved: true,
        paths: [{ routeId: 1, path: null }],
      }),
    );
  });

  it('persists path: null when all points are removed via removePoint', async () => {
    const tr1 = createRoute(1, true);
    tr1.path!.points = [{ x: 0.5, y: 0.5 }];
    const component = await setup({
      imageUrl: 'https://example.com/topo.jpg',
      topoRoutes: [tr1],
      topoId: 10,
      standalone: true,
      isIndoor: false,
      cragId: 5,
    });

    component.removePoint(new MouseEvent('contextmenu'), 1, 0);
    await component.saveAll();

    expect(mockToposService.bulkUpdateRoutePaths).toHaveBeenCalledWith(
      10,
      [{ routeId: 1, path: null }],
      false,
    );
  });
});
