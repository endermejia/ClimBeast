import { TopoPath, TopoPoint, TopoRouteWithRoute } from '../../models';

import {
  cloneTopoPoint,
  EditorPathEntry,
  serializeTopoPath,
} from './topo-path-editor.utils';

export const DEFAULT_HISTORY_MAX_SIZE = 50;

export interface TopoPathSnapshotEntry {
  readonly points: readonly TopoPoint[];
  readonly color?: string;
  readonly width?: number;
  readonly type?: 'line' | 'circle';
  readonly isTraverse?: boolean;
}

export type TopoPathHistorySnapshot = ReadonlyMap<
  string | number,
  TopoPathSnapshotEntry
>;

export interface TopoPathHistoryState<T = TopoPathHistorySnapshot> {
  readonly past: readonly T[];
  readonly present: T;
  readonly future: readonly T[];
  readonly maxSize: number;
}

/**
 * Creates a fresh immutable history state with an initial snapshot and max stack size.
 */
export function createHistoryState<T>(
  initial: T,
  maxSize = DEFAULT_HISTORY_MAX_SIZE,
): TopoPathHistoryState<T> {
  return {
    past: [],
    present: initial,
    future: [],
    maxSize: Math.max(0, Math.floor(maxSize)),
  };
}

export function canUndo<T>(state: TopoPathHistoryState<T>): boolean {
  return state.past.length > 0;
}

export function canRedo<T>(state: TopoPathHistoryState<T>): boolean {
  return state.future.length > 0;
}

/**
 * Pushes a new present snapshot onto the history stack, clearing any redo future
 * and enforcing `state.maxSize`. If `isEqual` reports no change, returns `state`
 * unchanged.
 */
export function pushHistory<T>(
  state: TopoPathHistoryState<T>,
  next: T,
  isEqual?: (a: T, b: T) => boolean,
): TopoPathHistoryState<T> {
  if (isEqual?.(state.present, next)) {
    return state;
  }

  if (state.maxSize === 0) {
    return {
      ...state,
      past: [],
      present: next,
      future: [],
    };
  }

  const nextPast = [...state.past, state.present];
  const trimmedPast =
    nextPast.length > state.maxSize
      ? nextPast.slice(nextPast.length - state.maxSize)
      : nextPast;

  return {
    ...state,
    past: trimmedPast,
    present: next,
    future: [],
  };
}

/**
 * Moves one step backward in history. Returns `state` unchanged when `past` is empty.
 */
export function undoHistory<T>(
  state: TopoPathHistoryState<T>,
): TopoPathHistoryState<T> {
  if (state.past.length === 0) return state;

  const previous = state.past[state.past.length - 1];
  const nextPast = state.past.slice(0, -1);
  const nextFuture = [state.present, ...state.future];

  return {
    ...state,
    past: nextPast,
    present: previous,
    future: nextFuture,
  };
}

/**
 * Moves one step forward in history. Returns `state` unchanged when `future` is empty.
 */
export function redoHistory<T>(
  state: TopoPathHistoryState<T>,
): TopoPathHistoryState<T> {
  if (state.future.length === 0) return state;

  const [next, ...restFuture] = state.future;
  const nextPast = [...state.past, state.present];
  const trimmedPast =
    state.maxSize > 0 && nextPast.length > state.maxSize
      ? nextPast.slice(nextPast.length - state.maxSize)
      : state.maxSize === 0
        ? []
        : nextPast;

  return {
    ...state,
    past: trimmedPast,
    present: next,
    future: restFuture,
  };
}

/**
 * Clears past and future history while preserving (or replacing) the present state.
 */
export function clearHistory<T>(
  state: TopoPathHistoryState<T>,
  nextPresent?: T,
): TopoPathHistoryState<T> {
  return {
    ...state,
    past: [],
    present: nextPresent !== undefined ? nextPresent : state.present,
    future: [],
  };
}

/**
 * Creates a deep-cloned, ref-free snapshot of the editor's paths map.
 */
export function createPathsSnapshot(
  pathsMap: ReadonlyMap<string | number, EditorPathEntry>,
): TopoPathHistorySnapshot {
  const snapshot = new Map<string | number, TopoPathSnapshotEntry>();
  for (const [routeId, entry] of pathsMap) {
    snapshot.set(routeId, {
      points: entry.points.map(cloneTopoPoint),
      color: entry.color,
      width: entry.width,
      type: entry.type,
      isTraverse: entry.isTraverse,
    });
  }
  return snapshot;
}

/**
 * Compares two path snapshots for semantic equality across all route entries.
 */
export function arePathsSnapshotsEqual(
  a: TopoPathHistorySnapshot,
  b: TopoPathHistorySnapshot,
): boolean {
  if (a.size !== b.size) return false;
  for (const [key, entryA] of a) {
    const entryB = b.get(key);
    if (!entryB) return false;
    const serA = serializeTopoPath(entryA as unknown as TopoPath);
    const serB = serializeTopoPath(entryB as unknown as TopoPath);
    if (serA !== serB) return false;
    if (
      (entryA.type || 'line') !== (entryB.type || 'line') ||
      !!entryA.isTraverse !== !!entryB.isTraverse ||
      entryA.color !== entryB.color ||
      entryA.width !== entryB.width
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Reconstructs a mutable `pathsMap` from a history snapshot, attaching `_ref`
 * from `topoRoutes` and synchronizing each route's `.path` reference.
 */
export function applyPathsSnapshot(
  snapshot: TopoPathHistorySnapshot,
  topoRoutes: readonly TopoRouteWithRoute[],
): Map<string | number, EditorPathEntry> {
  const routeById = new Map<string, TopoRouteWithRoute>();
  for (const tr of topoRoutes) {
    routeById.set(String(tr.route_id), tr);
    tr.path = null;
  }

  const nextMap = new Map<string | number, EditorPathEntry>();
  for (const [routeId, entry] of snapshot) {
    const ref = routeById.get(String(routeId));
    if (!ref) continue;
    const clonedPoints = entry.points.map(cloneTopoPoint);
    nextMap.set(routeId, {
      points: clonedPoints,
      color: entry.color,
      width: entry.width,
      type: entry.type,
      isTraverse: entry.isTraverse,
      _ref: ref,
    });
    if (clonedPoints.length > 0) {
      ref.path = {
        points: clonedPoints.map(cloneTopoPoint),
        color: entry.color,
        width: entry.width,
        type: entry.type,
        isTraverse: entry.isTraverse,
      };
    }
  }

  return nextMap;
}
