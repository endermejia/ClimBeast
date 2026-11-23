import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { provideTaiga, TuiDialogService, TuiRoot } from '@taiga-ui/core';
import { provideEventPlugins } from '@taiga-ui/event-plugins';

import { TranslateModule } from '@ngx-translate/core';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AscentsService } from '../../services/ascents.service';
import { AuthStateService } from '../../services/auth-state.service';
import { CragRoutesDataService } from '../../services/crag-routes-data.service';
import { LayoutService } from '../../services/layout.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { RoutesService } from '../../services/routes.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { ToposService } from '../../services/topos.service';

import { EquipperDto, RouteItem } from '../../models';

import { IS_BROWSER } from '../../app/is-browser';
import { MockSupabaseService } from '../../testing/mock-supabase.service';

import { OutdoorRoutesTableComponent } from './outdoor-routes-table';
import { RoutesTableComponent } from './routes-table';

function createRouteItem(id: number, equippers: EquipperDto[] = []): RouteItem {
  return {
    id,
    crag_id: 10,
    area_id: 1,
    area_slug: 'test-area',
    area_name: 'Test Area',
    crag_slug: 'test-crag',
    crag_name: 'Test Crag',
    name: `Route ${id}`,
    slug: `route-${id}`,
    grade: 14,
    climbing_kind: 'sport',
    height: 20,
    created_at: '',
    user_creator_id: null,
    eight_anu_route_slugs: null,
    liked: false,
    project: false,
    climbed: false,
    rating: 0,
    ascent_count: 0,
    topos: [],
    equippers,
  } as unknown as RouteItem;
}

@Component({
  standalone: true,
  imports: [OutdoorRoutesTableComponent, TuiRoot],
  template: `
    <tui-root>
      <app-outdoor-routes-table
        [data]="routes()"
        [showLocation]="true"
        (routeUpdated)="onRouteUpdated()"
      />
    </tui-root>
  `,
})
class HostComponent {
  routes = signal<RouteItem[]>([createRouteItem(1), createRouteItem(2)]);
  updatedCount = 0;

  onRouteUpdated(): void {
    this.updatedCount++;
  }
}

describe('OutdoorRoutesTableComponent equippers editing', () => {
  let setRouteEquippersMock: ReturnType<typeof vi.fn>;
  let mockToast: {
    error: ReturnType<typeof vi.fn>;
    success: ReturnType<typeof vi.fn>;
  };

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
    setRouteEquippersMock = vi.fn(
      async (
        _routeId: number,
        equippers: readonly (EquipperDto | string)[],
      ): Promise<EquipperDto[]> =>
        equippers.map((item, i) =>
          typeof item === 'string'
            ? {
                id: 100 + i,
                name: item,
                created_at: '',
                description: null,
                user_id: null,
              }
            : item,
        ),
    );
    mockToast = { error: vi.fn(), success: vi.fn() };
    const mockSupabase = new MockSupabaseService();
    const existingEquippers: EquipperDto[] = [
      {
        id: 7,
        name: 'Juan Pérez',
        created_at: '',
        description: null,
        user_id: null,
      },
    ];
    mockSupabase.client.from = ((table: string) => {
      if (table === 'equippers') {
        return {
          select: () => ({
            ilike: (_col: string, pattern: string) => ({
              order: () => ({
                limit: () => {
                  const q = pattern.replace(/%/g, '').toLowerCase();
                  return Promise.resolve({
                    data: existingEquippers.filter((e) =>
                      e.name.toLowerCase().includes(q),
                    ),
                    error: null,
                  });
                },
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
        { provide: TuiDialogService, useValue: { open: vi.fn() } },
        {
          provide: LayoutService,
          useValue: { isMobile: signal(false) },
        },
        {
          provide: AuthStateService,
          useValue: {
            canEditAsAdmin: signal(true),
            areaAdminPermissions: signal<Record<number, boolean>>({ 1: true }),
            checkRouteEditPermission: () => true,
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
          provide: CragRoutesDataService,
          useValue: {
            cragRoutesResource: { reload: vi.fn() },
          },
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
          useValue: {
            addRoute: vi.fn(),
            removeRoute: vi.fn(),
          },
        },
        {
          provide: RoutesService,
          useValue: {
            setRouteEquippers: setRouteEquippersMock,
            update: vi.fn(),
            delete: vi.fn(),
            toggleRouteProject: vi.fn(),
            openRouteForm: vi.fn(),
          },
        },
      ],
    }).compileComponents();
  });

  it('saves typed equipper when clicking another cell without pressing Enter and keeps it visible', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComp = fixture.debugElement.query(
      By.directive(RoutesTableComponent),
    ).componentInstance as RoutesTableComponent;

    tableComp.toggleEditing();
    tableComp.selectedCell.set({ rowKey: '1', col: 'equippers' });
    fixture.detectChanges();
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const equipperInput = hostEl.querySelector(
      'td[data-row-key="1"][data-col="equippers"] input[tuiInputChip]',
    ) as HTMLInputElement;
    expect(equipperInput).toBeTruthy();

    equipperInput.focus();
    equipperInput.value = 'Pedro Nuevo';
    equipperInput.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    // Click another cell directly without pressing Enter
    const otherCell = hostEl.querySelector(
      'td[data-row-key="2"][data-col="height"]',
    ) as HTMLElement;
    otherCell.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    expect(setRouteEquippersMock).toHaveBeenCalledTimes(1);
    expect(setRouteEquippersMock).toHaveBeenCalledWith(1, ['Pedro Nuevo']);
    expect(fixture.componentInstance.updatedCount).toBe(1);

    const route1EquippersCell = hostEl.querySelector(
      'td[data-row-key="1"][data-col="equippers"]',
    ) as HTMLElement;
    expect(route1EquippersCell.textContent).toContain('Pedro Nuevo');
  });

  it('saves typed equipper when pressing Enter and preserves it after leaving edit mode', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComp = fixture.debugElement.query(
      By.directive(RoutesTableComponent),
    ).componentInstance as RoutesTableComponent;

    tableComp.toggleEditing();
    tableComp.selectedCell.set({ rowKey: '1', col: 'equippers' });
    fixture.detectChanges();
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const equipperInput = hostEl.querySelector(
      'td[data-row-key="1"][data-col="equippers"] input[tuiInputChip]',
    ) as HTMLInputElement;
    expect(equipperInput).toBeTruthy();

    equipperInput.focus();
    equipperInput.value = 'Ana García';
    equipperInput.dispatchEvent(new Event('input', { bubbles: true }));
    equipperInput.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    fixture.detectChanges();

    // Stop editing immediately
    tableComp.toggleEditing();
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    expect(setRouteEquippersMock).toHaveBeenCalledTimes(1);
    expect(setRouteEquippersMock).toHaveBeenCalledWith(1, ['Ana García']);
    expect(fixture.componentInstance.updatedCount).toBe(1);

    const route1EquippersCell = hostEl.querySelector(
      'td[data-row-key="1"][data-col="equippers"]',
    ) as HTMLElement;
    expect(route1EquippersCell.textContent).toContain('Ana García');
  });

  it('does not commit partial search text on blur when focus moves into the dropdown listbox', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComp = fixture.debugElement.query(
      By.directive(RoutesTableComponent),
    ).componentInstance as RoutesTableComponent;

    tableComp.toggleEditing();
    tableComp.selectedCell.set({ rowKey: '1', col: 'equippers' });
    fixture.detectChanges();
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const equipperInput = hostEl.querySelector(
      'td[data-row-key="1"][data-col="equippers"] input[tuiInputChip]',
    ) as HTMLInputElement;

    equipperInput.focus();
    equipperInput.value = 'Jua';
    equipperInput.dispatchEvent(new Event('input', { bubbles: true }));

    const listbox = document.createElement('div');
    listbox.setAttribute('role', 'listbox');
    const option = document.createElement('button');
    listbox.appendChild(option);
    document.body.appendChild(listbox);

    try {
      equipperInput.dispatchEvent(
        new FocusEvent('blur', { relatedTarget: option }),
      );
      fixture.detectChanges();
      await fixture.whenStable();

      expect(setRouteEquippersMock).not.toHaveBeenCalled();
    } finally {
      listbox.remove();
    }
  });

  it('saves typed equipper on ArrowDown navigation and keeps it when re-entering the cell', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComp = fixture.debugElement.query(
      By.directive(RoutesTableComponent),
    ).componentInstance as RoutesTableComponent;

    tableComp.toggleEditing();
    tableComp.selectedCell.set({ rowKey: '1', col: 'equippers' });
    fixture.detectChanges();
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const equipperInput = hostEl.querySelector(
      'td[data-row-key="1"][data-col="equippers"] input[tuiInputChip]',
    ) as HTMLInputElement;

    equipperInput.focus();
    equipperInput.value = 'Carlos Ruiz';
    equipperInput.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    equipperInput.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      }),
    );
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    expect(setRouteEquippersMock).toHaveBeenCalledTimes(1);
    expect(setRouteEquippersMock).toHaveBeenCalledWith(1, ['Carlos Ruiz']);
    expect(tableComp.selectedCell()).toEqual({ rowKey: '2', col: 'equippers' });

    // Re-enter route 1 equippers cell and verify saved chip is still present
    tableComp.selectedCell.set({ rowKey: '1', col: 'equippers' });
    fixture.detectChanges();
    await fixture.whenStable();

    const route1Cell = hostEl.querySelector(
      'td[data-row-key="1"][data-col="equippers"]',
    ) as HTMLElement;
    expect(route1Cell.textContent).toContain('Carlos Ruiz');
  });

  it('saves an existing equipper selected from the dropdown and emits routeUpdated', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComp = fixture.debugElement.query(
      By.directive(RoutesTableComponent),
    ).componentInstance as RoutesTableComponent;

    tableComp.toggleEditing();
    tableComp.selectedCell.set({ rowKey: '1', col: 'equippers' });
    fixture.detectChanges();
    await fixture.whenStable();

    const hostEl = fixture.nativeElement as HTMLElement;
    const equipperInput = hostEl.querySelector(
      'td[data-row-key="1"][data-col="equippers"] input[tuiInputChip]',
    ) as HTMLInputElement;

    equipperInput.focus();
    equipperInput.value = 'Juan';
    equipperInput.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    const optionBtn = document.querySelector(
      'tui-data-list button[tuiOption]',
    ) as HTMLButtonElement | null;
    expect(optionBtn).toBeTruthy();
    optionBtn!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    expect(setRouteEquippersMock).toHaveBeenCalledTimes(1);
    expect(setRouteEquippersMock).toHaveBeenCalledWith(1, [
      expect.objectContaining({ id: 7, name: 'Juan Pérez' }),
    ]);
    expect(fixture.componentInstance.updatedCount).toBe(1);

    // Exit editing and ensure badge with link is shown
    tableComp.toggleEditing();
    fixture.detectChanges();
    const route1Cell = hostEl.querySelector(
      'td[data-row-key="1"][data-col="equippers"]',
    ) as HTMLElement;
    expect(route1Cell.textContent).toContain('Juan Pérez');
  });
});
