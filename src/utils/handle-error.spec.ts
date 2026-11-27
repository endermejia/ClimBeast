import { describe, expect, it, vi } from 'vitest';

import { ToastService } from '../services/toast.service';

import {
  extractErrorMessage,
  handleErrorToast,
  isNetworkError,
  resolveEdgeFunctionError,
  safeStringify,
} from './handle-error';

describe('resolveEdgeFunctionError', () => {
  it('extracts body.error string into an Error when context.json() resolves', async () => {
    const rawError = {
      message: 'Edge Function returned a non-2xx status code',
      context: {
        json: vi.fn().mockResolvedValue({ error: 'Insufficient stock' }),
      },
    };

    const resolved = await resolveEdgeFunctionError(rawError);

    expect(resolved).toBeInstanceOf(Error);
    expect((resolved as Error).message).toBe('Insufficient stock');
  });

  it('returns the original error when body has no error field', async () => {
    const rawError = {
      message: 'Edge Function error',
      context: {
        json: vi.fn().mockResolvedValue({ ok: false }),
      },
    };

    const resolved = await resolveEdgeFunctionError(rawError);
    expect(resolved).toBe(rawError);
  });

  it('returns the original error when body is null or body.error is empty or non-string', async () => {
    const nullBodyError = {
      message: 'Null body',
      context: { json: vi.fn().mockResolvedValue(null) },
    };
    expect(await resolveEdgeFunctionError(nullBodyError)).toBe(nullBodyError);

    const emptyMsgError = {
      message: 'Empty msg',
      context: { json: vi.fn().mockResolvedValue({ error: '' }) },
    };
    expect(await resolveEdgeFunctionError(emptyMsgError)).toBe(emptyMsgError);

    const nonStringMsgError = {
      message: 'Non-string msg',
      context: { json: vi.fn().mockResolvedValue({ error: 500 }) },
    };
    expect(await resolveEdgeFunctionError(nonStringMsgError)).toBe(
      nonStringMsgError,
    );
  });

  it('falls back to original error when context.json() rejects', async () => {
    const rawError = new Error('Edge Function returned a non-2xx status code');
    Object.assign(rawError, {
      context: {
        json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token <')),
      },
    });

    const resolved = await resolveEdgeFunctionError(rawError);
    expect(resolved).toBe(rawError);
  });

  it('returns the original error when context or context.json is missing', async () => {
    const plainError = new Error('Plain failure');
    expect(await resolveEdgeFunctionError(plainError)).toBe(plainError);

    const badContext = { message: 'No json fn', context: { json: 'nope' } };
    expect(await resolveEdgeFunctionError(badContext)).toBe(badContext);

    expect(await resolveEdgeFunctionError('string error')).toBe('string error');
    expect(await resolveEdgeFunctionError(null)).toBeNull();
    expect(await resolveEdgeFunctionError(undefined)).toBeUndefined();
  });
});

describe('isNetworkError', () => {
  it('detects fetch TypeErrors and AbortError DOMExceptions', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkError(new DOMException('Aborted', 'AbortError'))).toBe(
      true,
    );
    expect(isNetworkError({ name: 'AbortError' })).toBe(true);
    expect(isNetworkError({ message: 'Network connection lost' })).toBe(true);
  });

  it('returns false for regular application errors', () => {
    expect(isNetworkError(new Error('Validation failed'))).toBe(false);
    expect(isNetworkError({ code: '23505', message: 'duplicate key' })).toBe(
      false,
    );
  });
});

describe('safeStringify', () => {
  it('serializes plain objects and Error instances', () => {
    expect(safeStringify({ a: 1 })).toBe('{"a":1}');
    const parsed = JSON.parse(safeStringify(new Error('boom')));
    expect(parsed.name).toBe('Error');
    expect(parsed.message).toBe('boom');
  });

  it('replaces circular references with [Circular]', () => {
    const obj: Record<string, unknown> = { name: 'loop' };
    obj['self'] = obj;
    expect(safeStringify(obj)).toBe('{"name":"loop","self":"[Circular]"}');
  });
});

describe('extractErrorMessage', () => {
  it('extracts message from Error, string, nested cause/error, and details', () => {
    expect(extractErrorMessage(new Error('Something broke'))).toBe(
      'Something broke',
    );
    expect(extractErrorMessage('direct string')).toBe('direct string');
    expect(extractErrorMessage({ cause: new Error('Root cause') })).toBe(
      'Root cause',
    );
    expect(extractErrorMessage({ error: 'Inner error' })).toBe('Inner error');
    expect(extractErrorMessage({ details: 'Detailed reason' })).toBe(
      'Detailed reason',
    );
    expect(extractErrorMessage(null)).toBe('');
  });
});

describe('handleErrorToast', () => {
  function createMockToast() {
    return {
      logError: vi.fn(),
      error: vi.fn(),
    } as unknown as ToastService & {
      logError: ReturnType<typeof vi.fn>;
      error: ReturnType<typeof vi.fn>;
    };
  }

  it('maps known Postgres and PostgREST codes and logs the error', () => {
    const toast = createMockToast();
    handleErrorToast({ code: '23505' }, toast);
    expect(toast.logError).toHaveBeenCalledWith(
      { code: '23505' },
      'error',
      'handleErrorToast',
    );
    expect(toast.error).toHaveBeenCalledWith(
      'errors.database.unique_violation',
    );

    toast.error.mockClear();
    handleErrorToast({ code: 'PGRST116' }, toast, 'warning');
    expect(toast.error).toHaveBeenCalledWith('errors.database.rowNotFound');
  });

  it('maps HTTP status codes', () => {
    const toast = createMockToast();
    handleErrorToast({ status: 403 }, toast);
    expect(toast.error).toHaveBeenCalledWith('errors.insufficientPrivilege');

    handleErrorToast({ status: 429 }, toast);
    expect(toast.error).toHaveBeenCalledWith('errors.rateLimit');

    handleErrorToast({ status: 503 }, toast);
    expect(toast.error).toHaveBeenCalledWith('errors.server');
  });

  it('does not log network errors to DB and shows network toast', () => {
    const toast = createMockToast();
    handleErrorToast(new TypeError('Failed to fetch'), toast);
    expect(toast.logError).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('errors.network');
  });

  it('falls back to unexpected error key for unknown errors', () => {
    const toast = createMockToast();
    handleErrorToast(new Error('Unknown glitch'), toast);
    expect(toast.logError).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('errors.unexpected');
  });
});
