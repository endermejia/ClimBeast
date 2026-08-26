import { ErrorHandler, inject, Injectable } from '@angular/core';

import { ErrorLogService } from './error-log.service';

@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly errorLogService = inject(ErrorLogService);

  handleError(error: unknown): void {
    // Log error to database via ErrorLogService without printing to console
    this.errorLogService.logError(error, 'critical', 'AppErrorHandler');
  }
}
