import { ErrorHandler, inject, Injectable } from '@angular/core';

import { STORAGE_KEYS } from '../constants';
import { extractErrorMessage, isNetworkError } from '../utils';

import { IS_BROWSER } from '../app/is-browser';
import { ErrorLogService } from './error-log.service';

const CHUNK_RELOAD_KEY = STORAGE_KEYS.chunkReloadTs;

@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly errorLogService = inject(ErrorLogService);

  handleError(error: unknown): void {
    const msg = this.extractMessage(error);
    const trimmed = msg.trim();

    // 0. Empty, blank, or meaningless cancellation/rejection errors that should never be logged
    if (
      !trimmed ||
      trimmed === '{"message":""}' ||
      trimmed === '{}' ||
      trimmed === 'null' ||
      trimmed === 'undefined' ||
      trimmed === '[object Object]'
    ) {
      return;
    }

    // 1. Benign browser notifications that should never be logged
    if (
      /ResizeObserver loop (completed with undelivered notifications|limit exceeded)/i.test(
        msg,
      )
    ) {
      return;
    }

    // 2. Aborted requests/cancellations & network drops (user offline or temporary loss of connection)
    if (
      isNetworkError(error) ||
      (error instanceof DOMException && error.name === 'AbortError') ||
      (typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        (error as { name: unknown }).name === 'AbortError') ||
      /AbortError|signal is aborted without reason|The user aborted a request|Load failed|Failed to fetch|NetworkError/i.test(
        msg,
      )
    ) {
      return;
    }

    // 3. Dynamic import chunk loading errors (stale bundle after redeployment/dev rebuild)
    if (
      /Failed to fetch dynamically imported module|error loading dynamically imported module|Loading chunk [\d]+ failed/i.test(
        msg,
      )
    ) {
      if (this.isBrowser) {
        try {
          const now = Date.now();
          const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
          // Sin conexión el chunk no puede descargarse: recargar solo provoca
          // un bucle de pantallas en blanco.
          const canReload =
            typeof navigator === 'undefined' || navigator.onLine;
          if (now - last > 15000 && canReload) {
            sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
            window.location.reload();
            return;
          }
        } catch {
          // ignore session storage access failures
        }
      }
      this.errorLogService.logError(error, 'warning', 'AppErrorHandler');
      return;
    }

    // 4. RxJS EmptyError (no elements in sequence) - demote to warning
    if (/no elements in sequence/i.test(msg)) {
      this.errorLogService.logError(error, 'warning', 'AppErrorHandler');
      return;
    }

    // Log all other unexpected errors to database via ErrorLogService without printing to console
    this.errorLogService.logError(error, 'critical', 'AppErrorHandler');
  }

  private extractMessage(error: unknown, depth = 0): string {
    return extractErrorMessage(error, depth);
  }
}
