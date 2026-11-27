import {
  GRADE_COLORS,
  VERTICAL_LIFE_GRADES,
  GRADE_NUMBER_TO_LABEL,
  GradeLabel,
  PointState,
  TopoPath,
  colorForGrade,
} from '../models';

export const POINT_STATE_COLORS: Record<
  Exclude<PointState, 'neutral'>,
  string
> = {
  start: '#22C55E',
  top: '#EF4444',
  match: '#3B82F6',
  foot: '#EAB308',
};

export function getPointStateColor(
  state?: PointState,
  defaultColor = '#FFFFFF',
): string {
  if (!state || state === 'neutral') {
    return defaultColor;
  }
  return POINT_STATE_COLORS[state] ?? defaultColor;
}

export function getPointStateBadge(state?: PointState): string {
  switch (state) {
    case 'start':
      return 'S';
    case 'top':
      return 'T';
    case 'match':
      return 'M';
    case 'foot':
      return 'F';
    default:
      return '';
  }
}

export function getPointStateLabel(state?: PointState): string {
  switch (state) {
    case 'start':
      return 'START';
    case 'top':
      return 'TOP';
    case 'match':
      return 'MATCH';
    case 'foot':
      return 'FOOT';
    default:
      return '';
  }
}

export interface TopoPointPillGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
  textX: number;
  textY: number;
  fontSize: number;
}

export const TOPO_POINT_PILL_HEIGHT_FACTOR = 2.1;
export const TOPO_POINT_PILL_OFFSET_FACTOR = 0.45;
export const TOPO_POINT_PILL_FONT_FACTOR = 1.5;
export const TOPO_POINT_PILL_TEXT_Y_FACTOR = 0.32;

export function getTopoPointPillWidthMultiplier(state?: PointState): number {
  switch (state) {
    case 'match':
      return 5.8;
    case 'start':
      return 5.5;
    case 'foot':
      return 5.0;
    default:
      return 4.2;
  }
}

export function computeTopoPointPillRect(
  cx: number,
  cy: number,
  anchorRadius: number,
  strokeWidth: number,
  state?: PointState,
  position: 'below' | 'above' = 'below',
): TopoPointPillGeometry {
  const width = strokeWidth * getTopoPointPillWidthMultiplier(state);
  const height = strokeWidth * TOPO_POINT_PILL_HEIGHT_FACTOR;
  const offset = anchorRadius + height * TOPO_POINT_PILL_OFFSET_FACTOR;
  const pillY = position === 'above' ? cy - offset : cy + offset;
  return {
    x: cx - width / 2,
    y: pillY - height / 2,
    width,
    height,
    rx: height / 2,
    textX: cx,
    textY: pillY + height * TOPO_POINT_PILL_TEXT_Y_FACTOR,
    fontSize: strokeWidth * TOPO_POINT_PILL_FONT_FACTOR,
  };
}

export function cyclePointState(currentState?: PointState): PointState {
  switch (currentState) {
    case 'start':
      return 'top';
    case 'top':
      return 'match';
    case 'match':
      return 'foot';
    case 'foot':
      return 'neutral';
    case 'neutral':
    default:
      return 'start';
  }
}

export function getRouteColor(
  grade: string | number | null | undefined,
): string {
  if (
    grade === null ||
    grade === undefined ||
    grade === 0 ||
    grade === '0' ||
    grade === '?'
  ) {
    return GRADE_COLORS[5];
  }

  const label = GRADE_NUMBER_TO_LABEL[grade as VERTICAL_LIFE_GRADES] ?? grade;
  return colorForGrade(label as GradeLabel) || GRADE_COLORS[5];
}

export function getRouteStyleProperties(
  isSelected: boolean,
  isHovered: boolean,
  grade: string | number | null | undefined,
  customColor?: string | null,
  hasSelection = false,
): { stroke: string; opacity: number; isDashed: boolean } {
  const isZero =
    grade === null ||
    grade === undefined ||
    grade === 0 ||
    grade === '0' ||
    grade === '?';

  const isValidCustomColor =
    customColor &&
    customColor !== 'var(--tui-background-accent-opposite)' &&
    customColor !== '#000000' &&
    customColor !== '#000' &&
    customColor !== 'black';

  const finalColor = isZero
    ? GRADE_COLORS[5]
    : isValidCustomColor
      ? customColor
      : getRouteColor(grade);

  // Opacity:
  // If a route is selected:
  //   Selected or hovered route = 1
  //   Other routes = 0.5 (reduced opacity)
  // If no route is selected:
  //   Hovered = 1, Default = 0.8
  const opacity = hasSelection
    ? isSelected || isHovered
      ? 1
      : 0.5
    : isHovered
      ? 1
      : 0.8;

  // Dash: Selected/Hovered = Solid, Default = Dashed
  const isDashed = !isSelected && !isHovered;

  return {
    stroke: finalColor,
    opacity,
    isDashed,
  };
}

export function getRouteStrokeWidth(
  isSelected: boolean,
  isHovered: boolean,
  baseWidth = 5,
  viewMode: 'editor' | 'viewer' = 'editor',
  customWidth?: number,
): number {
  const width = customWidth || baseWidth;
  const factor = width / 1000;

  if (viewMode === 'viewer') {
    if (isSelected) return factor * 1.6;
    if (isHovered) return factor * 1.4;
    return factor;
  }

  // In editor mode, we return the factor to be multiplied by the image width
  return isSelected ? factor * 1.6 : factor;
}

/**
 * Convert a list of normalized points (0-1) to an SVG points string
 * with optional scale factors.
 */
export function getPointsString(
  points: { x: number; y: number }[],
  scaleX = 1,
  scaleY = 1,
): string {
  return points.map((p) => `${p.x * scaleX},${p.y * scaleY}`).join(' ');
}

/**
 * Check whether a route has a non-empty path in the given paths map.
 */
export function hasPath(
  routeId: string | number,
  pathsMap: Map<string | number, { points: { x: number; y: number }[] }>,
): boolean {
  const pathData = pathsMap.get(routeId);
  return !!pathData && pathData.points.length > 0;
}

/**
 * Calculates the number of moves for a route's path.
 * - Points with state 'start' or 'foot' count as 0 moves.
 * - Points with state 'match' count as 2 moves.
 * - Any other points (neutral, top, or unspecified) count as 1 move.
 */
export function calculateRouteMoves(path?: TopoPath | null): number {
  if (!path?.points || path.points.length === 0) return 0;
  return path.points.reduce((acc, pt) => {
    if (pt.state === 'start' || pt.state === 'foot') return acc;
    if (pt.state === 'match') return acc + 2;
    return acc + 1;
  }, 0);
}
