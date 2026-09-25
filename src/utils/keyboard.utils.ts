/**
 * Hardware keys that must be swallowed globally so they do not open the
 * browser find/search UI (OnePlus alert sliders fire F3, some hardware
 * Search keys fire keyCode 84/170 without producing a character).
 *
 * `keyCode 84` is ambiguous: it is both the letter T and, on some devices,
 * the hardware Search key. It is only treated as a search key when the event
 * does not produce the letter `t` — otherwise typing "t" would be blocked
 * app-wide (the input never receives the keydown).
 */
export function isRogueHardwareKey(event: KeyboardEvent): boolean {
  const key = (event.key || '').toLowerCase();
  const code = (event.code || '').toLowerCase();
  const keyCode = event.keyCode || event.which;

  const isFKey =
    key === 'f3' ||
    code === 'f3' ||
    keyCode === 114 ||
    keyCode === 133 ||
    /^f\d+$/.test(key) ||
    /^f\d+$/.test(code) ||
    (keyCode >= 112 && keyCode <= 123) ||
    (keyCode >= 121 && keyCode <= 132);

  const isSearchKey =
    key === 'find' ||
    code === 'find' ||
    key === 'search' ||
    code === 'search' ||
    ((keyCode === 84 || keyCode === 170) && key !== 't');

  return isFKey || isSearchKey;
}
