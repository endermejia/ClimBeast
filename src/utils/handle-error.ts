import { ErrorSeverity } from '../services/error-log.service';
import { ToastService } from '../services/toast.service';

/**
 * Handles error mapping, logs silently to database via ToastService -> ErrorLogService
 * (without printing to console), and displays a toast notification.
 * @param error The error object (usually from Supabase)
 * @param toast The ToastService instance
 * @param severity Optional error severity ('critical' | 'error' | 'warning' | 'info')
 */
const POSTGRES_ERROR_MAP: Record<string, string> = {
  '23502': 'errors.database.notNullViolation',
  '23503': 'errors.database.foreign_key_violation',
  '23505': 'errors.database.unique_violation',
  '28P01': 'errors.invalidCredentials',
  '42501': 'errors.insufficientPrivilege',
  '42P01': 'errors.database.undefinedTable',
  '42703': 'errors.database.undefinedColumn',
  P0001: 'errors.insufficientPrivilege',
};

const POSTGREST_ERROR_MAP: Record<string, string> = {
  PGRST116: 'errors.database.rowNotFound',
  PGRST204: 'errors.database.noSchema',
};

export function handleErrorToast(
  error: unknown,
  toast: ToastService,
  severity: ErrorSeverity = 'error',
): void {
  // Do not log client connectivity / network drops to database
  if (!isNetworkError(error)) {
    toast.logError(error, severity, 'handleErrorToast');
  }

  const messageKey = resolveErrorKey(error);
  toast.error(messageKey);
}

function resolveErrorKey(error: unknown): string {
  if (typeof error !== 'object' || error === null) {
    return isNetworkError(error) ? 'errors.network' : 'errors.unexpected';
  }

  const code =
    'code' in error ? String((error as { code: unknown }).code) : undefined;

  if (code && code in POSTGRES_ERROR_MAP) {
    return POSTGRES_ERROR_MAP[code];
  }

  if (code && code in POSTGREST_ERROR_MAP) {
    return POSTGREST_ERROR_MAP[code];
  }

  const status =
    'status' in error
      ? Number((error as { status: unknown }).status)
      : undefined;
  if (status === 401 || status === 403) return 'errors.insufficientPrivilege';
  if (status === 429) return 'errors.rateLimit';
  if (status && status >= 500) return 'errors.server';

  const msg =
    'message' in error ? String((error as { message: unknown }).message) : '';
  if (isNetworkError(error) || /fetch|network|timeout/i.test(msg)) {
    return 'errors.network';
  }
  if (/permission|privilege|not authorized|unauthorized/i.test(msg)) {
    return 'errors.insufficientPrivilege';
  }

  return 'errors.unexpected';
}

export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }
  if (error instanceof TypeError) {
    return /failed to fetch|network|load/i.test(error.message);
  }
  if (error instanceof DOMException) {
    return error.name === 'AbortError';
  }
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    const name = typeof err['name'] === 'string' ? err['name'] : '';
    const msg = typeof err['message'] === 'string' ? err['message'] : '';
    if (name === 'AbortError') return true;
    if (
      /failed to fetch|load failed|network connection|internet connection|offline|abort|signal is aborted/i.test(
        msg,
      )
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Safely stringifies an arbitrary value, handling circular references and DOM events.
 */
export function safeStringify(obj: unknown): string {
  try {
    const seen = new WeakSet();
    return JSON.stringify(obj, (_key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
      }
      if (typeof Event !== 'undefined' && value instanceof Event) {
        return {
          type: value.type,
          target: (value.target as HTMLElement | null)?.tagName ?? null,
        };
      }
      return value;
    });
  } catch {
    return '';
  }
}

/**
 * Extracts a human-readable message from an unknown error object.
 * @param error The error object to extract the message from
 * @returns The error message as a string
 */
export function extractErrorMessage(error: unknown, depth = 0): string {
  if (depth > 5 || !error) return '';
  if (error instanceof Error) {
    if (
      error.message &&
      error.message !== '[object Object]' &&
      error.message !== 'Error'
    ) {
      return error.message;
    }
    if ('cause' in error && error.cause) {
      const causeMsg = extractErrorMessage(error.cause, depth + 1);
      if (causeMsg) return causeMsg;
    }
    return error.message || '';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object') {
    if (typeof Event !== 'undefined' && error instanceof Event) {
      const target = (error.target as HTMLElement | null)?.tagName || 'unknown';
      const type = error.type || 'event';
      if (
        'message' in error &&
        typeof (error as { message: unknown }).message === 'string'
      ) {
        return `${type} (${(error as { message: string }).message})`;
      }
      return `Event: ${type} on <${target}>`;
    }

    const rec = error as Record<string, unknown>;
    if (
      typeof rec['message'] === 'string' &&
      rec['message'].trim() &&
      rec['message'] !== '[object Object]'
    ) {
      return rec['message'];
    }
    if (rec['cause']) {
      const causeMsg = extractErrorMessage(rec['cause'], depth + 1);
      if (causeMsg) return causeMsg;
    }
    if (rec['error']) {
      const innerMsg = extractErrorMessage(rec['error'], depth + 1);
      if (innerMsg) return innerMsg;
    }
    if (typeof rec['details'] === 'string' && rec['details'].trim()) {
      return rec['details'];
    }

    const json = safeStringify(error);
    if (json && json !== '{}' && json !== '{"message":""}') {
      return json;
    }
  }
  const str = String(error ?? '');
  return str === '[object Object]' ? '' : str;
}
