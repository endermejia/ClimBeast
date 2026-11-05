import { Location } from '@angular/common';
import { ComponentRef, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IS_BROWSER } from '../../app/is-browser';

import { AuthStateService } from '../../services/auth-state.service';
import { CragRoutesDataService } from '../../services/crag-routes-data.service';
import { IndoorDataService } from '../../services/indoor-data.service';
import { IndoorService } from '../../services/indoor.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { ToposService } from '../../services/topos.service';

import { TopoFormComponent } from './topo-form';

import { IndoorCenterDto, IndoorRouteDto } from '../../models';

describe('TopoFormComponent - Indoor Permissions & Route Creation', () => {
  let fixture: ComponentFixture<TopoFormComponent>;
  let component: TopoFormComponent;
  let componentRef: ComponentRef<TopoFormComponent>;

  const mockCenterAll: IndoorCenterDto = {
    id: 'center-1',
    name: 'Boulder Club',
    slug: 'boulder-club',
    created_at: '',
    description: null,
    location: null,
    avatar_url: null,
    gallery_urls: null,
    latitude: null,
    longitude: null,
    city: null,
    country: null,
    schedule: null,
    warning: null,
    contact_info: null,
    permissions: {
      can_create_routes: 'all',
      can_create_lines: 'all',
      can_edit_routes: 'routesetters_and_creator',
      can_edit_lines: 'routesetters_and_creator',
      can_create_topos: 'routesetters',
      can_edit_topos: 'routesetters_and_creator',
      can_archive_routes: 'routesetters_and_creator',
      can_archive_topos: 'routesetters_and_creator',
    },
  };

  const mockCenterRestricted: IndoorCenterDto = {
    ...mockCenterAll,
    id: 'center-2',
    permissions: {
      can_create_routes: 'routesetters',
      can_create_lines: 'routesetters',
      can_edit_routes: 'routesetters_and_creator',
      can_edit_lines: 'routesetters_and_creator',
      can_create_topos: 'routesetters',
      can_edit_topos: 'routesetters_and_creator',
      can_archive_routes: 'routesetters_and_creator',
      can_archive_topos: 'routesetters_and_creator',
    },
  };

  let mockIndoorService: {
    getCenterById: ReturnType<typeof vi.fn>;
    openIndoorRouteForm: ReturnType<typeof vi.fn>;
    createTopo: ReturnType<typeof vi.fn>;
    updateTopo: ReturnType<typeof vi.fn>;
    deleteRoute: ReturnType<typeof vi.fn>;
    reloadCenterRoutes: ReturnType<typeof vi.fn>;
    uploadAsset: ReturnType<typeof vi.fn>;
  };

  let mockToposService: {
    openTopoPathEditor: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    uploadPhoto: ReturnType<typeof vi.fn>;
    removeRoute: ReturnType<typeof vi.fn>;
    addRoute: ReturnType<typeof vi.fn>;
    updateRouteOrder: ReturnType<typeof vi.fn>;
    bulkUpdateRoutePaths: ReturnType<typeof vi.fn>;
  };

  let mockAuthState: {
    isAdmin: ReturnType<typeof vi.fn>;
    canCreateIndoorRoute: ReturnType<typeof vi.fn>;
    canCreateIndoorInCenter: ReturnType<typeof vi.fn>;
    canCreateIndoorLine: ReturnType<typeof vi.fn>;
    canEditIndoorLine: ReturnType<typeof vi.fn>;
  };

  let mockSupabase: {
    whenReady: ReturnType<typeof vi.fn>;
    authUserId: ReturnType<typeof vi.fn>;
    client: {
      from: ReturnType<typeof vi.fn>;
    };
    getPublicUrl: ReturnType<typeof vi.fn>;
    getTopoSignedUrl: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockIndoorService = {
      getCenterById: vi.fn().mockResolvedValue(mockCenterAll),
      openIndoorRouteForm: vi.fn(),
      createTopo: vi
        .fn()
        .mockResolvedValue({ id: 'topo-new-1', name: 'Wall A' }),
      updateTopo: vi.fn().mockResolvedValue(true),
      deleteRoute: vi.fn().mockResolvedValue(true),
      reloadCenterRoutes: vi.fn(),
      uploadAsset: vi.fn().mockResolvedValue('uploaded-url'),
    };

    mockToposService = {
      openTopoPathEditor: vi.fn().mockResolvedValue({ saved: true }),
      create: vi.fn().mockResolvedValue({ id: 1, slug: 'test' }),
      update: vi.fn().mockResolvedValue({ id: 1, slug: 'test' }),
      uploadPhoto: vi.fn().mockResolvedValue(undefined),
      removeRoute: vi.fn().mockResolvedValue(undefined),
      addRoute: vi.fn().mockResolvedValue(undefined),
      updateRouteOrder: vi.fn().mockResolvedValue(undefined),
      bulkUpdateRoutePaths: vi.fn().mockResolvedValue(undefined),
    };

    mockAuthState = {
      isAdmin: vi.fn().mockReturnValue(false),
      canCreateIndoorRoute: vi.fn((center: IndoorCenterDto) => {
        const p = center?.permissions as Record<string, string> | undefined;
        return p?.['can_create_routes'] === 'all';
      }),
      canCreateIndoorInCenter: vi.fn().mockReturnValue(false),
      canCreateIndoorLine: vi.fn((center: IndoorCenterDto) => {
        const p = center?.permissions as Record<string, string> | undefined;
        return p?.['can_create_lines'] === 'all';
      }),
      canEditIndoorLine: vi.fn().mockReturnValue(true),
    };

    mockSupabase = {
      whenReady: vi.fn().mockResolvedValue(undefined),
      authUserId: vi.fn().mockReturnValue('user-climber-1'),
      client: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
          update: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      },
      getPublicUrl: vi.fn().mockReturnValue('https://example.com/asset.jpg'),
      getTopoSignedUrl: vi
        .fn()
        .mockResolvedValue('https://example.com/signed.jpg'),
    };

    await TestBed.configureTestingModule({
      imports: [TopoFormComponent, TranslateModule.forRoot()],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        { provide: AuthStateService, useValue: mockAuthState },
        { provide: IndoorService, useValue: mockIndoorService },
        { provide: ToposService, useValue: mockToposService },
        { provide: SupabaseService, useValue: mockSupabase },
        {
          provide: OutdoorDataService,
          useValue: {
            cragDetail: signal(null),
            selectedCragSlug: signal(''),
            topoPhotoVersion: signal(1),
            topoDetailResource: { reload: vi.fn() },
          },
        },
        {
          provide: IndoorDataService,
          useValue: {
            centerToposResource: { reload: vi.fn() },
          },
        },
        {
          provide: CragRoutesDataService,
          useValue: {
            cragRoutes: signal([]),
          },
        },
        {
          provide: ToastService,
          useValue: { success: vi.fn(), error: vi.fn() },
        },
        { provide: Location, useValue: { back: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TopoFormComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('allows route creation when isIndoor is true and center has can_create_routes = all', () => {
    componentRef.setInput('typeInput', 'indoor');
    componentRef.setInput('centerIdInput', 'center-1');
    componentRef.setInput('centerInput', mockCenterAll);
    fixture.detectChanges();

    expect(component.canCreateRoute()).toBe(true);

    const el: HTMLElement = fixture.nativeElement;
    const newRouteBtn = el.querySelector('button[iconStart="@tui.plus"]');
    expect(newRouteBtn).not.toBeNull();
  });

  it('hides route creation button when center restricts routes to routesetters', () => {
    componentRef.setInput('typeInput', 'indoor');
    componentRef.setInput('centerIdInput', 'center-2');
    componentRef.setInput('centerInput', mockCenterRestricted);
    fixture.detectChanges();

    expect(component.canCreateRoute()).toBe(false);

    const el: HTMLElement = fixture.nativeElement;
    const newRouteBtn = el.querySelector('button[iconStart="@tui.plus"]');
    expect(newRouteBtn).toBeNull();
  });

  it('passes effective center to openTopoPathEditor when opening the path editor', async () => {
    componentRef.setInput('typeInput', 'indoor');
    componentRef.setInput('centerIdInput', 'center-1');
    componentRef.setInput('centerInput', mockCenterAll);
    fixture.detectChanges();

    // Call openPathEditor with a dummy overrideUrl
    await (
      component as unknown as { openPathEditor: (url: string) => Promise<void> }
    ).openPathEditor('https://example.com/photo.jpg');

    expect(mockToposService.openTopoPathEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        isIndoor: true,
        centerId: 'center-1',
        center: mockCenterAll,
      }),
    );
  });

  it('createNewIndoorRoute opens route form and appends created route to selectedRoutes and pendingNewIndoorRouteIds', async () => {
    componentRef.setInput('typeInput', 'indoor');
    componentRef.setInput('centerIdInput', 'center-1');
    componentRef.setInput('centerInput', mockCenterAll);
    fixture.detectChanges();

    const createdRoute: IndoorRouteDto = {
      id: 'route-new-1',
      name: 'Bloque Azul',
      slug: 'bloque-azul',
      center_id: 'center-1',
      grade: 14,
      color: '#3B82F6',
      climbing_kind: 'boulder',
      legacy: false,
      topo_id: null,
      user_creator_id: 'user-climber-1',
      created_at: '',
    };

    mockIndoorService.openIndoorRouteForm.mockResolvedValue(createdRoute);

    await component.createNewIndoorRoute();

    expect(mockIndoorService.openIndoorRouteForm).toHaveBeenCalledWith(
      'center-1',
      undefined,
      expect.objectContaining({ hideTopo: true }),
    );

    expect(component.model().selectedRoutes).toContainEqual(
      createdRoute as never,
    );
    expect(
      (
        component as unknown as { pendingNewIndoorRouteIds: () => string[] }
      ).pendingNewIndoorRouteIds(),
    ).toContain('route-new-1');
  });

  it('goBack deletes pending newly created indoor routes on cancel', () => {
    componentRef.setInput('typeInput', 'indoor');
    componentRef.setInput('centerIdInput', 'center-1');
    fixture.detectChanges();

    (
      component as unknown as {
        pendingNewIndoorRouteIds: { set: (ids: string[]) => void };
      }
    ).pendingNewIndoorRouteIds.set(['pending-route-1', 'pending-route-2']);

    component.goBack();

    expect(mockIndoorService.deleteRoute).toHaveBeenCalledWith(
      'pending-route-1',
    );
    expect(mockIndoorService.deleteRoute).toHaveBeenCalledWith(
      'pending-route-2',
    );
  });
});
