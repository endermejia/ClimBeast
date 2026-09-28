import { Pipe, PipeTransform } from '@angular/core';

import { ErrorSeverity } from '../services/error-log.service';

/**
 * Pure pipe to map an error severity level to its corresponding Taiga UI badge appearance string.
 * Using a pure pipe avoids executing component methods in template bindings during change detection.
 */
@Pipe({
  name: 'errorSeverityAppearance',
  standalone: true,
  pure: true,
})
export class ErrorSeverityAppearancePipe implements PipeTransform {
  private static readonly APPEARANCES: Record<ErrorSeverity, string> = {
    critical: 'negative',
    error: 'warning',
    warning: 'info',
    info: 'neutral',
  };

  transform(severity: ErrorSeverity | string | null | undefined): string {
    if (!severity) return 'neutral';
    return ErrorSeverityAppearancePipe.APPEARANCES[severity as ErrorSeverity] ?? 'neutral';
  }
}
