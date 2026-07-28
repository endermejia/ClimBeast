import { describe, it, expect } from 'vitest';
import {
  gradeToNumber,
  gradeToVerticalLife,
  computeGradeChartData,
} from './grade-chart';
import {
  VERTICAL_LIFE_GRADES,
  PROJECT_GRADE_LABEL,
  ORDERED_GRADE_VALUES,
} from '../models';

describe('gradeToNumber', () => {
  it('should convert grade label to number', () => {
    expect(gradeToNumber('8a')).toBe(VERTICAL_LIFE_GRADES.G8a);
  });

  it('should handle unknown grade', () => {
    expect(gradeToNumber('unknown')).toBe(0);
  });

  it('should handle undefined', () => {
    expect(gradeToNumber(undefined)).toBe(0);
  });

  it('should handle empty string', () => {
    expect(gradeToNumber('')).toBe(0);
  });

  it('should normalize grade with space', () => {
    expect(gradeToNumber('6a ')).toBe(VERTICAL_LIFE_GRADES.G6a);
  });
});

describe('gradeToVerticalLife', () => {
  it('should convert valid grade', () => {
    expect(gradeToVerticalLife('8a')).toBe(VERTICAL_LIFE_GRADES.G8a);
  });

  it('should return G0 for undefined', () => {
    expect(gradeToVerticalLife(undefined)).toBe(VERTICAL_LIFE_GRADES.G0);
  });

  it('should return G0 for unknown grade', () => {
    expect(gradeToVerticalLife('invalid')).toBe(VERTICAL_LIFE_GRADES.G0);
  });
});

describe('computeGradeChartData', () => {
  it('should compute chart data from empty counts', () => {
    const result = computeGradeChartData({}, -1);
    expect(result.values).toBeDefined();
    expect(result.total).toBe(0);
    expect(result.hasActive).toBe(false);
  });

  it('should compute chart data with counts', () => {
    const counts = {
      '6a': 5,
      '7a': 3,
      '8a': 1,
    };
    const result = computeGradeChartData(counts, -1);
    expect(result.total).toBe(9);
    expect(result.hasActive).toBe(false);
  });

  it('should compute active band data', () => {
    const counts = {
      '6a': 5,
      '7a': 3,
    };
    // Band 0 = grades 1-5, Band 1 = grade 6, Band 2 = grade 7
    // So index 1 = grade 6 band
    const result = computeGradeChartData(counts, 1);
    expect(result.hasActive).toBe(true);
  });

  it('should compute grade range', () => {
    const counts = {
      '6a': 5,
      '8a': 1,
    };
    const result = computeGradeChartData(counts, -1);
    expect(result.gradeRange).toContain('6a');
    expect(result.gradeRange).toContain('8a');
  });

  it('should compute single grade range', () => {
    const counts = {
      '7a': 3,
    };
    const result = computeGradeChartData(counts, -1);
    expect(result.gradeRange).toBe('7a');
  });
});
