import { ComponentRef, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LayoutService } from '../../services/layout.service';
import { SupabaseService } from '../../services/supabase.service';

import { IS_BROWSER } from '../../app/is-browser';
import { MockSupabaseService } from '../../testing/mock-supabase.service';
import {
  AdminRequestRow,
  AdminRequestsTableComponent,
} from './admin-requests-table';

const MOCK_ROWS: AdminRequestRow[] = [
  {
    id: 1,
    createdAt: '2026-01-02T10:00:00Z',
    user: { id: 'u-2', name: 'Zara', avatar: null },
    targetName: 'Boulder Beta',
    targetLink: ['/area', 'boulder-beta'],
  },
  {
    id: 2,
    createdAt: '2026-01-01T10:00:00Z',
    user: { id: 'u-1', name: 'Alice', avatar: 'avatars/alice.jpg' },
    targetName: 'Alpha Crag',
    targetLink: ['/area', 'alpha-crag'],
  },
  {
    id: 3,
    createdAt: '2026-01-03T10:00:00Z',
    user: { id: 'u-3', name: null, avatar: null },
    targetName: 'Sierra Norte',
    targetLink: ['/area', 'sierra-norte'],
  },
];

describe('AdminRequestsTableComponent', () => {
  let fixture: ComponentFixture<AdminRequestsTableComponent>;
  let component: AdminRequestsTableComponent;
  let componentRef: ComponentRef<AdminRequestsTableComponent>;

  const isMobile = signal(false);

  beforeEach(async () => {
    isMobile.set(false);

    await TestBed.configureTestingModule({
      imports: [AdminRequestsTableComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        { provide: LayoutService, useValue: { isMobile } },
        { provide: SupabaseService, useClass: MockSupabaseService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRequestsTableComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('rows', MOCK_ROWS);
    componentRef.setInput('loading', false);
    componentRef.setInput('headerIcon', '@tui.shield');
    componentRef.setInput('iconBgClass', 'bg-purple-500/10 text-purple-600');
    componentRef.setInput('titleKey', 'adminRequests.manageTitle');
    componentRef.setInput('descriptionKey', 'adminRequests.manageDescription');
    componentRef.setInput('userColumnKey', 'adminRequests.user');
    componentRef.setInput('targetColumnKey', 'adminRequests.area');
    componentRef.setInput('emptyIcon', '@tui.shield');
    componentRef.setInput('emptyMessageKey', 'adminRequests.empty');
  });

  const getBodyRows = (): HTMLTableRowElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('tbody tr'));

  const getTargetNames = (): string[] =>
    getBodyRows().map(
      (tr) => tr.querySelectorAll('td')[1]?.textContent?.trim() ?? '',
    );

  it('renders rows sorted by createdAt ascending by default, with user/target links and badge count', () => {
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('a[href="/admin"]')).not.toBeNull();
    expect(
      el.querySelector('tui-badge-notification')?.textContent?.trim(),
    ).toBe('3');

    const rows = getBodyRows();
    expect(rows.length).toBe(3);

    // Default sort is createdAt Asc: Alice (Jan 1), Zara (Jan 2), anonymous (Jan 3)
    expect(getTargetNames()).toEqual([
      'Alpha Crag',
      'Boulder Beta',
      'Sierra Norte',
    ]);

    const firstRowLinks = Array.from(rows[0].querySelectorAll('a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(firstRowLinks).toContain('/profile/u-1');
    expect(firstRowLinks).toContain('/area/alpha-crag');

    // Null user name falls back to anonymous key
    expect(rows[2].textContent).toContain('anonymous');
  });

  it('renders 5 skeleton rows while loading even when rows is empty', () => {
    componentRef.setInput('rows', []);
    componentRef.setInput('loading', true);
    fixture.detectChanges();

    const rows = getBodyRows();
    expect(rows.length).toBe(5);
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
    expect(
      fixture.nativeElement.querySelectorAll('tbody ._skeleton').length,
    ).toBe(20);
  });

  it('renders empty state when not loading and rows is empty', () => {
    componentRef.setInput('rows', []);
    componentRef.setInput('loading', false);
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('app-empty-state');
    expect(emptyState).not.toBeNull();
    expect(emptyState.textContent).toContain('adminRequests.empty');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('sorts rows by user and target when clicking sortable column headers', () => {
    fixture.detectChanges();

    const headers = Array.from(
      fixture.nativeElement.querySelectorAll('thead th'),
    ) as HTMLTableCellElement[];
    const userSortBtn = headers[0].querySelector('button') ?? headers[0];
    const targetSortBtn = headers[1].querySelector('button') ?? headers[1];

    // Click user column header -> sorts by user name ascending ('', 'Alice', 'Zara')
    userSortBtn.click();
    fixture.detectChanges();
    expect(getTargetNames()).toEqual([
      'Sierra Norte',
      'Alpha Crag',
      'Boulder Beta',
    ]);

    // Click target column header -> sorts by target name
    targetSortBtn.click();
    fixture.detectChanges();
    const afterTargetFirstClick = getTargetNames();
    expect(
      afterTargetFirstClick[0] === 'Alpha Crag' ||
        afterTargetFirstClick[0] === 'Sierra Norte',
    ).toBe(true);

    // Click target column header again -> reverses direction
    targetSortBtn.click();
    fixture.detectChanges();
    expect(getTargetNames()).toEqual([...afterTargetFirstClick].reverse());
  });

  it('preserves original row order when sortable is false', () => {
    componentRef.setInput('sortable', false);
    fixture.detectChanges();

    expect(getTargetNames()).toEqual([
      'Boulder Beta',
      'Alpha Crag',
      'Sierra Norte',
    ]);

    const headers = Array.from(
      fixture.nativeElement.querySelectorAll('thead th'),
    ) as HTMLTableCellElement[];
    // Non-sortable headers should not render sort buttons
    expect(headers[0].querySelector('button')).toBeNull();
    expect(headers[1].querySelector('button')).toBeNull();
  });

  it('emits approve and reject with the clicked AdminRequestRow', () => {
    const approveSpy = vi.fn();
    const rejectSpy = vi.fn();
    component.approve.subscribe(approveSpy);
    component.reject.subscribe(rejectSpy);

    componentRef.setInput('approveLabelKey', 'adminEquipperRequests.approve');
    componentRef.setInput('rejectLabelKey', 'adminEquipperRequests.reject');
    componentRef.setInput('rejectAppearance', 'secondary');
    fixture.detectChanges();

    const firstRowButtons = Array.from(
      getBodyRows()[0].querySelectorAll('button'),
    ) as HTMLButtonElement[];
    expect(firstRowButtons.length).toBe(2);
    expect(firstRowButtons[0].textContent?.trim()).toBe(
      'adminEquipperRequests.approve',
    );
    expect(firstRowButtons[1].textContent?.trim()).toBe(
      'adminEquipperRequests.reject',
    );

    firstRowButtons[0].click();
    expect(approveSpy).toHaveBeenCalledTimes(1);
    expect(approveSpy).toHaveBeenCalledWith(MOCK_ROWS[1]); // Alice (first by createdAt Asc)

    firstRowButtons[1].click();
    expect(rejectSpy).toHaveBeenCalledTimes(1);
    expect(rejectSpy).toHaveBeenCalledWith(MOCK_ROWS[1]);
  });
});
