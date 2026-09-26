import { Pipe, PipeTransform } from '@angular/core';

import { ErrorSeverity } from '../services/error-log.service';

/**
 * Pure pipe to map ErrorSeverity to Taiga UI badge appearance string.
 * Replaces direct method execution in templates during change detection ticks.
 */
@Pipe({
  name: 'errorSeverityAppearance',
  standalone: true,
})
export class ErrorSeverityAppearancePipe implements PipeTransform {
  transform(severity: ErrorSeverity | string | null | undefined): string {
    switch (severity) {
      case 'critical':
        return 'negative';
      case 'error':
        return 'warning';
      case 'warning':
        return 'info';
      default:
        return 'neutral';
    }
  }
}
