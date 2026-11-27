import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { provideTaiga, TuiRoot } from '@taiga-ui/core';
import { provideEventPlugins } from '@taiga-ui/event-plugins';

import { TranslateModule } from '@ngx-translate/core';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { IndoorService } from '../../services/indoor.service';
import { RoutesService } from '../../services/routes.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

import { EquipperDto } from '../../models';

import { IS_BROWSER } from '../../app/is-browser';
import { MockSupabaseService } from '../../testing/mock-supabase.service';
import { RouteEquippersInputComponent } from './route-equippers-input';

function makeEquipper(id: number, name: string): EquipperDto {
  return {
    id,
    name,
    created_at: '',
    description: null,
    user_id: null,
  };
}

@Component({
  imports: [RouteEquippersInputComponent, TuiRoot],
  template: `
    <tui-root>
      <app-route-equippers-input
        [route]="route()"
        [mode]="mode()"
        [autoSave]="autoSave()"
        (equippersChange)="lastChange.set($event)"
        (equippersChanged)="lastChanged.set($event)"
      />
    </tui-root>
  `,
})
class TestHostComponent {
  route = signal<{ id: number | string; equippers?: EquipperDto[] | null }>({
    id: 42,
    equippers: [],
  });
  mode = signal<'outdoor' | 'indoor'>('outdoor');
  autoSave = signal(true);

  lastChange = signal<readonly (EquipperDto | string)[] | null>(null);
  lastChanged = signal<EquipperDto[] | null>(null);
}

describe('RouteEquippersInputComponent', () => {
  let outdoorSetMock: ReturnType<typeof vi.fn>;
  let indoorSetMock: ReturnType<typeof vi.fn>;
  let mockToast: { error: ReturnType<typeof vi.fn> };
  let existingEquippers: EquipperDto[];

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
    outdoorSetMock = vi.fn(
      async (
        _routeId: number,
        equippers: readonly (EquipperDto | string)[],
      ): Promise<EquipperDto[]> =>
        equippers.map((item, i) =>
          typeof item === 'string' ? makeEquipper(100 + i, item) : item,
        ),
    );
    indoorSetMock = vi.fn(
      async (
        _routeId: string,
        equippers: readonly (EquipperDto | string)[],
      ): Promise<EquipperDto[]> =>
        equippers.map((item, i) =>
          typeof item === 'string' ? makeEquipper(200 + i, item) : item,
        ),
    );
    mockToast = { error: vi.fn() };
    existingEquippers = [
      makeEquipper(7, 'Juan Pérez'),
      makeEquipper(8, 'Laura Gómez'),
    ];

    const mockSupabase = new MockSupabaseService();
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
      return {};
    }) as unknown as typeof mockSupabase.client.from;

    await TestBed.configureTestingModule({
      imports: [TestHostComponent, TranslateModule.forRoot()],
      providers: [
        provideTaiga(),
        provideEventPlugins(),
        { provide: IS_BROWSER, useValue: true },
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: ToastService, useValue: mockToast },
        {
          provide: RoutesService,
          useValue: { setRouteEquippers: outdoorSetMock },
        },
        {
          provide: IndoorService,
          useValue: { setRouteEquippers: indoorSetMock },
        },
      ],
    }).compileComponents();
  });

  function createFixture() {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    const inputComp = fixture.debugElement.query(
      By.directive(RouteEquippersInputComponent),
    ).componentInstance as RouteEquippersInputComponent;
    return { fixture, inputComp };
  }

  it('calls RoutesService.setRouteEquippers in outdoor mode when autoSave is true', async () => {
    const { fixture, inputComp } = createFixture();

    await inputComp.onEquippersChange(['Nuevo Equipador']);
    fixture.detectChanges();

    expect(outdoorSetMock).toHaveBeenCalledTimes(1);
    expect(outdoorSetMock).toHaveBeenCalledWith(42, ['Nuevo Equipador']);
    expect(indoorSetMock).not.toHaveBeenCalled();
    expect(fixture.componentInstance.lastChange()).toEqual(['Nuevo Equipador']);
    expect(fixture.componentInstance.lastChanged()).toEqual([
      makeEquipper(100, 'Nuevo Equipador'),
    ]);
    expect(inputComp.equippers()).toEqual([
      makeEquipper(100, 'Nuevo Equipador'),
    ]);
  });

  it('calls IndoorService.setRouteEquippers in indoor mode when autoSave is true', async () => {
    const { fixture, inputComp } = createFixture();
    fixture.componentInstance.mode.set('indoor');
    fixture.componentInstance.route.set({
      id: 'indoor-route-uuid',
      equippers: [],
    });
    fixture.detectChanges();

    await inputComp.onEquippersChange(['Indoor Setter']);
    fixture.detectChanges();

    expect(indoorSetMock).toHaveBeenCalledTimes(1);
    expect(indoorSetMock).toHaveBeenCalledWith('indoor-route-uuid', [
      'Indoor Setter',
    ]);
    expect(outdoorSetMock).not.toHaveBeenCalled();
    expect(fixture.componentInstance.lastChanged()).toEqual([
      makeEquipper(200, 'Indoor Setter'),
    ]);
  });

  it('emits equippersChange without calling services when autoSave is false', async () => {
    const { fixture, inputComp } = createFixture();
    fixture.componentInstance.autoSave.set(false);
    fixture.detectChanges();

    await inputComp.onEquippersChange(['Local Only']);
    fixture.detectChanges();

    expect(outdoorSetMock).not.toHaveBeenCalled();
    expect(indoorSetMock).not.toHaveBeenCalled();
    expect(fixture.componentInstance.lastChange()).toEqual(['Local Only']);
    expect(fixture.componentInstance.lastChanged()).toBeNull();
  });

  it('tokenizes comma-separated values on blur and deduplicates case-insensitively', async () => {
    const { fixture } = createFixture();
    fixture.componentInstance.autoSave.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    const inputEl = (fixture.nativeElement as HTMLElement).querySelector(
      'input[tuiInputChip]',
    ) as HTMLInputElement;
    expect(inputEl).toBeTruthy();

    inputEl.focus();
    inputEl.value = ' Alice, Bob , , alice ';
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new FocusEvent('blur', { relatedTarget: null }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(inputEl.value).toBe('');
    expect(fixture.componentInstance.lastChange()).toEqual(['Alice', 'Bob']);
  });

  it('does not commit text on blur when focus moves into a dropdown listbox', async () => {
    const { fixture } = createFixture();
    fixture.componentInstance.autoSave.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    const inputEl = (fixture.nativeElement as HTMLElement).querySelector(
      'input[tuiInputChip]',
    ) as HTMLInputElement;

    const listbox = document.createElement('div');
    listbox.setAttribute('role', 'listbox');
    const option = document.createElement('button');
    listbox.appendChild(option);
    document.body.appendChild(listbox);

    try {
      inputEl.focus();
      inputEl.value = 'Jua';
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new FocusEvent('blur', { relatedTarget: option }));
      fixture.detectChanges();

      expect(fixture.componentInstance.lastChange()).toBeNull();
    } finally {
      listbox.remove();
    }
  });

  it('deduplicates equippers by ID and case-insensitive name', async () => {
    const { fixture, inputComp } = createFixture();
    fixture.componentInstance.autoSave.set(false);
    fixture.detectChanges();

    const eq = makeEquipper(7, 'Juan Pérez');
    await inputComp.onEquippersChange([
      eq,
      makeEquipper(7, 'Different Name Same ID'),
      'juan pérez',
      '  María ',
      'MARÍA',
      '   ',
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.lastChange()).toEqual([eq, 'María']);
  });

  it('loads matching equippers in dropdown and selects an option', async () => {
    const { fixture } = createFixture();
    fixture.detectChanges();
    await fixture.whenStable();

    const inputEl = (fixture.nativeElement as HTMLElement).querySelector(
      'input[tuiInputChip]',
    ) as HTMLInputElement;

    inputEl.focus();
    inputEl.value = 'Juan';
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    const optionBtn = document.querySelector(
      'tui-data-list button[tuiOption]',
    ) as HTMLButtonElement | null;
    expect(optionBtn).toBeTruthy();
    expect(optionBtn!.textContent).toContain('Juan Pérez');

    optionBtn!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    expect(outdoorSetMock).toHaveBeenCalledTimes(1);
    expect(outdoorSetMock).toHaveBeenCalledWith(42, [
      expect.objectContaining({ id: 7, name: 'Juan Pérez' }),
    ]);
  });

  it('shows error toast when autoSave fails', async () => {
    const consoleSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    outdoorSetMock.mockRejectedValueOnce(new Error('save failed'));

    const { fixture, inputComp } = createFixture();
    await inputComp.onEquippersChange(['Failing Setter']);
    fixture.detectChanges();

    expect(mockToast.error).toHaveBeenCalledWith('errors.unexpected');
    expect(fixture.componentInstance.lastChanged()).toBeNull();
    consoleSpy.mockRestore();
  });
});
