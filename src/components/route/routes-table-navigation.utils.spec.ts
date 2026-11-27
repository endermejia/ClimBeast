import { TuiSortDirection } from '@taiga-ui/addon-table';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { RoutesTableRow } from '../../models';

import {
  blurActiveTableElement,
  findEditableCellInput,
  findFirstEditableRow,
  findStickySiblingAbove,
  findTableCell,
  findVerticalScrollAncestor,
  focusTableCell,
  getVisuallyOrderedRows,
  hasOpenDropdownOptions,
  resolveNextEditableCell,
  resolveTableKeyDownAction,
} from './routes-table-navigation.utils';

function makeRow(id: number, canEdit = true, route?: string): RoutesTableRow {
  return {
    id,
    key: `route-${id}`,
    grade: '6a',
    gradeValue: 15,
    climbing_kind: 'sport',
    route: route ?? `Route ${id}`,
    height: 15,
    color: null,
    rating: 0,
    ascents: id,
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

describe('routes-table-navigation.utils', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('getVisuallyOrderedRows', () => {
    it('returns rows ordered by DOM tbody td[data-row-key] when complete', () => {
      const rows = [makeRow(1), makeRow(2), makeRow(3)];
      const table = document.createElement('table');
      table.innerHTML = `
        <tbody>
          <tr><td data-row-key="route-3" data-col="route"></td><td data-row-key="route-3" data-col="height"></td></tr>
          <tr><td data-row-key="route-1" data-col="route"></td></tr>
          <tr><td data-row-key="route-2" data-col="route"></td></tr>
        </tbody>
      `;

      const ordered = getVisuallyOrderedRows(rows, table);
      expect(ordered.map((r) => r.key)).toEqual([
        'route-3',
        'route-1',
        'route-2',
      ]);
    });

    it('falls back to sorting with sorter and direction when tableEl is absent or incomplete', () => {
      const rows = [makeRow(1), makeRow(3), makeRow(2)];
      const ascentsSorter = (a: RoutesTableRow, b: RoutesTableRow) =>
        a.ascents - b.ascents;

      const asc = getVisuallyOrderedRows(
        rows,
        null,
        ascentsSorter,
        TuiSortDirection.Asc,
      );
      expect(asc.map((r) => r.id)).toEqual([1, 2, 3]);

      const desc = getVisuallyOrderedRows(
        rows,
        null,
        ascentsSorter,
        TuiSortDirection.Desc,
      );
      expect(desc.map((r) => r.id)).toEqual([3, 2, 1]);
    });
  });

  describe('findFirstEditableRow', () => {
    it('returns first row with canEdit=true', () => {
      const rows = [makeRow(1, false), makeRow(2, true), makeRow(3, true)];
      expect(findFirstEditableRow(rows)?.key).toBe('route-2');
    });

    it('falls back to first row when none are editable', () => {
      const rows = [makeRow(1, false), makeRow(2, false)];
      expect(findFirstEditableRow(rows)?.key).toBe('route-1');
    });
  });

  describe('resolveNextEditableCell', () => {
    const editableCols = ['route', 'crag', 'height'];

    it('moves down and skips non-editable rows', () => {
      const rows = [makeRow(1, true), makeRow(2, false), makeRow(3, true)];
      expect(
        resolveNextEditableCell(
          rows,
          editableCols,
          'route-1',
          'height',
          'down',
        ),
      ).toEqual({ rowKey: 'route-3', col: 'height' });
    });

    it('returns null when moving down from last editable row', () => {
      const rows = [makeRow(1, true), makeRow(2, false)];
      expect(
        resolveNextEditableCell(
          rows,
          editableCols,
          'route-1',
          'height',
          'down',
        ),
      ).toBeNull();
    });

    it('moves up and skips non-editable rows', () => {
      const rows = [makeRow(1, true), makeRow(2, false), makeRow(3, true)];
      expect(
        resolveNextEditableCell(rows, editableCols, 'route-3', 'crag', 'up'),
      ).toEqual({ rowKey: 'route-1', col: 'crag' });
    });

    it('moves right within the row and wraps to first editable col of next editable row', () => {
      const rows = [makeRow(1, true), makeRow(2, false), makeRow(3, true)];
      expect(
        resolveNextEditableCell(
          rows,
          editableCols,
          'route-1',
          'route',
          'right',
        ),
      ).toEqual({ rowKey: 'route-1', col: 'crag' });

      expect(
        resolveNextEditableCell(
          rows,
          editableCols,
          'route-1',
          'height',
          'right',
        ),
      ).toEqual({ rowKey: 'route-3', col: 'route' });
    });

    it('moves left within the row and wraps to last editable col of previous editable row', () => {
      const rows = [makeRow(1, true), makeRow(2, false), makeRow(3, true)];
      expect(
        resolveNextEditableCell(
          rows,
          editableCols,
          'route-3',
          'height',
          'left',
        ),
      ).toEqual({ rowKey: 'route-3', col: 'crag' });

      expect(
        resolveNextEditableCell(rows, editableCols, 'route-3', 'route', 'left'),
      ).toEqual({ rowKey: 'route-1', col: 'height' });
    });

    it('returns null when current rowKey is not found', () => {
      const rows = [makeRow(1, true)];
      expect(
        resolveNextEditableCell(rows, editableCols, 'missing', 'route', 'down'),
      ).toBeNull();
    });
  });

  describe('findEditableCellInput & focusTableCell & blurActiveTableElement', () => {
    it('skips hidden, disabled, chip, and filler inputs when finding editable input', () => {
      const td = document.createElement('td');
      td.innerHTML = `
        <input type="hidden" value="x" />
        <input disabled value="d" />
        <input tuiChip value="c" />
        <input class="t-filler" value="f" />
        <input class="real-input" value="hello" />
      `;
      const input = findEditableCellInput(td);
      expect(input?.classList.contains('real-input')).toBe(true);
    });

    it('focuses and selects standard text input inside cell', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tbody>
          <tr>
            <td data-row-key="route-1" data-col="route">
              <input type="text" value="Route 1" />
            </td>
          </tr>
        </tbody>
      `;
      document.body.appendChild(table);

      const input = table.querySelector('input') as HTMLInputElement;
      const selectSpy = vi.spyOn(input, 'select');

      const focused = focusTableCell(table, {
        rowKey: 'route-1',
        col: 'route',
      });
      expect(focused).toBe(true);
      expect(document.activeElement).toBe(input);
      expect(selectSpy).toHaveBeenCalled();

      blurActiveTableElement(table);
      expect(document.activeElement).not.toBe(input);
    });

    it('does not call select() on readonly or tuiSelectLike inputs', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tbody>
          <tr>
            <td data-row-key="route-1" data-col="crag">
              <input type="text" tuiSelectLike value="Sector A" />
            </td>
          </tr>
        </tbody>
      `;
      document.body.appendChild(table);

      const input = table.querySelector('input') as HTMLInputElement;
      const selectSpy = vi.spyOn(input, 'select');

      expect(focusTableCell(table, { rowKey: 'route-1', col: 'crag' })).toBe(
        true,
      );
      expect(document.activeElement).toBe(input);
      expect(selectSpy).not.toHaveBeenCalled();
    });

    it('focuses enabled button when cell has no input and falls back to cell element', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tbody>
          <tr>
            <td data-row-key="route-1" data-col="btn-col">
              <button type="button">Edit</button>
            </td>
            <td data-row-key="route-1" data-col="empty-col" tabindex="-1"></td>
          </tr>
        </tbody>
      `;
      document.body.appendChild(table);

      expect(focusTableCell(table, { rowKey: 'route-1', col: 'btn-col' })).toBe(
        true,
      );
      expect(document.activeElement?.tagName).toBe('BUTTON');

      expect(
        focusTableCell(table, { rowKey: 'route-1', col: 'empty-col' }),
      ).toBe(false);
      expect(document.activeElement).toBe(
        findTableCell(table, { rowKey: 'route-1', col: 'empty-col' }),
      );
    });
  });

  describe('hasOpenDropdownOptions & resolveTableKeyDownAction', () => {
    it('detects open dropdown options via tui-dropdown-open host and listbox options', () => {
      const cell = document.createElement('td');
      cell.innerHTML = `<div class="tui-dropdown-open"><input class="inp" /></div>`;
      const input = cell.querySelector('.inp') as HTMLElement;
      document.body.appendChild(cell);

      // Open host without dropdown options -> false
      expect(hasOpenDropdownOptions(input, cell)).toBe(false);

      // Add tui-dropdown with selectable option -> true
      const dropdown = document.createElement('tui-dropdown');
      const opt = document.createElement('button');
      opt.setAttribute('tuiOption', '');
      dropdown.appendChild(opt);
      document.body.appendChild(dropdown);

      expect(hasOpenDropdownOptions(input, cell)).toBe(true);
    });

    it('ignores non-empty-free dropdowns and returns true when target is inside dropdown', () => {
      const dropdown = document.createElement('tui-dropdown');
      const opt = document.createElement('button');
      dropdown.appendChild(opt);
      document.body.appendChild(dropdown);

      expect(hasOpenDropdownOptions(opt, null)).toBe(true);
    });

    it('resolves arrow, tab, escape, crag select enter, and backspace guard actions', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <tbody>
          <tr>
            <td data-row-key="route-1" data-col="route"><input class="name-inp" /></td>
            <td data-row-key="route-1" data-col="crag"><input class="crag-inp" tuiSelectLike /></td>
          </tr>
        </tbody>
      `;
      document.body.appendChild(table);
      const nameInput = table.querySelector('.name-inp') as HTMLElement;
      const cragInput = table.querySelector('.crag-inp') as HTMLElement;

      const makeEvent = (
        key: string,
        target: HTMLElement,
        shiftKey = false,
      ) => {
        const event = new KeyboardEvent('keydown', { key, shiftKey });
        Object.defineProperty(event, 'target', { value: target });
        return event;
      };

      expect(
        resolveTableKeyDownAction(makeEvent('ArrowDown', nameInput), {
          tableEl: table,
          selectedCell: { rowKey: 'route-1', col: 'route' },
          isHandlingBackspace: false,
        }),
      ).toEqual({ type: 'navigate', direction: 'down' });

      expect(
        resolveTableKeyDownAction(makeEvent('Tab', nameInput, true), {
          tableEl: table,
          selectedCell: { rowKey: 'route-1', col: 'route' },
          isHandlingBackspace: false,
        }),
      ).toEqual({ type: 'navigate', direction: 'left' });

      expect(
        resolveTableKeyDownAction(makeEvent('Escape', nameInput), {
          tableEl: table,
          selectedCell: { rowKey: 'route-1', col: 'route' },
          isHandlingBackspace: false,
        }),
      ).toEqual({ type: 'escape' });

      expect(
        resolveTableKeyDownAction(makeEvent('ArrowLeft', nameInput), {
          tableEl: table,
          selectedCell: { rowKey: 'route-1', col: 'route' },
          isHandlingBackspace: true,
        }),
      ).toEqual({ type: 'ignore' });

      expect(
        resolveTableKeyDownAction(makeEvent('Enter', cragInput), {
          tableEl: table,
          selectedCell: { rowKey: 'route-1', col: 'crag' },
          isHandlingBackspace: false,
        }),
      ).toEqual({ type: 'open-select', target: cragInput });

      expect(
        resolveTableKeyDownAction(makeEvent('Enter', nameInput), {
          tableEl: table,
          selectedCell: { rowKey: 'route-1', col: 'route' },
          isHandlingBackspace: false,
        }),
      ).toEqual({ type: 'ignore' });
    });

    it('ignores key events targeting elements outside the table and dropdown', () => {
      const table = document.createElement('table');
      const outside = document.createElement('input');
      document.body.appendChild(table);
      document.body.appendChild(outside);

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      Object.defineProperty(event, 'target', { value: outside });

      expect(
        resolveTableKeyDownAction(event, {
          tableEl: table,
          selectedCell: { rowKey: 'route-1', col: 'route' },
          isHandlingBackspace: false,
        }),
      ).toEqual({ type: 'ignore' });
    });
  });

  describe('sticky & scroll DOM helpers', () => {
    it('finds vertical scroll ancestor and sticky sibling while ignoring tui-scroll-controls', () => {
      const scroller = document.createElement('div');
      scroller.style.overflowY = 'auto';

      const stickyBar = document.createElement('div');
      stickyBar.style.position = 'sticky';

      const scrollControls = document.createElement('tui-scroll-controls');
      scrollControls.style.position = 'sticky';

      const host = document.createElement('div');
      scroller.appendChild(stickyBar);
      scroller.appendChild(scrollControls);
      scroller.appendChild(host);
      document.body.appendChild(scroller);

      expect(findVerticalScrollAncestor(host.parentElement)).toBe(scroller);
      expect(findStickySiblingAbove(host, scroller)).toBe(stickyBar);
    });
  });
});
