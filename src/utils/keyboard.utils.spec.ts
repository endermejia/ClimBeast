import { describe, it, expect } from 'vitest';

import { isRogueHardwareKey } from './keyboard.utils';

const keyEvent = (init: Partial<KeyboardEvent>): KeyboardEvent =>
  init as KeyboardEvent;

describe('isRogueHardwareKey', () => {
  it('never swallows the letter t (keyCode 84)', () => {
    expect(
      isRogueHardwareKey(keyEvent({ key: 't', code: 'KeyT', keyCode: 84 })),
    ).toBe(false);
    expect(
      isRogueHardwareKey(keyEvent({ key: 'T', code: 'KeyT', keyCode: 84 })),
    ).toBe(false);
  });

  it('swallows keyCode 84 when it does not produce the letter t', () => {
    expect(isRogueHardwareKey(keyEvent({ key: '', keyCode: 84 }))).toBe(true);
    expect(
      isRogueHardwareKey(keyEvent({ key: 'BrowserSearch', keyCode: 84 })),
    ).toBe(true);
    expect(isRogueHardwareKey(keyEvent({ key: 'search', keyCode: 170 }))).toBe(
      true,
    );
  });

  it('swallows find/search keys by name', () => {
    expect(isRogueHardwareKey(keyEvent({ key: 'find' }))).toBe(true);
    expect(isRogueHardwareKey(keyEvent({ code: 'find' }))).toBe(true);
    expect(isRogueHardwareKey(keyEvent({ key: 'search' }))).toBe(true);
    expect(isRogueHardwareKey(keyEvent({ code: 'search' }))).toBe(true);
  });

  it('swallows F-keys (alert slider / hardware search fire F3)', () => {
    expect(isRogueHardwareKey(keyEvent({ key: 'f3', keyCode: 114 }))).toBe(
      true,
    );
    expect(isRogueHardwareKey(keyEvent({ keyCode: 133 }))).toBe(true);
    expect(isRogueHardwareKey(keyEvent({ key: 'F5', keyCode: 116 }))).toBe(
      true,
    );
  });

  it('lets every other key through', () => {
    for (const key of ['a', 'Enter', ' ', 'ArrowLeft', '/', 'ñ']) {
      expect(isRogueHardwareKey(keyEvent({ key, keyCode: 0 }))).toBe(false);
    }
  });
});
