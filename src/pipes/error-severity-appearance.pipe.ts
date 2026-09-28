import { Pipe, PipeTransform } from '@angular/core';

import { ErrorSeverity } from '../services/error-log.service';

@Pipe({
  name: 'errorSeverityAppearance',
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
