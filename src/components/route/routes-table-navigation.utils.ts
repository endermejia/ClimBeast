import { TuiSortDirection } from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';

import { RoutesTableRow } from '../../models';

export interface TableCellCoords {
  rowKey: string;
  col: string;
}

export type TableNavigationDirection = 'up' | 'down' | 'left' | 'right';

export type TableKeyDownAction =
  | { type: 'ignore' }
  | { type: 'escape' }
  | { type: 'open-select'; target: HTMLElement }
  | { type: 'navigate'; direction: TableNavigationDirection };

const EDITABLE_CELL_INPUT_SELECTOR =
  'input:not([disabled]):not([type="hidden"]):not([tuiChip]):not(.t-filler), select:not([disabled])';
const DROPDOWN_CONTAINER_SELECTOR = 'tui-dropdown, [role="listbox"]';
const DROPDOWN_OPTION_SELECTOR =
  '[role="option"]:not(.t-empty), [tuiOption]:not(.t-empty), button[tuiOption], a[tuiOption]';

export function getVisuallyOrderedRows(
  items: readonly RoutesTableRow[],
  tableEl: HTMLElement | null | undefined,
  sorter?: TuiComparator<RoutesTableRow> | null,
  direction: TuiSortDirection = TuiSortDirection.Asc,
): RoutesTableRow[] {
  if (tableEl) {
    const byKey = new Map<string, RoutesTableRow>();
    for (const item of items) {
      byKey.set(item.key, item);
    }
    const ordered: RoutesTableRow[] = [];
    const seen = new Set<string>();
    const cells = Array.from<Element>(
      tableEl.querySelectorAll('tbody td[data-row-key]'),
    );
    for (const cell of cells) {
      const key = cell.getAttribute('data-row-key');
      if (key && !seen.has(key)) {
        seen.add(key);
        const row = byKey.get(key);
        if (row) {
          ordered.push(row);
        }
      }
    }
    if (ordered.length === items.length && ordered.length > 0) {
      return ordered;
    }
  }

  const copy = [...items];
  if (sorter) {
    copy.sort((a, b) => direction * sorter(a, b));
  }
  return copy;
}

export function findFirstEditableRow(
  sortedRows: readonly RoutesTableRow[],
): RoutesTableRow | undefined {
  return sortedRows.find((r) => !!r.canEdit) || sortedRows[0];
}

export function resolveNextEditableCell(
  sortedRows: readonly RoutesTableRow[],
  editableCols: readonly string[],
  currentRowKey: string,
  currentCol: string,
  direction: TableNavigationDirection,
): TableCellCoords | null {
  const rowIndex = sortedRows.findIndex((r) => r.key === currentRowKey);
  if (rowIndex === -1) return null;

  const colIndex = editableCols.indexOf(currentCol);

  if (direction === 'down') {
    const nextRow = sortedRows.slice(rowIndex + 1).find((r) => !!r.canEdit);
    return nextRow ? { rowKey: nextRow.key, col: currentCol } : null;
  }

  if (direction === 'up') {
    const prevRow = [...sortedRows.slice(0, rowIndex)]
      .reverse()
      .find((r) => !!r.canEdit);
    return prevRow ? { rowKey: prevRow.key, col: currentCol } : null;
  }

  if (direction === 'right') {
    if (colIndex !== -1 && colIndex < editableCols.length - 1) {
      return {
        rowKey: currentRowKey,
        col: editableCols[colIndex + 1],
      };
    }
    const nextRow = sortedRows.slice(rowIndex + 1).find((r) => !!r.canEdit);
    if (nextRow && editableCols.length > 0) {
      return { rowKey: nextRow.key, col: editableCols[0] };
    }
    return null;
  }

  if (colIndex > 0) {
    return {
      rowKey: currentRowKey,
      col: editableCols[colIndex - 1],
    };
  }
  const prevRow = [...sortedRows.slice(0, rowIndex)]
    .reverse()
    .find((r) => !!r.canEdit);
  if (prevRow && editableCols.length > 0) {
    return {
      rowKey: prevRow.key,
      col: editableCols[editableCols.length - 1],
    };
  }
  return null;
}

export function findTableCell(
  tableEl: HTMLElement,
  cell: TableCellCoords,
): HTMLElement | null {
  return tableEl.querySelector(
    `td[data-row-key="${cell.rowKey}"][data-col="${cell.col}"]`,
  ) as HTMLElement | null;
}

export function findEditableCellInput(
  cellEl: HTMLElement,
): HTMLInputElement | HTMLSelectElement | null {
  return cellEl.querySelector(EDITABLE_CELL_INPUT_SELECTOR) as
    HTMLInputElement | HTMLSelectElement | null;
}

export function blurActiveTableElement(
  tableEl: HTMLElement | null | undefined,
): void {
  if (
    typeof document !== 'undefined' &&
    document.activeElement instanceof HTMLElement
  ) {
    if (
      tableEl?.contains(document.activeElement) ||
      document.activeElement.closest(DROPDOWN_CONTAINER_SELECTOR)
    ) {
      document.activeElement.blur();
    }
  }
}

export function focusTableCell(
  tableEl: HTMLElement | null | undefined,
  cell: TableCellCoords | null,
): boolean {
  if (!cell || !tableEl) return false;

  const cellEl = findTableCell(tableEl, cell);
  if (!cellEl) return false;

  const input = findEditableCellInput(cellEl);
  if (input) {
    input.focus({ preventScroll: true });
    input.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    if (
      input instanceof HTMLInputElement &&
      !input.readOnly &&
      !input.hasAttribute('tuiSelectLike') &&
      input.type !== 'checkbox' &&
      input.type !== 'radio' &&
      input.type !== 'file'
    ) {
      input.select?.();
    }
    return true;
  }

  const btn = cellEl.querySelector(
    'button:not([disabled])',
  ) as HTMLButtonElement | null;
  if (btn) {
    btn.focus({ preventScroll: true });
    btn.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    return true;
  }

  cellEl.focus({ preventScroll: true });
  cellEl.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  return false;
}

export function hasOpenDropdownOptions(
  target: HTMLElement,
  cell: HTMLElement | null,
): boolean {
  if (target.closest(DROPDOWN_CONTAINER_SELECTOR)) {
    return true;
  }

  const openHost =
    target.closest('.tui-dropdown-open, [aria-expanded="true"]') ||
    cell?.querySelector('.tui-dropdown-open, [aria-expanded="true"]');

  if (!openHost) {
    return false;
  }

  const controlsId = openHost.getAttribute('aria-controls');
  const openDropdown =
    (controlsId ? document.getElementById(controlsId) : null) ||
    document.querySelector(DROPDOWN_CONTAINER_SELECTOR);

  if (openDropdown) {
    const options = openDropdown.querySelectorAll(DROPDOWN_OPTION_SELECTOR);
    if (options.length > 0) {
      return true;
    }
  }

  if (cell) {
    const cellOptions = cell.querySelectorAll(DROPDOWN_OPTION_SELECTOR);
    return cellOptions.length > 0;
  }

  return false;
}

export function resolveTableKeyDownAction(
  event: KeyboardEvent,
  params: {
    tableEl: HTMLElement;
    selectedCell: TableCellCoords;
    isHandlingBackspace: boolean;
  },
): TableKeyDownAction {
  const isDown = event.key === 'ArrowDown';
  const isUp = event.key === 'ArrowUp';
  const isLeft = event.key === 'ArrowLeft';
  const isRight = event.key === 'ArrowRight';
  const isTab = event.key === 'Tab';
  const isEsc = event.key === 'Escape';
  const isEnterOrSpace = event.key === 'Enter' || event.key === ' ';

  if (
    !isDown &&
    !isUp &&
    !isLeft &&
    !isRight &&
    !isTab &&
    !isEsc &&
    !isEnterOrSpace
  ) {
    return { type: 'ignore' };
  }

  if (isLeft && params.isHandlingBackspace) {
    return { type: 'ignore' };
  }

  const target = event.target as HTMLElement | null;
  if (!target) return { type: 'ignore' };

  const isInsideTable = params.tableEl.contains(target);
  const isInsideDropdown = !!target.closest(DROPDOWN_CONTAINER_SELECTOR);
  const isDocumentRoot =
    typeof document !== 'undefined' &&
    (target === document.body || target === document.documentElement);

  if (!isInsideTable && !isInsideDropdown && !isDocumentRoot) {
    return { type: 'ignore' };
  }

  const currentCell =
    target.closest('td') ?? findTableCell(params.tableEl, params.selectedCell);

  if (
    (isUp || isDown || isEnterOrSpace || isEsc) &&
    hasOpenDropdownOptions(target, currentCell)
  ) {
    return { type: 'ignore' };
  }

  if (isEnterOrSpace) {
    if (
      params.selectedCell.col === 'crag' &&
      target.hasAttribute('tuiSelectLike')
    ) {
      return { type: 'open-select', target };
    }
    return { type: 'ignore' };
  }

  if (isEsc) {
    return { type: 'escape' };
  }

  if (isTab) {
    return { type: 'navigate', direction: event.shiftKey ? 'left' : 'right' };
  }

  if (isRight) {
    return { type: 'navigate', direction: 'right' };
  }

  if (isLeft) {
    return { type: 'navigate', direction: 'left' };
  }

  if (isDown) {
    return { type: 'navigate', direction: 'down' };
  }

  return { type: 'navigate', direction: 'up' };
}

export function findVerticalScrollAncestor(
  start: HTMLElement | null,
): HTMLElement | null {
  let el = start;
  while (el && el !== document.documentElement && el !== document.body) {
    const overflowY = getComputedStyle(el).overflowY;
    if (
      overflowY === 'auto' ||
      overflowY === 'scroll' ||
      overflowY === 'overlay'
    ) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

export function findStickySiblingAbove(
  hostElement: HTMLElement,
  scrollContainer: HTMLElement | null,
): HTMLElement | null {
  let cur: HTMLElement | null = hostElement;
  while (cur && cur !== scrollContainer && cur !== document.body) {
    // Stop at tui-scrollbar's .t-content wrapper so we never inspect
    // internal scrollbar chrome such as <tui-scroll-controls> (position: sticky, height: 100%).
    if (
      cur.classList.contains('t-content') &&
      cur.parentElement === scrollContainer
    ) {
      break;
    }
    let sib = cur.previousElementSibling as HTMLElement | null;
    while (sib) {
      if (
        sib.tagName !== 'TUI-SCROLL-CONTROLS' &&
        getComputedStyle(sib).position === 'sticky'
      ) {
        return sib;
      }
      sib = sib.previousElementSibling as HTMLElement | null;
    }
    cur = cur.parentElement;
  }
  return null;
}
