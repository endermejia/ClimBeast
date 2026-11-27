import { TopoPath, TopoPoint, TopoRouteWithRoute } from '../../models';

export interface EditorPathEntry {
  points: TopoPoint[];
  color?: string;
  width?: number;
  type?: 'line' | 'circle';
  isTraverse?: boolean;
  _ref: TopoRouteWithRoute;
}

export interface EditorPoint2D {
  x: number;
  y: number;
}

export interface ViewportBounds {
  areaWidth: number;
  areaHeight: number;
  contentWidth: number;
  contentHeight: number;
  scale: number;
  restingLeft?: number;
  restingTop?: number;
}

export interface RoutePathMeta {
  hasPath: boolean;
  isTraverse: boolean;
}

export interface PathUpdatePayload {
  routeId: string | number;
  path: TopoPath | null;
}

export interface ModifiedIndoorRoutesOptions {
  routesReordered: boolean;
  newRouteIds: ReadonlySet<string>;
  newlyLinkedRouteIds: ReadonlySet<string | number>;
}

/**
 * Clamps a normalized coordinate to the [0, 1] interval.
 * Non-finite inputs fall back to 0.
 */
export function clampNormalized(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Returns a new TopoPoint with x and y clamped to [0, 1].
 */
export function clampPoint(point: TopoPoint): TopoPoint {
  const clamped: TopoPoint = {
    x: clampNormalized(point.x),
    y: clampNormalized(point.y),
  };
  if (point.state !== undefined) {
    clamped.state = point.state;
  }
  return clamped;
}

/**
 * Converts client coordinates relative to a bounding rectangle into a clamped
 * normalized [0, 1] TopoPoint with default 'neutral' state.
 */
export function normalizeClientPoint(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
): TopoPoint {
  const x = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
  const y = rect.height > 0 ? (clientY - rect.top) / rect.height : 0;
  return {
    x: clampNormalized(x),
    y: clampNormalized(y),
    state: 'neutral',
  };
}

/**
 * Computes the initial fit scale to display content inside a viewport area
 * without exceeding `maxScale`.
 */
export function computeFitScale(
  areaWidth: number,
  areaHeight: number,
  contentWidth: number,
  contentHeight: number,
  maxScale = 1,
): number {
  if (
    areaWidth <= 0 ||
    areaHeight <= 0 ||
    contentWidth <= 0 ||
    contentHeight <= 0
  ) {
    return maxScale;
  }
  return Math.min(
    areaWidth / contentWidth,
    areaHeight / contentHeight,
    maxScale,
  );
}

/**
 * Returns the bounding-box center of a list of points, or null if empty.
 */
export function computePathCentroid(
  points: readonly TopoPoint[],
): EditorPoint2D | null {
  if (points.length === 0) return null;
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  for (let i = 1; i < points.length; i++) {
    const pt = points[i];
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  };
}

/**
 * Computes constrained canvas translation so a normalized point is centered
 * inside the viewport area at the current scale.
 */
export function computeCenteredTranslation(
  point: EditorPoint2D,
  bounds: ViewportBounds,
): EditorPoint2D {
  const restingLeft = bounds.restingLeft ?? 0;
  const restingTop = bounds.restingTop ?? 0;
  const scaledW = bounds.contentWidth * bounds.scale;
  const scaledH = bounds.contentHeight * bounds.scale;

  let targetX =
    bounds.areaWidth / 2 -
    restingLeft -
    point.x * bounds.contentWidth * bounds.scale;
  let targetY =
    bounds.areaHeight / 2 -
    restingTop -
    point.y * bounds.contentHeight * bounds.scale;

  if (scaledW > bounds.areaWidth) {
    const minX = -restingLeft - (scaledW - bounds.areaWidth);
    const maxX = -restingLeft;
    targetX = Math.max(minX, Math.min(targetX, maxX));
  } else {
    targetX = (bounds.areaWidth - scaledW) / 2 - restingLeft;
  }

  if (scaledH > bounds.areaHeight) {
    const minY = -restingTop - (scaledH - bounds.areaHeight);
    const maxY = -restingTop;
    targetY = Math.max(minY, Math.min(targetY, maxY));
  } else {
    targetY = (bounds.areaHeight - scaledH) / 2 - restingTop;
  }

  return { x: targetX || 0, y: targetY || 0 };
}

/**
 * Squared Euclidean distance between two 2D points.
 */
export function distanceSquared(a: EditorPoint2D, b: EditorPoint2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Squared shortest distance from a point to a line segment [segStart, segEnd].
 */
export function pointToSegmentDistanceSquared(
  point: EditorPoint2D,
  segStart: EditorPoint2D,
  segEnd: EditorPoint2D,
): number {
  const dx = segEnd.x - segStart.x;
  const dy = segEnd.y - segStart.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return distanceSquared(point, segStart);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lenSq,
    ),
  );
  const projX = segStart.x + t * dx;
  const projY = segStart.y + t * dy;
  return distanceSquared(point, { x: projX, y: projY });
}

/**
 * Finds the index of the nearest point to `target` within `maxDistance` (inclusive).
 * Returns -1 when the list is empty or no point lies within `maxDistance`.
 */
export function findNearestPointIndex(
  points: readonly TopoPoint[],
  target: EditorPoint2D,
  maxDistance = Number.POSITIVE_INFINITY,
): number {
  if (points.length === 0 || maxDistance < 0) return -1;
  const maxDistSq = maxDistance * maxDistance;
  let bestIdx = -1;
  let bestDistSq = maxDistSq;

  for (let i = 0; i < points.length; i++) {
    const dSq = distanceSquared(points[i], target);
    if (dSq <= bestDistSq) {
      bestDistSq = dSq;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * Finds the starting index `i` of the polyline segment `(points[i], points[i+1])`
 * closest to `target` within `maxDistance` (inclusive).
 * Returns -1 when fewer than 2 points exist or no segment lies within `maxDistance`.
 */
export function findNearestSegmentIndex(
  points: readonly TopoPoint[],
  target: EditorPoint2D,
  maxDistance = Number.POSITIVE_INFINITY,
): number {
  if (points.length < 2 || maxDistance < 0) return -1;
  const maxDistSq = maxDistance * maxDistance;
  let bestIdx = -1;
  let bestDistSq = maxDistSq;

  for (let i = 0; i < points.length - 1; i++) {
    const dSq = pointToSegmentDistanceSquared(target, points[i], points[i + 1]);
    if (dSq <= bestDistSq) {
      bestDistSq = dSq;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * Immutably inserts a clamped point after `segmentIndex` (between `points[segmentIndex]`
 * and `points[segmentIndex + 1]`). Out-of-bounds indices clamp cleanly to [0, points.length].
 */
export function insertPointAtSegment(
  points: readonly TopoPoint[],
  point: TopoPoint,
  segmentIndex: number,
): TopoPoint[] {
  const insertPos = Math.max(0, Math.min(points.length, segmentIndex + 1));
  const clamped = clampPoint(point);
  return [
    ...points.slice(0, insertPos).map(cloneTopoPoint),
    clamped,
    ...points.slice(insertPos).map(cloneTopoPoint),
  ];
}

/**
 * Formats normalized points into an SVG `polyline` points attribute string.
 */
export function formatSvgPoints(
  points: readonly TopoPoint[],
  width = 1,
  height = 1,
): string {
  return points.map((p) => `${p.x * width},${p.y * height}`).join(' ');
}

/**
 * Parses numeric string route IDs back into numbers while keeping non-numeric
 * string IDs (e.g. indoor UUIDs) intact.
 */
export function parseRouteId(routeId: string | number): string | number {
  if (typeof routeId === 'number') return routeId;
  if (routeId.trim() === '') return routeId;
  const parsed = Number(routeId);
  return Number.isNaN(parsed) ? routeId : parsed;
}

/**
 * Deep-clones a single TopoPoint.
 */
export function cloneTopoPoint(point: TopoPoint): TopoPoint {
  return point.state !== undefined
    ? { x: point.x, y: point.y, state: point.state }
    : { x: point.x, y: point.y };
}

/**
 * Deep-clones a TopoPath, returning null for null/undefined inputs.
 */
export function cloneTopoPath(
  path: TopoPath | null | undefined,
): TopoPath | null {
  if (!path) return null;
  return {
    ...path,
    points: path.points.map(cloneTopoPoint),
  };
}

/**
 * Deep-clones an editor paths map (points and entry metadata), preserving `_ref`.
 */
export function clonePathsMap(
  pathsMap: ReadonlyMap<string | number, EditorPathEntry>,
): Map<string | number, EditorPathEntry> {
  const cloned = new Map<string | number, EditorPathEntry>();
  for (const [key, entry] of pathsMap) {
    cloned.set(key, {
      ...entry,
      points: entry.points.map(cloneTopoPoint),
    });
  }
  return cloned;
}

/**
 * Produces a canonical JSON string for dirty-checking and path equality comparisons.
 * Empty or nullish paths serialize to `''`.
 */
export function serializeTopoPath(path: TopoPath | null | undefined): string {
  if (!path || !path.points || path.points.length === 0) return '';
  return JSON.stringify({
    pts: path.points.map((pt) => ({ x: pt.x, y: pt.y, s: pt.state })),
    type: path.type || 'line',
    t: !!path.isTraverse,
  });
}

/**
 * Compares two TopoPaths semantically based on their serialized points, type,
 * and traverse flag.
 */
export function areTopoPathsEqual(
  a: TopoPath | null | undefined,
  b: TopoPath | null | undefined,
): boolean {
  return serializeTopoPath(a) === serializeTopoPath(b);
}

/**
 * Builds the sidebar route-path metadata map (whether a route has points and is a traverse).
 */
export function buildRoutePathsMeta(
  pathsMap: ReadonlyMap<string | number, EditorPathEntry>,
): Map<string | number, RoutePathMeta> {
  const meta = new Map<string | number, RoutePathMeta>();
  for (const [id, entry] of pathsMap) {
    meta.set(id, {
      hasPath: (entry.points?.length ?? 0) > 0,
      isTraverse: !!entry.isTraverse,
    });
  }
  return meta;
}

/**
 * Serializes editor state into the `pathsToUpdate` array expected by persistence
 * and dialog completion results.
 */
export function buildPathsToUpdate(
  topoRoutes: readonly TopoRouteWithRoute[],
  pathsMap: ReadonlyMap<string | number, EditorPathEntry>,
  lineWidth: number,
  isIndoor: boolean,
): PathUpdatePayload[] {
  return topoRoutes.map((tr) => {
    const path = pathsMap.get(tr.route_id);
    const hasPoints = !!path?.points && path.points.length > 0;
    return {
      routeId: tr.route_id,
      path: hasPoints
        ? ({
            points: path.points.map(cloneTopoPoint),
            color: isIndoor
              ? (path._ref?.route?.color ?? path.color)
              : path.color,
            width: lineWidth,
            type: path.type || 'line',
            isTraverse: path.isTraverse || false,
          } as TopoPath)
        : null,
    };
  });
}

/**
 * Filters indoor topo routes to only those that need to be upserted:
 * reordered, newly created, newly linked, or whose serialized path changed.
 */
export function filterModifiedIndoorRoutes(
  topoRoutes: readonly TopoRouteWithRoute[],
  pathsToUpdate: readonly PathUpdatePayload[],
  initialPathsSerialized: ReadonlyMap<string, string>,
  options: ModifiedIndoorRoutesOptions,
): TopoRouteWithRoute[] {
  const pathById = new Map(
    pathsToUpdate.map((p) => [String(p.routeId), p.path]),
  );

  return topoRoutes.filter((tr) => {
    if (options.routesReordered) return true;
    if (options.newRouteIds.has(String(tr.route_id))) return true;
    if (options.newlyLinkedRouteIds.has(tr.route_id)) return true;

    const path = pathById.get(String(tr.route_id));
    const currentSerialized = serializeTopoPath(
      path && path.points && path.points.length > 0 ? path : null,
    );
    const initialSerialized =
      initialPathsSerialized.get(String(tr.route_id)) ?? '';
    return currentSerialized !== initialSerialized;
  });
}
