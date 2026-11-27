import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { provideTaiga, TuiRoot } from '@taiga-ui/core';
import { provideEventPlugins } from '@taiga-ui/event-plugins';

import { TranslateModule } from '@ngx-translate/core';
import type { Session } from '@supabase/supabase-js';
import { of } from 'rxjs';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppDialogsService } from '../../services/app-dialogs.service';
import { AscentsService } from '../../services/ascents.service';
import { AuthStateService } from '../../services/auth-state.service';
import { IndoorService } from '../../services/indoor.service';
import { LayoutService } from '../../services/layout.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

import {
  AscentType,
  EquipperDto,
  IndoorRouteWithExtras,
  RoutesTableRow,
} from '../../models';

import { IS_BROWSER } from '../../app/is-browser';
import { MockSupabaseService } from '../../testing/mock-supabase.service';
import { IndoorRoutesTableComponent } from './indoor-routes-table';
import { RoutesTableComponent } from './routes-table';

function createIndoorRoute(
  overrides: Partial<IndoorRouteWithExtras> = {},
): IndoorRouteWithExtras {
  return {
    id: 'route-1',
    center_id: 'center-a',
    center_slug: 'gym-alpha',
    center_name: 'Gym Alpha',
    name: 'Alpha Crimps',
    slug: 'alpha-crimps',
    grade: 18,
    climbing_kind: 'boulder',
    color: '#ef4444',
    legacy: false,
    topo_id: null,
    description: null,
    created_at: '2026-01-01T00:00:00Z',
    user_creator_id: null,
    rating: 4.5,
    ascent_count: 0,
    own_ascent: null,
    topos: [
      {
        id: 'topo-a1',
        name: 'Main Cave',
        legacy: false,
        has_path: true,
      },
    ],
    equippers: [
      {
        id: 11,
        name: 'Alex Setter',
        created_at: '',
        description: null,
        user_id: null,
        avatar: null,
      },
    ],
    ...overrides,
  } as IndoorRouteWithExtras;
}

@Component({
  standalone: true,
  imports: [IndoorRoutesTableComponent, TuiRoot],
  template: `
    <tui-root>
      <app-indoor-routes-table
        [data]="routes()"
        [centerId]="centerId()"
        [centerSlug]="centerSlug()"
        [availableTopos]="availableTopos()"
        [showRowColors]="showRowColors()"
        [showAddRouteToTopo]="showAddRouteToTopo()"
        [showLocation]="showLocation()"
        (routeUpdated)="onRouteUpdated()"
      />
    </tui-root>
  `,
})
class HostComponent {
  routes = signal<IndoorRouteWithExtras[]>([]);
  centerId = signal<string | undefined>(undefined);
  centerSlug = signal<string | undefined>(undefined);
  availableTopos = signal<{ id: number | string; name: string }[]>([]);
  showRowColors = signal(true);
  showAddRouteToTopo = signal(true);
  showLocation = signal(false);
  updatedCount = 0;

  onRouteUpdated(): void {
    this.updatedCount++;
  }
}

describe('IndoorRoutesTableComponent', () => {
  let indoorAdminPermissions: ReturnType<
    typeof signal<Record<string, boolean>>
  >;
  let canEditAsAdmin: ReturnType<typeof signal<boolean>>;
  let openAscentFormMock: ReturnType<typeof vi.fn>;
  let viewAscentMock: ReturnType<typeof vi.fn>;
  let reloadCenterRoutesMock: ReturnType<typeof vi.fn>;
  let updateRouteMock: ReturnType<typeof vi.fn>;
  let deleteRouteMock: ReturnType<typeof vi.fn>;
  let setRouteEquippersMock: ReturnType<typeof vi.fn>;
  let openIndoorRouteFormMock: ReturnType<typeof vi.fn>;
  let confirmMock: ReturnType<typeof vi.fn>;
  let mockToast: {
    error: ReturnType<typeof vi.fn>;
    success: ReturnType<typeof vi.fn>;
  };
  let topoInsertMock: ReturnType<typeof vi.fn>;
  let topoDeleteEqRouteMock: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    if (!HTMLElement.prototype.scrollTo) {
      HTMLElement.prototype.scrollTo = () => {
        /* jsdom noop */
      };
    }
    if (!window.matchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: () => false,
        }),
      });
    }
  });

  beforeEach(async () => {
    indoorAdminPermissions = signal<Record<string, boolean>>({});
    canEditAsAdmin = signal(false);
    openAscentFormMock = vi.fn(() => of(true));
    viewAscentMock = vi.fn();
    reloadCenterRoutesMock = vi.fn();
    updateRouteMock = vi.fn().mockResolvedValue(true);
    deleteRouteMock = vi.fn().mockResolvedValue(true);
    setRouteEquippersMock = vi.fn(
      async (
        _routeId: string,
        equippers: readonly (EquipperDto | string)[],
      ): Promise<EquipperDto[]> =>
        equippers.map((e, i) =>
          typeof e === 'string'
            ? {
                id: 50 + i,
                name: e,
                created_at: '',
                description: null,
                user_id: null,
              }
            : e,
        ),
    );
    openIndoorRouteFormMock = vi.fn().mockResolvedValue(true);
    confirmMock = vi.fn().mockResolvedValue(true);
    mockToast = { error: vi.fn(), success: vi.fn() };
    topoInsertMock = vi.fn().mockResolvedValue({ error: null });
    topoDeleteEqRouteMock = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = new MockSupabaseService();
    mockSupabase.setSession({ user: { id: 'user-1' } } as Session);
    mockSupabase.client.from = ((table: string) => {
      if (table === 'indoor_topo_routes') {
        return {
          insert: topoInsertMock,
          delete: () => ({
            eq: () => ({
              eq: topoDeleteEqRouteMock,
            }),
          }),
        };
      }
      if (table === 'equippers') {
        return {
          select: () => ({
            ilike: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return MockSupabaseService.prototype;
    }) as unknown as typeof mockSupabase.client.from;

    await TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideTaiga(),
        provideEventPlugins(),
        { provide: IS_BROWSER, useValue: true },
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: ToastService, useValue: mockToast },
        {
          provide: AppDialogsService,
          useValue: { confirm: confirmMock },
        },
        {
          provide: LayoutService,
          useValue: { isMobile: signal(false) },
        },
        {
          provide: AuthStateService,
          useValue: {
            indoorAdminPermissions,
            canEditAsAdmin,
          },
        },
        {
          provide: AscentsService,
          useValue: {
            ascentInfo: signal({
              default: {
                background: '#22c55e',
                backgroundSubtle: 'rgba(34,197,94,0.1)',
                icon: '@tui.check',
              },
              flash: {
                background: '#f59e0b',
                backgroundSubtle: 'rgba(245,158,11,0.1)',
                icon: '@tui.zap',
              },
            }),
            openAscentForm: openAscentFormMock,
            viewAscent: viewAscentMock,
          },
        },
        {
          provide: IndoorService,
          useValue: {
            reloadCenterRoutes: reloadCenterRoutesMock,
            updateRoute: updateRouteMock,
            deleteRoute: deleteRouteMock,
            setRouteEquippers: setRouteEquippersMock,
            openIndoorRouteForm: openIndoorRouteFormMock,
          },
        },
      ],
    }).compileComponents();
  });

  function getInnerTable(
    fixture: ReturnType<typeof TestBed.createComponent<HostComponent>>,
  ): RoutesTableComponent {
    return fixture.debugElement.query(By.directive(RoutesTableComponent))
      .componentInstance as RoutesTableComponent;
  }

  it('maps multi-center indoor routes using item.center_slug when centerId and centerSlug are omitted', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.routes.set([
      createIndoorRoute({
        id: 'r-alpha',
        center_id: 'center-a',
        center_slug: 'gym-alpha',
        name: 'Alpha Crimps',
        slug: 'alpha-crimps',
        legacy: true,
        color: '#ef4444',
        grade: 18,
        rating: 4.5,
        ascent_count: 3,
        own_ascent: { id: 'asc-1', type: 'flash' as AscentType },
        topos: [
          { id: 'topo-a1', name: 'Main Cave', legacy: false, has_path: true },
        ],
      }),
      createIndoorRoute({
        id: 'r-beta',
        center_id: 'center-b',
        center_slug: 'gym-beta',
        name: 'Beta Slab',
        slug: 'beta-slab',
        legacy: false,
        color: '#3b82f6',
        grade: 14,
        rating: 3,
        ascent_count: 0,
        own_ascent: null,
        topos: [
          { id: 'topo-b2', name: 'Slab Wall', legacy: false, has_path: false },
        ],
      }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const rows = getInnerTable(fixture).data();
    expect(rows).toHaveLength(2);

    const alpha = rows.find((r) => r.id === 'r-alpha')!;
    const beta = rows.find((r) => r.id === 'r-beta')!;

    expect(alpha.link).toEqual([
      '/indoor',
      'gym-alpha',
      'route',
      'alpha-crimps',
    ]);
    expect(alpha.topos[0].link).toEqual([
      '/indoor',
      'gym-alpha',
      'topo',
      'topo-a1',
    ]);
    expect(alpha.legacy).toBe(true);
    expect(alpha.color).toBe('#ef4444');
    expect(alpha.rating).toBe(4.5);
    expect(alpha.ascents).toBe(3);
    expect(alpha.own_ascent).toEqual({ id: 'asc-1', type: 'flash' });

    expect(beta.link).toEqual(['/indoor', 'gym-beta', 'route', 'beta-slab']);
    expect(beta.topos[0].link).toEqual([
      '/indoor',
      'gym-beta',
      'topo',
      'topo-b2',
    ]);
    expect(beta.legacy).toBe(false);

    // Override with explicit centerSlug when provided
    fixture.componentInstance.centerSlug.set('forced-slug');
    fixture.detectChanges();
    const overriddenRows = getInnerTable(fixture).data();
    expect(overriddenRows[0].link).toEqual([
      '/indoor',
      'forced-slug',
      'route',
      'alpha-crimps',
    ]);
  });

  it('resolves per-row canEdit via r.center_id when centerId is omitted', async () => {
    indoorAdminPermissions.set({ 'center-a': true });
    canEditAsAdmin.set(false);

    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.routes.set([
      createIndoorRoute({
        id: 'r-editable-no-ascents',
        center_id: 'center-a',
        ascent_count: 0,
        own_ascent: null,
      }),
      createIndoorRoute({
        id: 'r-editable-with-ascents',
        center_id: 'center-a',
        ascent_count: 2,
        own_ascent: null,
      }),
      createIndoorRoute({
        id: 'r-readonly',
        center_id: 'center-b',
        ascent_count: 0,
        own_ascent: null,
      }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const rows = getInnerTable(fixture).data();
    const byId = new Map<string | number, RoutesTableRow>(
      rows.map((row) => [row.id, row]),
    );

    expect(byId.get('r-editable-no-ascents')?.canEdit).toBe(true);
    expect(byId.get('r-editable-no-ascents')?.canDelete).toBe(true);
    expect(byId.get('r-editable-no-ascents')?.canAddTopo).toBe(true);

    expect(byId.get('r-editable-with-ascents')?.canEdit).toBe(true);
    expect(byId.get('r-editable-with-ascents')?.canDelete).toBe(false);

    expect(byId.get('r-readonly')?.canEdit).toBe(false);
    expect(byId.get('r-readonly')?.canDelete).toBe(false);
    expect(byId.get('r-readonly')?.canAddTopo).toBe(false);
  });

  it('resolves canEdit via centerId and global canEditAsAdmin when centerId is provided', async () => {
    indoorAdminPermissions.set({ 'center-other': true });
    canEditAsAdmin.set(false);

    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.centerId.set('center-target');
    fixture.componentInstance.routes.set([
      createIndoorRoute({ id: 'r-1', center_id: 'center-target' }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(getInnerTable(fixture).data()[0].canEdit).toBe(false);

    // Grant global admin
    canEditAsAdmin.set(true);
    fixture.detectChanges();
    expect(getInnerTable(fixture).data()[0].canEdit).toBe(true);

    // Revoke global admin and grant specific center permission
    canEditAsAdmin.set(false);
    indoorAdminPermissions.set({ 'center-target': true });
    fixture.detectChanges();
    expect(getInnerTable(fixture).data()[0].canEdit).toBe(true);
  });

  it('passes showAddRouteToTopo and showRowColors through to app-routes-table', async () => {
    indoorAdminPermissions.set({ 'center-a': true });

    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.routes.set([
      createIndoorRoute({ id: 'r-1', center_id: 'center-a' }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const innerTable = getInnerTable(fixture);
    expect(innerTable.showAddRouteToTopo()).toBe(true);
    expect(innerTable.showRowColors()).toBe(true);
    expect(innerTable.data()[0].canAddTopo).toBe(true);

    fixture.componentInstance.showAddRouteToTopo.set(false);
    fixture.componentInstance.showRowColors.set(false);
    fixture.detectChanges();

    expect(innerTable.showAddRouteToTopo()).toBe(false);
    expect(innerTable.showRowColors()).toBe(false);
    expect(innerTable.data()[0].canAddTopo).toBe(false);
  });

  it('emits routeUpdated on logAscent without reloading center routes when centerId is omitted, and reloads when centerId is set', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.routes.set([
      createIndoorRoute({
        id: 'r-1',
        center_id: 'center-a',
        name: 'Beta Move',
      }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const innerTable = getInnerTable(fixture);
    const row = innerTable.data()[0];

    innerTable.logAscent.emit(row);
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));

    expect(openAscentFormMock).toHaveBeenCalledWith(
      expect.objectContaining({
        routeId: 'r-1',
        routeName: 'Beta Move',
        isIndoor: true,
      }),
    );
    expect(fixture.componentInstance.updatedCount).toBe(1);
    expect(reloadCenterRoutesMock).not.toHaveBeenCalled();

    // Now set centerId and log ascent again
    fixture.componentInstance.centerId.set('center-a');
    fixture.detectChanges();

    innerTable.logAscent.emit(innerTable.data()[0]);
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));

    expect(fixture.componentInstance.updatedCount).toBe(2);
    expect(reloadCenterRoutesMock).toHaveBeenCalledTimes(1);
  });

  it('emits routeUpdated after renaming, deleting, and toggling topo on a route', async () => {
    indoorAdminPermissions.set({ 'center-a': true });

    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.routes.set([
      createIndoorRoute({
        id: 'r-1',
        center_id: 'center-a',
        name: 'Old Name',
        ascent_count: 0,
        own_ascent: null,
      }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const innerTable = getInnerTable(fixture);
    const row = innerTable.data()[0];

    // 1. Rename
    innerTable.updateRouteName.emit({ row, name: 'New Name' });
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));

    expect(updateRouteMock).toHaveBeenCalledWith('r-1', { name: 'New Name' });
    expect(fixture.componentInstance.updatedCount).toBe(1);

    // 2. Toggle topo (attach)
    innerTable.toggleRouteOnTopo.emit({
      topoId: 'topo-9',
      routeId: 'r-1',
      isAttached: false,
    });
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));

    expect(topoInsertMock).toHaveBeenCalledWith({
      topo_id: 'topo-9',
      route_id: 'r-1',
      number: 0,
      user_creator_id: 'user-1',
    });
    expect(fixture.componentInstance.updatedCount).toBe(2);

    // 3. Delete
    innerTable.deleteRoute.emit(row);
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));

    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(deleteRouteMock).toHaveBeenCalledWith('r-1');
    expect(fixture.componentInstance.updatedCount).toBe(3);
  });

  it('emits routeUpdated after updating equippers on a multi-center route', async () => {
    indoorAdminPermissions.set({ 'center-a': true });

    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.routes.set([
      createIndoorRoute({
        id: 'r-1',
        center_id: 'center-a',
        equippers: [],
      }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const innerTable = getInnerTable(fixture);
    innerTable.toggleEditing();
    innerTable.selectedCell.set({ rowKey: 'r-1', col: 'equippers' });
    fixture.detectChanges();
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const equipperInput = hostEl.querySelector(
      'td[data-row-key="r-1"][data-col="equippers"] input[tuiInputChip]',
    ) as HTMLInputElement;
    expect(equipperInput).toBeTruthy();

    equipperInput.focus();
    equipperInput.value = 'New Setter';
    equipperInput.dispatchEvent(new Event('input', { bubbles: true }));
    equipperInput.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    fixture.detectChanges();

    innerTable.toggleEditing();
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    expect(setRouteEquippersMock).toHaveBeenCalledWith('r-1', ['New Setter']);
    expect(fixture.componentInstance.updatedCount).toBe(1);
  });

  it('includes center column with indoor center link when showLocation is true', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.showLocation.set(true);
    fixture.componentInstance.routes.set([
      createIndoorRoute({
        id: 'r-loc',
        center_slug: 'sputnik-chamberi',
        center_name: 'Sputnik Chamberí',
      }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const innerTable = getInnerTable(fixture);
    expect(innerTable.columns()).toContain('center');
    expect(innerTable.showLocation()).toBe(true);
    expect(innerTable.data()[0].center_name).toBe('Sputnik Chamberí');
    expect(innerTable.data()[0].center_slug).toBe('sputnik-chamberi');

    const centerCell = (fixture.nativeElement as HTMLElement).querySelector(
      'td[data-row-key="r-loc"][data-col="center"] a',
    ) as HTMLAnchorElement | null;
    expect(centerCell?.textContent?.trim()).toBe('Sputnik Chamberí');
    expect(centerCell?.getAttribute('href')).toBe('/indoor/sputnik-chamberi');
  });
});
