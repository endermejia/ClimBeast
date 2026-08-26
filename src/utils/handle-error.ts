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
  toast.logError(error, severity, 'handleErrorToast');

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
  if (status === 429) return 'errors.rateLimit';
  if (status && status >= 500) return 'errors.server';

  const msg =
    'message' in error ? String((error as { message: unknown }).message) : '';
  if (isNetworkError(error) || /fetch|network|timeout/i.test(msg)) {
    return 'errors.network';
  }

  return 'errors.unexpected';
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return /failed to fetch|network|load/i.test(error.message);
  }
  if (error instanceof DOMException) {
    return error.name === 'AbortError';
  }
  return false;
}

/**
 * Extracts a human-readable message from an unknown error object.
 * @param error The error object to extract the message from
 * @returns The error message as a string
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error === undefined) return 'undefined';
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}
