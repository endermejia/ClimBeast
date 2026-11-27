import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { provideTaiga, TuiRoot } from '@taiga-ui/core';
import { provideEventPlugins } from '@taiga-ui/event-plugins';

import { TranslateModule } from '@ngx-translate/core';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppDialogsService } from '../../services/app-dialogs.service';
import { AscentsService } from '../../services/ascents.service';
import { AuthStateService } from '../../services/auth-state.service';
import { CragRoutesDataService } from '../../services/crag-routes-data.service';
import { EquipperRequestsService } from '../../services/equipper-requests.service';
import { EquipperService } from '../../services/equipper.service';
import { IndoorService } from '../../services/indoor.service';
import { LayoutService } from '../../services/layout.service';
import { OnlineStatusService } from '../../services/online-status.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { RoutesService } from '../../services/routes.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { ToposService } from '../../services/topos.service';

import { IndoorRoutesTableComponent } from '../../components/route/indoor-routes-table';
import { OutdoorRoutesTableComponent } from '../../components/route/outdoor-routes-table';
import { RoutesTableComponent } from '../../components/route/routes-table';

import { IndoorRouteWithExtras } from '../../models';

import { STORAGE_KEYS } from '../../constants';

import { IS_BROWSER } from '../../app/is-browser';
import { MockSupabaseService } from '../../testing/mock-supabase.service';
import { EquipperComponent } from './equipper';

function createIndoorRoute(
  overrides: Partial<IndoorRouteWithExtras> = {},
): IndoorRouteWithExtras {
  return {
    id: 'indoor-1',
    center_id: 'center-a',
    center_slug: 'gym-alpha',
    center_name: 'Gym Alpha',
    name: 'Active Boulder',
    slug: 'active-boulder',
    grade: 16,
    climbing_kind: 'boulder',
    color: '#22c55e',
    legacy: false,
    topo_id: null,
    description: null,
    created_at: '2026-01-01T00:00:00Z',
    user_creator_id: null,
    rating: 4,
    ascent_count: 1,
    own_ascent: null,
    topos: [],
    equippers: [],
    ...overrides,
  } as IndoorRouteWithExtras;
}

@Component({
  standalone: true,
  imports: [EquipperComponent, TuiRoot],
  template: `
    <tui-root>
      <app-equipper [id]="'42'" />
    </tui-root>
  `,
})
class HostComponent {}

describe('EquipperComponent indoor routes', () => {
  let indoorRoutesValue: ReturnType<typeof signal<IndoorRouteWithExtras[]>>;
  let indoorRoutesReloadMock: ReturnType<typeof vi.fn>;

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
    localStorage.removeItem(STORAGE_KEYS.showLegacyRoutes);
    indoorRoutesValue = signal<IndoorRouteWithExtras[]>([]);
    indoorRoutesReloadMock = vi.fn();

    const mockSupabase = new MockSupabaseService();

    await TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideTaiga(),
        provideEventPlugins(),
        { provide: IS_BROWSER, useValue: true },
        { provide: SupabaseService, useValue: mockSupabase },
        {
          provide: ToastService,
          useValue: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
        },
        {
          provide: AppDialogsService,
          useValue: { confirm: vi.fn().mockResolvedValue(true) },
        },
        {
          provide: LayoutService,
          useValue: {
            isMobile: signal(false),
            isNavLoading: signal(false),
          },
        },
        {
          provide: OnlineStatusService,
          useValue: { isOffline: signal(false) },
        },
        {
          provide: EquipperService,
          useValue: {
            selectedEquipperId: signal<number | null>(null),
            equipperDetailResource: {
              value: signal(null),
              isLoading: signal(false),
              hasValue: () => false,
              status: signal('resolved'),
            },
            equipperRoutesResource: {
              value: signal([]),
              isLoading: signal(false),
              reload: vi.fn(),
            },
            equipperIndoorRoutesResource: {
              value: indoorRoutesValue,
              isLoading: signal(false),
              reload: indoorRoutesReloadMock,
            },
          },
        },
        {
          provide: EquipperRequestsService,
          useValue: {
            getMyRequestForEquipper: vi.fn().mockResolvedValue(null),
            requestEquipper: vi.fn().mockResolvedValue(true),
            cancelRequest: vi.fn().mockResolvedValue(true),
          },
        },
        {
          provide: AuthStateService,
          useValue: {
            canEditAsAdmin: signal(false),
            areaAdminPermissions: signal<Record<number, boolean>>({}),
            indoorAdminPermissions: signal<Record<string, boolean>>({}),
            checkRouteEditPermission: () => false,
          },
        },
        {
          provide: AscentsService,
          useValue: {
            ascentInfo: signal({}),
            openAscentForm: vi.fn(),
            viewAscent: vi.fn(),
          },
        },
        {
          provide: IndoorService,
          useValue: {
            reloadCenterRoutes: vi.fn(),
            updateRoute: vi.fn(),
            deleteRoute: vi.fn(),
            setRouteEquippers: vi.fn(),
            openIndoorRouteForm: vi.fn(),
          },
        },
        {
          provide: CragRoutesDataService,
          useValue: { cragRoutesResource: { reload: vi.fn() } },
        },
        {
          provide: OutdoorDataService,
          useValue: {
            cragsList: signal([]),
            areaTopos: signal([]),
            cragDetail: signal(null),
            cragDetailResource: { reload: vi.fn() },
          },
        },
        {
          provide: ToposService,
          useValue: { addRoute: vi.fn(), removeRoute: vi.fn() },
        },
        {
          provide: RoutesService,
          useValue: {
            setRouteEquippers: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            toggleRouteProject: vi.fn(),
            openRouteForm: vi.fn(),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders app-indoor-routes-table with showAddRouteToTopo=false, filters legacy routes by default, and reloads on routeUpdated', async () => {
    indoorRoutesValue.set([
      createIndoorRoute({
        id: 'active-1',
        name: 'Active Route',
        legacy: false,
      }),
      createIndoorRoute({ id: 'legacy-1', name: 'Legacy Route', legacy: true }),
    ]);

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const outerSection = (fixture.nativeElement as HTMLElement).querySelector(
      'tui-scrollbar > section, tui-scrollbar section',
    );
    expect(outerSection?.className).toContain('sm:[--lw-table-bleed:1.5rem]');

    const outdoorTableDe = fixture.debugElement.query(
      By.directive(OutdoorRoutesTableComponent),
    );
    expect(outdoorTableDe).toBeTruthy();
    const outdoorTable =
      outdoorTableDe.componentInstance as OutdoorRoutesTableComponent;
    expect(outdoorTable.showArea()).toBe(true);
    expect(outdoorTable.showLocation()).toBe(true);

    const indoorTableDe = fixture.debugElement.query(
      By.directive(IndoorRoutesTableComponent),
    );
    expect(indoorTableDe).toBeTruthy();

    const indoorTable =
      indoorTableDe.componentInstance as IndoorRoutesTableComponent;
    expect(indoorTable.showLocation()).toBe(true);
    expect(indoorTable.showAddRouteToTopo()).toBe(false);
    expect(indoorTable.data().map((r) => r.id)).toEqual(['active-1']);

    // Toggle legacy checkbox on
    const checkbox = (fixture.nativeElement as HTMLElement).querySelector(
      'input[tuiCheckbox]',
    ) as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    checkbox.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(indoorTable.data().map((r) => r.id)).toEqual([
      'active-1',
      'legacy-1',
    ]);
    expect(localStorage.getItem(STORAGE_KEYS.showLegacyRoutes)).toBe('true');

    // Emit routeUpdated and verify reload
    indoorTable.routeUpdated.emit();
    expect(indoorRoutesReloadMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the legacy toggle visible and renders empty state cleanly when all indoor routes are legacy', async () => {
    indoorRoutesValue.set([
      createIndoorRoute({ id: 'legacy-only', name: 'Old Climb', legacy: true }),
    ]);

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const checkbox = (fixture.nativeElement as HTMLElement).querySelector(
      'input[tuiCheckbox]',
    ) as HTMLInputElement | null;
    expect(checkbox).toBeTruthy();

    const indoorTableDe = fixture.debugElement.query(
      By.directive(IndoorRoutesTableComponent),
    );
    const innerTable = indoorTableDe.query(By.directive(RoutesTableComponent))
      .componentInstance as RoutesTableComponent;
    expect(innerTable.data()).toEqual([]);
    expect(
      (indoorTableDe.nativeElement as HTMLElement).querySelector(
        'app-empty-state',
      ),
    ).toBeTruthy();

    // Toggling the checkbox brings the legacy route back
    checkbox!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(innerTable.data()).toHaveLength(1);
  });
});
