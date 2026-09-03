import { describe, it, expect } from 'vitest';

import {
  cyclePointState,
  getPointStateBadge,
  getPointStateColor,
  getPointStateLabel,
  getPointsString,
  hasPath,
} from './topo-styles.utils';

describe('topo-styles.utils', () => {
  describe('getPointStateColor', () => {
    it('returns default color for undefined or neutral', () => {
      expect(getPointStateColor(undefined, '#fff')).toBe('#fff');
      expect(getPointStateColor('neutral', '#123')).toBe('#123');
    });

    it('returns specific colors for start, top, match, foot', () => {
      expect(getPointStateColor('start')).toBe('#22C55E');
      expect(getPointStateColor('top')).toBe('#EF4444');
      expect(getPointStateColor('match')).toBe('#3B82F6');
      expect(getPointStateColor('foot')).toBe('#EAB308');
    });
  });

  describe('getPointStateBadge', () => {
    it('returns S, T, M, F for corresponding states', () => {
      expect(getPointStateBadge('start')).toBe('S');
      expect(getPointStateBadge('top')).toBe('T');
      expect(getPointStateBadge('match')).toBe('M');
      expect(getPointStateBadge('foot')).toBe('F');
    });

    it('returns empty string for neutral or undefined', () => {
      expect(getPointStateBadge('neutral')).toBe('');
      expect(getPointStateBadge(undefined)).toBe('');
    });
  });

  describe('getPointStateLabel', () => {
    it('returns START, TOP, MATCH, FOOT for corresponding states', () => {
      expect(getPointStateLabel('start')).toBe('START');
      expect(getPointStateLabel('top')).toBe('TOP');
      expect(getPointStateLabel('match')).toBe('MATCH');
      expect(getPointStateLabel('foot')).toBe('FOOT');
    });

    it('returns empty string for neutral or undefined', () => {
      expect(getPointStateLabel('neutral')).toBe('');
      expect(getPointStateLabel(undefined)).toBe('');
    });
  });

  describe('cyclePointState', () => {
    it('cycles from neutral/undefined -> start -> top -> match -> foot -> neutral', () => {
      expect(cyclePointState(undefined)).toBe('start');
      expect(cyclePointState('neutral')).toBe('start');
      expect(cyclePointState('start')).toBe('top');
      expect(cyclePointState('top')).toBe('match');
      expect(cyclePointState('match')).toBe('foot');
      expect(cyclePointState('foot')).toBe('neutral');
    });
  });

  describe('getPointsString', () => {
    it('converts normalized points to SVG coordinate string', () => {
      const points = [
        { x: 0.1, y: 0.2 },
        { x: 0.5, y: 0.8 },
      ];
      expect(getPointsString(points, 1000, 500)).toBe('100,100 500,400');
    });
  });

  describe('hasPath', () => {
    it('returns true when path has points', () => {
      const map = new Map([[1, { points: [{ x: 0, y: 0 }] }]]);
      expect(hasPath(1, map)).toBe(true);
    });

    it('returns false when path has no points or does not exist', () => {
      const map = new Map([[1, { points: [] }]]);
      expect(hasPath(1, map)).toBe(false);
      expect(hasPath(2, map)).toBe(false);
    });
  });
});
