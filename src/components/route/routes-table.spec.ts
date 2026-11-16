import { Component, PLATFORM_ID, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TuiSortDirection } from '@taiga-ui/addon-table';
import { provideTaiga, TuiRoot } from '@taiga-ui/core';

import { TranslateModule } from '@ngx-translate/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { RoutesTableRow } from '../../models';

import { IS_BROWSER } from '../../app/is-browser';

import { RoutesTableComponent } from './routes-table';

function createMockRow(
  id: number,
  height: number | null = 10,
  canEdit = true,
): RoutesTableRow {
  return {
    id,
    key: `route-${id}`,
    grade: '6a',
    gradeValue: 15,
    climbing_kind: 'sport',
    route: `Route ${id}`,
    height,
    color: null,
    rating: 3,
    ascents: 0,
    liked: false,
    project: false,
    climbed: false,
    link: ['/route', `${id}`],
    topos: [],
    equippers: [],
    equippersSortKey: '',
    toposSortKey: '',
    own_ascent: null,
    isIndoor: false,
    canEdit,
    _ref: {} as RoutesTableRow['_ref'],
  };
}

@Component({
  standalone: true,
  imports: [RoutesTableComponent],
  template: `
    <app-routes-table
      [data]="data"
      [columns]="['equippers', 'height']"
      [equippersTemplate]="equippersTpl"
      [direction]="sortDirection"
    />

    <ng-template #equippersTpl let-item let-isEditing="isEditing">
      @if (isEditing) {
        <div class="equipper-container">
          <input class="equipper-input" [value]="item.id" />
        </div>
      } @else {
        <span>Non-editing</span>
      }
    </ng-template>
  `,
})
class TestHostComponent {
  sortDirection: TuiSortDirection = TuiSortDirection.Asc;
  data: RoutesTableRow[] = [
    createMockRow(1, 15, true),
    createMockRow(2, 20, true),
    createMockRow(3, 25, true),
  ];

  tableComp = viewChild(RoutesTableComponent);
  equippersTpl = viewChild<TemplateRef<unknown>>('equippersTpl');
}

describe('RoutesTableComponent keyboard navigation', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
      ],
    }).compileComponents();
  });

  it('moves to height input below on ArrowDown when editing', async () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComponent = fixture.componentInstance.tableComp()!;
    tableComponent.isEditing.set(true);
    tableComponent.selectedCell.set({ rowKey: 'route-1', col: 'height' });
    fixture.detectChanges();
    await fixture.whenStable();

    const firstInput = fixture.nativeElement.querySelector(
      '.route-height-input',
    ) as HTMLInputElement;
    expect(firstInput).toBeTruthy();
    firstInput.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    firstInput.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(tableComponent.selectedCell()).toEqual({
      rowKey: 'route-2',
      col: 'height',
    });
  });

  it('moves to equippers input below on ArrowDown when editing', async () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComponent = fixture.componentInstance.tableComp()!;
    tableComponent.isEditing.set(true);
    tableComponent.selectedCell.set({ rowKey: 'route-1', col: 'equippers' });
    fixture.detectChanges();
    await fixture.whenStable();

    const firstInput = fixture.nativeElement.querySelector(
      '.equipper-input',
    ) as HTMLInputElement;
    expect(firstInput).toBeTruthy();
    firstInput.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    firstInput.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(tableComponent.selectedCell()).toEqual({
      rowKey: 'route-2',
      col: 'equippers',
    });
  });

  it('does not intercept ArrowDown when not editing', async () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComponent = fixture.componentInstance.tableComp()!;
    tableComponent.isEditing.set(false);
    fixture.detectChanges();

    // In non-edit mode, create an input inside td just to test the handler
    const firstTd = fixture.nativeElement.querySelector(
      'td[data-col="height"]',
    );
    const dummyInput = document.createElement('input');
    firstTd.appendChild(dummyInput);
    dummyInput.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    dummyInput.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('skips non-editable row to next editable row', async () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.data = [
      createMockRow(1, 15, true),
      createMockRow(2, 20, false), // cannot edit
      createMockRow(3, 25, true),
    ];
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComponent = fixture.componentInstance.tableComp()!;
    tableComponent.isEditing.set(true);
    tableComponent.selectedCell.set({ rowKey: 'route-1', col: 'height' });
    fixture.detectChanges();
    await fixture.whenStable();

    const firstInput = fixture.nativeElement.querySelector(
      '.route-height-input',
    ) as HTMLInputElement;
    firstInput.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    firstInput.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(tableComponent.selectedCell()).toEqual({
      rowKey: 'route-3',
      col: 'height',
    });
  });

  it('moves to height input above on ArrowUp when editing', async () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComponent = fixture.componentInstance.tableComp()!;
    tableComponent.isEditing.set(true);
    tableComponent.selectedCell.set({ rowKey: 'route-2', col: 'height' });
    fixture.detectChanges();
    await fixture.whenStable();

    const secondInput = fixture.nativeElement.querySelector(
      '.route-height-input',
    ) as HTMLInputElement;
    expect(secondInput).toBeTruthy();
    secondInput.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      bubbles: true,
      cancelable: true,
    });
    secondInput.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(tableComponent.selectedCell()).toEqual({
      rowKey: 'route-1',
      col: 'height',
    });
  });

  it('moves to equippers input above on ArrowUp when editing', async () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComponent = fixture.componentInstance.tableComp()!;
    tableComponent.isEditing.set(true);
    tableComponent.selectedCell.set({ rowKey: 'route-2', col: 'equippers' });
    fixture.detectChanges();
    await fixture.whenStable();

    const secondInput = fixture.nativeElement.querySelector(
      '.equipper-input',
    ) as HTMLInputElement;
    expect(secondInput).toBeTruthy();
    secondInput.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      bubbles: true,
      cancelable: true,
    });
    secondInput.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(tableComponent.selectedCell()).toEqual({
      rowKey: 'route-1',
      col: 'equippers',
    });
  });

  it('skips non-editable row upwards to previous editable row', async () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.data = [
      createMockRow(1, 15, true),
      createMockRow(2, 20, false), // cannot edit
      createMockRow(3, 25, true),
    ];
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComponent = fixture.componentInstance.tableComp()!;
    tableComponent.isEditing.set(true);
    tableComponent.selectedCell.set({ rowKey: 'route-3', col: 'height' });
    fixture.detectChanges();
    await fixture.whenStable();

    const thirdInput = fixture.nativeElement.querySelector(
      '.route-height-input',
    ) as HTMLInputElement;
    thirdInput.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      bubbles: true,
      cancelable: true,
    });
    thirdInput.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(tableComponent.selectedCell()).toEqual({
      rowKey: 'route-1',
      col: 'height',
    });
  });

  it('stays on first row on ArrowUp when editing', async () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComponent = fixture.componentInstance.tableComp()!;
    tableComponent.isEditing.set(true);
    tableComponent.selectedCell.set({ rowKey: 'route-1', col: 'height' });
    fixture.detectChanges();
    await fixture.whenStable();

    const firstInput = fixture.nativeElement.querySelector(
      '.route-height-input',
    ) as HTMLInputElement;
    firstInput.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      bubbles: true,
      cancelable: true,
    });
    firstInput.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(tableComponent.selectedCell()).toEqual({
      rowKey: 'route-1',
      col: 'height',
    });
  });

  it('does not change cell on ArrowDown or ArrowUp when select dropdown options are open', async () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComponent = fixture.componentInstance.tableComp()!;
    tableComponent.isEditing.set(true);
    tableComponent.selectedCell.set({ rowKey: 'route-1', col: 'equippers' });
    fixture.detectChanges();
    await fixture.whenStable();

    const firstInput = fixture.nativeElement.querySelector(
      '.equipper-input',
    ) as HTMLInputElement;
    firstInput.focus();

    // Mark the textfield/wrapper as open
    const container = firstInput.closest('.equipper-container')!;
    container.classList.add('tui-dropdown-open');

    // Create a tui-dropdown with options in the DOM
    const dropdown = document.createElement('tui-dropdown');
    const option = document.createElement('button');
    option.setAttribute('role', 'option');
    option.setAttribute('tuiOption', '');
    option.textContent = 'Adam Ondra';
    dropdown.appendChild(option);
    document.body.appendChild(dropdown);

    try {
      const downEvent = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      });
      firstInput.dispatchEvent(downEvent);

      expect(downEvent.defaultPrevented).toBe(false);
      expect(tableComponent.selectedCell()).toEqual({
        rowKey: 'route-1',
        col: 'equippers',
      });

      const upEvent = new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        bubbles: true,
        cancelable: true,
      });
      firstInput.dispatchEvent(upEvent);

      expect(upEvent.defaultPrevented).toBe(false);
      expect(tableComponent.selectedCell()).toEqual({
        rowKey: 'route-1',
        col: 'equippers',
      });
    } finally {
      dropdown.remove();
    }
  });

  it('changes cell on ArrowDown when dropdown is open but has no selectable options', async () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComponent = fixture.componentInstance.tableComp()!;
    tableComponent.isEditing.set(true);
    tableComponent.selectedCell.set({ rowKey: 'route-1', col: 'equippers' });
    fixture.detectChanges();
    await fixture.whenStable();

    const firstInput = fixture.nativeElement.querySelector(
      '.equipper-input',
    ) as HTMLInputElement;
    firstInput.focus();

    // Mark as open, but dropdown only has hint (no options)
    const container = firstInput.closest('.equipper-container')!;
    container.classList.add('tui-dropdown-open');

    const dropdown = document.createElement('tui-dropdown');
    const hintDiv = document.createElement('div');
    hintDiv.textContent = 'Buscar...';
    dropdown.appendChild(hintDiv);
    document.body.appendChild(dropdown);

    try {
      const downEvent = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      });
      firstInput.dispatchEvent(downEvent);

      expect(downEvent.defaultPrevented).toBe(true);
      expect(tableComponent.selectedCell()).toEqual({
        rowKey: 'route-2',
        col: 'equippers',
      });
    } finally {
      dropdown.remove();
    }
  });

  it('respects the visual table order on ArrowUp and ArrowDown when rows have tied sort values in Desc direction', async () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.sortDirection = TuiSortDirection.Desc;
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComponent = fixture.componentInstance.tableComp()!;
    tableComponent.toggleEditing();
    fixture.detectChanges();
    await fixture.whenStable();

    // First visual row must be route-1 (even with Desc sort on tied ascents: 0)
    expect(tableComponent.selectedCell()).toEqual({
      rowKey: 'route-1',
      col: 'equippers',
    });

    // Move down to route-2 in height column
    tableComponent.selectedCell.set({ rowKey: 'route-2', col: 'height' });
    fixture.detectChanges();
    await fixture.whenStable();

    const heightInput = fixture.nativeElement.querySelector(
      '.route-height-input',
    ) as HTMLInputElement;
    heightInput.focus();

    // Pressing ArrowUp on route-2 must move up to route-1 in the same height column
    heightInput.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        bubbles: true,
        cancelable: true,
      }),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(tableComponent.selectedCell()).toEqual({
      rowKey: 'route-1',
      col: 'height',
    });
  });
});

describe('RoutesTableComponent actions column (project vs ascent)', () => {
  @Component({
    standalone: true,
    imports: [RoutesTableComponent],
    template: `
      <app-routes-table
        [data]="data"
        [columns]="['actions']"
        (deleteRoute)="onDeleteRoute($event)"
      />
    `,
  })
  class ActionsHostComponent {
    data: RoutesTableRow[] = [];
    deletedRoute: RoutesTableRow | null = null;
    tableComp = viewChild(RoutesTableComponent);

    onDeleteRoute(row: RoutesTableRow): void {
      this.deletedRoute = row;
    }
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionsHostComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
      ],
    }).compileComponents();
  });

  it('shows attempt button with dropdown options (show-ascent, add-ascent, remove-project) when route has attempt ascent and is a project', async () => {
    const fixture = TestBed.createComponent(ActionsHostComponent);
    fixture.componentInstance.data = [
      {
        ...createMockRow(1),
        own_ascent: { id: 10, type: 'attempt' },
        climbed: false,
        project: true,
      },
    ];
    fixture.detectChanges();
    await fixture.whenStable();

    const ascentBtn = fixture.nativeElement.querySelector(
      'app-button-ascent-type',
    );
    const actionBtn = fixture.nativeElement.querySelector(
      'td[data-col="actions"] > div > button',
    );

    expect(ascentBtn).toBeNull();
    expect(actionBtn).not.toBeNull();
    expect(actionBtn?.getAttribute('data-appearance')).toBe('none');
    expect(actionBtn?.getAttribute('style')).toContain(
      'var(--tui-status-neutral)',
    );
  });

  it('shows ascent button when route has attempt ascent and is not a project', async () => {
    const fixture = TestBed.createComponent(ActionsHostComponent);
    fixture.componentInstance.data = [
      {
        ...createMockRow(1),
        own_ascent: { id: 10, type: 'attempt' },
        climbed: false,
        project: false,
      },
    ];
    fixture.detectChanges();
    await fixture.whenStable();

    const ascentBtn = fixture.nativeElement.querySelector(
      'app-button-ascent-type',
    );
    const actionBtn = fixture.nativeElement.querySelector(
      'td[data-col="actions"] > div > button',
    );

    expect(ascentBtn).not.toBeNull();
    expect(actionBtn).toBeNull();
  });

  it('shows ascent button when route was climbed even if project is true', async () => {
    const fixture = TestBed.createComponent(ActionsHostComponent);
    fixture.componentInstance.data = [
      {
        ...createMockRow(1),
        own_ascent: { id: 10, type: 'rp' },
        climbed: true,
        project: true,
      },
    ];
    fixture.detectChanges();
    await fixture.whenStable();

    const ascentBtn = fixture.nativeElement.querySelector(
      'app-button-ascent-type',
    );
    const actionBtn = fixture.nativeElement.querySelector(
      'td[data-col="actions"] > div > button',
    );

    expect(ascentBtn).not.toBeNull();
    expect(actionBtn).toBeNull();
  });

  it('shows delete button and replaces action button when in editing mode for route without ascents', async () => {
    const fixture = TestBed.createComponent(ActionsHostComponent);
    fixture.componentInstance.data = [
      {
        ...createMockRow(1),
        canEdit: true,
        ascents: 0,
        own_ascent: null,
      },
    ];
    fixture.detectChanges();
    await fixture.whenStable();

    const initialBtn = fixture.nativeElement.querySelector(
      'td[data-col="actions"] button',
    );
    expect(initialBtn).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        'td[data-col="actions"] button[appearance="negative"]',
      ),
    ).toBeNull();

    fixture.componentInstance.tableComp()!.isEditing.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const deleteBtn = fixture.nativeElement.querySelector(
      'td[data-col="actions"] button[appearance="negative"]',
    );
    expect(deleteBtn).not.toBeNull();
  });

  it('emits deleteRoute when clicking delete button in editing mode', async () => {
    const fixture = TestBed.createComponent(ActionsHostComponent);
    fixture.componentInstance.data = [
      {
        ...createMockRow(42),
        canDelete: true,
      },
    ];
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.tableComp()!.isEditing.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const deleteBtn = fixture.nativeElement.querySelector(
      'td[data-col="actions"] button[appearance="negative"]',
    );
    deleteBtn.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.deletedRoute?.id).toBe(42);
  });

  it('does not show delete button in editing mode if neither canDelete nor canEdit is true', async () => {
    const fixture = TestBed.createComponent(ActionsHostComponent);
    fixture.componentInstance.data = [
      {
        ...createMockRow(99),
        canDelete: false,
        canEdit: false,
      },
    ];
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.tableComp()!.isEditing.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector(
        'td[data-col="actions"] button[appearance="negative"]',
      ),
    ).toBeNull();
  });

  it('does not show delete button in editing mode if route has ascents', async () => {
    const fixture = TestBed.createComponent(ActionsHostComponent);
    fixture.componentInstance.data = [
      {
        ...createMockRow(101),
        canDelete: true,
        ascents: 3,
      },
    ];
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.tableComp()!.isEditing.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector(
        'td[data-col="actions"] button[appearance="negative"]',
      ),
    ).toBeNull();
  });

  it('does not show delete button in editing mode if route has own_ascent', async () => {
    const fixture = TestBed.createComponent(ActionsHostComponent);
    fixture.componentInstance.data = [
      {
        ...createMockRow(102),
        canDelete: true,
        ascents: 0,
        own_ascent: { id: 5, type: 'rp' },
      },
    ];
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.tableComp()!.isEditing.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector(
        'td[data-col="actions"] button[appearance="negative"]',
      ),
    ).toBeNull();
  });

  it('does not show delete button in editing mode if route has hasAscents flag', async () => {
    const fixture = TestBed.createComponent(ActionsHostComponent);
    fixture.componentInstance.data = [
      {
        ...createMockRow(103),
        canDelete: true,
        ascents: 0,
        hasAscents: true,
      },
    ];
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.tableComp()!.isEditing.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector(
        'td[data-col="actions"] button[appearance="negative"]',
      ),
    ).toBeNull();
  });
});

describe('RoutesTableComponent focused edit mode', () => {
  @Component({
    standalone: true,
    imports: [RoutesTableComponent, TuiRoot],
    template: `
      <tui-root>
        <app-routes-table
          [data]="data"
          [columns]="['route', 'crag', 'topo', 'height', 'actions']"
          [availableCrags]="availableCrags"
          [toposByCrag]="toposByCrag"
          [showLocation]="true"
          [direction]="sortDirection"
          activeCol="route"
          (updateRouteName)="onUpdateRouteName($event)"
          (updateRouteCrag)="onUpdateRouteCrag($event)"
          (toggleRouteOnTopo)="onToggleRouteOnTopo($event)"
        />
      </tui-root>
    `,
  })
  class FocusedEditHostComponent {
    sortDirection = TuiSortDirection.Asc;
    data: RoutesTableRow[] = [
      {
        ...createMockRow(1, 15, true),
        crag_id: 10,
        crag_name: 'Sector Alpha',
        topos: [{ id: 101, name: 'Topo Alpha 1', link: ['/topo/101'] }],
      },
      {
        ...createMockRow(2, 20, true),
        crag_id: 20,
        crag_name: 'Sector Beta',
        topos: [],
      },
    ];

    availableCrags = [
      { id: 10, name: 'Sector Alpha' },
      { id: 20, name: 'Sector Beta' },
    ];

    toposByCrag = {
      10: [
        { id: 101, name: 'Topo Alpha 1' },
        { id: 102, name: 'Topo Alpha 2' },
      ],
      20: [{ id: 201, name: 'Topo Beta 1' }],
    };

    tableComp = viewChild(RoutesTableComponent);
    updatedNamePayload: { row: RoutesTableRow; name: string } | null = null;
    updatedCragPayload: { row: RoutesTableRow; cragId: number } | null = null;
    toggledTopoPayloads: {
      topoId: number | string;
      routeId: number | string;
      isAttached: boolean;
    }[] = [];

    onUpdateRouteName(event: { row: RoutesTableRow; name: string }): void {
      this.updatedNamePayload = event;
    }

    onUpdateRouteCrag(event: { row: RoutesTableRow; cragId: number }): void {
      this.updatedCragPayload = event;
    }

    onToggleRouteOnTopo(event: {
      topoId: number | string;
      routeId: number | string;
      isAttached: boolean;
    }): void {
      this.toggledTopoPayloads.push(event);
    }
  }

  beforeEach(async () => {
    if (!HTMLElement.prototype.scrollTo) {
      HTMLElement.prototype.scrollTo = vi.fn();
    }

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
    await TestBed.configureTestingModule({
      imports: [FocusedEditHostComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideTaiga(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
      ],
    }).compileComponents();
  });

  it('selects first cell of first row when entering edit mode, not whole table', async () => {
    const fixture = TestBed.createComponent(FocusedEditHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComp = fixture.componentInstance.tableComp()!;
    tableComp.toggleEditing();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(tableComp.isEditing()).toBe(true);
    // First cell of first row (col = 'route') should be selected
    expect(tableComp.selectedCell()).toEqual({
      rowKey: 'route-1',
      col: 'route',
    });

    // Only 1 route name input in the entire table
    const routeInputs =
      fixture.nativeElement.querySelectorAll('.route-name-input');
    expect(routeInputs.length).toBe(1);

    // Height input should NOT be shown yet because height is not selected
    const heightInputs = fixture.nativeElement.querySelectorAll(
      '.route-height-input',
    );
    expect(heightInputs.length).toBe(0);
  });

  it('allows editing route name via input and emits updateRouteName', async () => {
    const fixture = TestBed.createComponent(FocusedEditHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComp = fixture.componentInstance.tableComp()!;
    tableComp.isEditing.set(true);
    tableComp.selectedCell.set({ rowKey: 'route-1', col: 'route' });
    fixture.detectChanges();
    await fixture.whenStable();

    const input = fixture.nativeElement.querySelector(
      '.route-name-input',
    ) as HTMLInputElement;
    expect(input).toBeTruthy();

    input.value = 'Nueva Super Via';
    input.dispatchEvent(new Event('blur'));

    expect(fixture.componentInstance.updatedNamePayload).toBeTruthy();
    expect(fixture.componentInstance.updatedNamePayload?.name).toBe(
      'Nueva Super Via',
    );
  });

  it('allows editing crag via Taiga select and emits updateRouteCrag', async () => {
    const fixture = TestBed.createComponent(FocusedEditHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComp = fixture.componentInstance.tableComp()!;
    tableComp.isEditing.set(true);
    tableComp.selectedCell.set({ rowKey: 'route-1', col: 'crag' });
    fixture.detectChanges();
    await fixture.whenStable();

    const selectInput = fixture.nativeElement.querySelector(
      'tui-textfield input.crag-select[tuiSelect]',
    ) as HTMLInputElement;
    expect(selectInput).toBeTruthy();
    expect(selectInput.value).toBe('Sector Alpha');

    tableComp['onSelectCrag'](fixture.componentInstance.data[0], 20);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.updatedCragPayload).toBeTruthy();
    expect(fixture.componentInstance.updatedCragPayload?.cragId).toBe(20);
    expect(selectInput.value).toBe('Sector Beta');
  });

  it('navigates between cells using ArrowRight, ArrowLeft, ArrowDown, and ArrowUp', async () => {
    const fixture = TestBed.createComponent(FocusedEditHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComp = fixture.componentInstance.tableComp()!;
    tableComp.toggleEditing();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(tableComp.selectedCell()).toEqual({
      rowKey: 'route-1',
      col: 'route',
    });

    const dispatchKey = (key: string) => {
      const target =
        (document.activeElement as HTMLElement) ||
        fixture.nativeElement.querySelector('table');
      target.dispatchEvent(
        new KeyboardEvent('keydown', {
          key,
          bubbles: true,
          cancelable: true,
        }),
      );
      fixture.detectChanges();
    };

    // ArrowRight: route -> crag -> topo -> height
    dispatchKey('ArrowRight');
    expect(tableComp.selectedCell()).toEqual({
      rowKey: 'route-1',
      col: 'crag',
    });

    dispatchKey('ArrowRight');
    expect(tableComp.selectedCell()).toEqual({
      rowKey: 'route-1',
      col: 'topo',
    });

    dispatchKey('ArrowRight');
    expect(tableComp.selectedCell()).toEqual({
      rowKey: 'route-1',
      col: 'height',
    });

    // ArrowRight at end of row 1 wraps to first editable col of row 2
    dispatchKey('ArrowRight');
    expect(tableComp.selectedCell()).toEqual({
      rowKey: 'route-2',
      col: 'route',
    });

    // ArrowLeft at start of row 2 wraps back to last editable col of row 1
    dispatchKey('ArrowLeft');
    expect(tableComp.selectedCell()).toEqual({
      rowKey: 'route-1',
      col: 'height',
    });

    // ArrowDown moves to same col in row 2
    dispatchKey('ArrowDown');
    expect(tableComp.selectedCell()).toEqual({
      rowKey: 'route-2',
      col: 'height',
    });

    // ArrowUp moves back to same col in row 1
    dispatchKey('ArrowUp');
    expect(tableComp.selectedCell()).toEqual({
      rowKey: 'route-1',
      col: 'height',
    });
  });

  it('shows topos related to the crag to which route belongs and edits via Taiga multiselect', async () => {
    const fixture = TestBed.createComponent(FocusedEditHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComp = fixture.componentInstance.tableComp()!;
    const row1 = fixture.componentInstance.data[0];
    const toposRow1 = tableComp['getAvailableToposForRow'](row1);
    expect(toposRow1).toEqual([
      { id: 101, name: 'Topo Alpha 1' },
      { id: 102, name: 'Topo Alpha 2' },
    ]);

    const row2 = fixture.componentInstance.data[1];
    const toposRow2 = tableComp['getAvailableToposForRow'](row2);
    expect(toposRow2).toEqual([{ id: 201, name: 'Topo Beta 1' }]);

    tableComp.isEditing.set(true);
    tableComp.selectedCell.set({ rowKey: 'route-1', col: 'topo' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const multiselectInput = fixture.nativeElement.querySelector(
      'tui-textfield[multi] input.topo-multiselect[tuiInputChip]',
    ) as HTMLInputElement;
    expect(multiselectInput).toBeTruthy();

    // Add Topo Alpha 2 and remove Topo Alpha 1
    tableComp['onToposChange'](row1, [{ id: 102, name: 'Topo Alpha 2' }]);
    fixture.detectChanges();

    expect(fixture.componentInstance.toggledTopoPayloads).toEqual([
      { topoId: 102, routeId: 1, isAttached: false },
      { topoId: 101, routeId: 1, isAttached: true },
    ]);
  });

  it('should focus the multiselect input (not the chip input) and filter multi-word or subsequent topo queries when a topo is selected', async () => {
    const fixture = TestBed.createComponent(FocusedEditHostComponent);
    fixture.componentInstance.toposByCrag = {
      10: [
        { id: 101, name: 'Sector Uno' },
        { id: 102, name: 'Pared Dos' },
        { id: 103, name: 'Cueva Tres Norte' },
      ],
      20: [{ id: 201, name: 'Topo Beta 1' }],
    };
    fixture.componentInstance.data[0].topos = [
      { id: 101, name: 'Sector Uno', link: ['/topo/101'] },
    ];
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComp = fixture.componentInstance.tableComp()!;
    tableComp.isEditing.set(true);
    tableComp.selectedCell.set({ rowKey: 'route-1', col: 'topo' });
    tableComp['focusSelectedCell']();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const multiselectInput = fixture.nativeElement.querySelector(
      'tui-textfield[multi] input.topo-multiselect[tuiInputChip]',
    ) as HTMLInputElement;

    expect(document.activeElement).toBe(multiselectInput);

    // Multi-word non-contiguous search ("Cueva Norte" matches "Cueva Tres Norte")
    multiselectInput.value = 'Cueva Norte';
    multiselectInput.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const multiWordOptions = Array.from(
      document.querySelectorAll('tui-data-list button[tuiOption]'),
    ).map((el) => el.textContent?.trim());
    expect(multiWordOptions).toEqual(['Cueva Tres Norte']);

    // Fallback when input contains first topo word + second topo word ("Sector Pared" -> matches "Pared Dos")
    multiselectInput.value = 'Sector Pared';
    multiselectInput.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const fallbackOptions = Array.from(
      document.querySelectorAll('tui-data-list button[tuiOption]'),
    ).map((el) => el.textContent?.trim());
    expect(fallbackOptions).toEqual(['Pared Dos']);

    // Clear input, click Pared Dos option, then check dropdown options and search for Cueva
    multiselectInput.value = 'Pared';
    multiselectInput.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const paredBtn = document.querySelector(
      'tui-data-list button[tuiOption]',
    ) as HTMLButtonElement | null;
    expect(paredBtn?.textContent?.trim()).toBe('Pared Dos');
    paredBtn?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(multiselectInput.value).toBe('');
    expect(document.activeElement).toBe(multiselectInput);

    const optionsAfterClick = Array.from(
      document.querySelectorAll('tui-data-list button[tuiOption]'),
    ).map((el) => el.textContent?.trim());
    expect(optionsAfterClick).toEqual([
      'Sector Uno',
      'Pared Dos',
      'Cueva Tres Norte',
    ]);

    multiselectInput.value = 'Cueva';
    multiselectInput.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const cuevaOptions = Array.from(
      document.querySelectorAll('tui-data-list button[tuiOption]'),
    ).map((el) => el.textContent?.trim());
    expect(cuevaOptions).toEqual(['Cueva Tres Norte']);

    multiselectInput.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(multiselectInput.value).toBe('');
    const optionsAfterEnter = Array.from(
      document.querySelectorAll('tui-data-list button[tuiOption]'),
    ).map((el) => el.textContent?.trim());
    expect(optionsAfterEnter).toEqual([
      'Sector Uno',
      'Pared Dos',
      'Cueva Tres Norte',
    ]);
  });

  it('uses pure CSS sticky headers without tui-scrollbar or JS scroll transforms', () => {
    const fixture = TestBed.createComponent(RoutesTableComponent);
    fixture.componentRef.setInput('data', [createMockRow(1, 15, true)]);
    fixture.componentRef.setInput('columns', [
      'grade',
      'route',
      'crag',
      'ascents',
      'actions',
    ]);
    fixture.componentRef.setInput('isMobile', false);
    fixture.detectChanges();

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelector('tui-scrollbar')).toBeNull();
    const theadEl = hostEl.querySelector('thead') as HTMLTableSectionElement;
    expect(theadEl.style.transform).toBe('');
    expect(hostEl.querySelectorAll('thead th').length).toBe(5);
    const tableEl = hostEl.querySelector('table') as HTMLTableElement;
    expect(tableEl.classList.contains('table-fixed')).toBe(false);

    fixture.componentRef.setInput('isMobile', true);
    fixture.detectChanges();
    expect(tableEl.classList.contains('table-fixed')).toBe(true);
    const mobileHeaders = Array.from(hostEl.querySelectorAll('thead th')).map(
      (th) => th.getAttribute('data-col'),
    );
    expect(mobileHeaders).toEqual(['grade', 'route', 'ascents', 'actions']);
  });

  it('renders rating under route name and omits area name when showLocation is true', () => {
    const fixture = TestBed.createComponent(RoutesTableComponent);
    const row = createMockRow(1, 15, false);
    row.rating = 4.2;
    row.area_name = 'Chulilla';
    row.area_slug = 'chulilla';
    row.crag_name = 'El Pati';
    row.crag_slug = 'el-pati';
    fixture.componentRef.setInput('data', [row]);
    fixture.componentRef.setInput('columns', ['route', 'crag']);
    fixture.componentRef.setInput('showLocation', true);
    fixture.componentRef.setInput('isMobile', false);
    fixture.detectChanges();

    const routeCell = (fixture.nativeElement as HTMLElement).querySelector(
      'td[data-col="route"]',
    ) as HTMLElement;
    expect(routeCell.textContent).toContain('4.2');
    expect(routeCell.textContent).not.toContain('Chulilla');

    fixture.componentRef.setInput('isMobile', true);
    fixture.detectChanges();
    const mobileText = routeCell.textContent ?? '';
    expect(mobileText.indexOf('El Pati')).toBeGreaterThan(-1);
    expect(mobileText.indexOf('El Pati')).toBeLessThan(
      mobileText.indexOf('4.2'),
    );
  });

  it('renders comma separators between multiple equippers in the default cell view', () => {
    const fixture = TestBed.createComponent(RoutesTableComponent);
    const row = createMockRow(1, 15, false);
    row.equippers = [
      {
        id: 1,
        name: 'Alice',
        created_at: '',
        description: null,
        user_id: null,
      },
      {
        id: 2,
        name: 'Bob',
        created_at: '',
        description: null,
        user_id: null,
      },
    ];
    fixture.componentRef.setInput('data', [row]);
    fixture.componentRef.setInput('columns', ['route', 'equippers']);
    fixture.detectChanges();

    const cell = (fixture.nativeElement as HTMLElement).querySelector(
      'td[data-col="equippers"]',
    ) as HTMLElement;
    const text = cell.textContent?.replace(/\s+/g, ' ').trim();
    expect(text).toBe('Alice , Bob');
  });
});
