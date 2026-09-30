import { describe, expect, it } from 'vitest';

import { ClimbingKinds } from '../models';

import { ClimbingKindByLabelPipe } from './climbing-kind.pipe';

describe('ClimbingKindByLabelPipe', () => {
  const pipe = new ClimbingKindByLabelPipe();
  const items = ['Sport', 'Boulder', 'Multipitch'];

  it('maps sport label to SPORT kind', () => {
    expect(pipe.transform('Sport', items)).toBe(ClimbingKinds.SPORT);
  });

  it('maps boulder label to BOULDER kind', () => {
    expect(pipe.transform('Boulder', items)).toBe(ClimbingKinds.BOULDER);
  });

  it('maps multipitch label to MULTIPITCH kind', () => {
    expect(pipe.transform('Multipitch', items)).toBe(ClimbingKinds.MULTIPITCH);
  });

  it('returns null for unknown label or incomplete items', () => {
    expect(pipe.transform('Unknown', items)).toBeNull();
    expect(pipe.transform('Sport', [])).toBeNull();
  });
});
