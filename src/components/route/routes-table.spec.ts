import { Component, PLATFORM_ID, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { describe, it, expect, beforeEach } from 'vitest';

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
    fixture.detectChanges();
    await fixture.whenStable();

    const heightInputs = fixture.nativeElement.querySelectorAll(
      '.route-height-input',
    ) as NodeListOf<HTMLInputElement>;
    expect(heightInputs.length).toBe(3);

    const firstInput = heightInputs[0];
    const secondInput = heightInputs[1];
    firstInput.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    firstInput.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(secondInput);
  });

  it('moves to equippers input below on ArrowDown when editing', async () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tableComponent = fixture.componentInstance.tableComp()!;
    tableComponent.isEditing.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const equipperInputs = fixture.nativeElement.querySelectorAll(
      '.equipper-input',
    ) as NodeListOf<HTMLInputElement>;
    expect(equipperInputs.length).toBe(3);

    const firstInput = equipperInputs[0];
    const secondInput = equipperInputs[1];
    firstInput.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    firstInput.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(secondInput);
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
    fixture.detectChanges();
    await fixture.whenStable();

    const heightInputs = fixture.nativeElement.querySelectorAll(
      '.route-height-input',
    ) as NodeListOf<HTMLInputElement>;
    // Only row 1 and row 3 should have height input
    expect(heightInputs.length).toBe(2);

    const firstInput = heightInputs[0];
    const thirdInput = heightInputs[1];
    firstInput.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    firstInput.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(thirdInput);
  });
});
