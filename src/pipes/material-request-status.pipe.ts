import { Pipe, PipeTransform } from '@angular/core';

import { MaterialRequestStatus } from '../models';

@Pipe({
  name: 'materialRequestStatusAppearance',
  standalone: true,
})
export class MaterialRequestStatusAppearancePipe implements PipeTransform {
  private static readonly APPEARANCE: Record<MaterialRequestStatus, string> = {
    pending: 'warning',
    approved: 'accent',
    disposed: 'positive',
    cancelled: 'neutral',
    rejected: 'negative',
  };

  transform(status: MaterialRequestStatus): string {
    return MaterialRequestStatusAppearancePipe.APPEARANCE[status] ?? 'neutral';
  }
}
