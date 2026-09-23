import { describe, expect, it } from 'vitest';

import { inputValueOrUndefined } from './input.utils';

describe('inputValueOrUndefined', () => {
  it('devuelve el valor cuando la input ya está enlazada', () => {
    expect(inputValueOrUndefined(() => 'slug')).toBe('slug');
  });

  it('devuelve undefined cuando la input required no está enlazada (NG0950)', () => {
    const unsetInput = (): string => {
      throw Object.assign(new Error('required input'), { code: -950 });
    };

    expect(inputValueOrUndefined(unsetInput)).toBeUndefined();
  });

  it('re-lanza cualquier otro error', () => {
    expect(() =>
      inputValueOrUndefined(() => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
  });
});
