import { Pipe, PipeTransform } from '@angular/core';

import { UserReportReason, UserReportStatus } from '../models';

@Pipe({
  name: 'userReportReasonKey',
  standalone: true,
})
export class UserReportReasonKeyPipe implements PipeTransform {
  transform(reason: UserReportReason): string {
    return `reportReasons.${reason}.title`;
  }
}

@Pipe({
  name: 'userReportStatusAppearance',
  standalone: true,
})
export class UserReportStatusAppearancePipe implements PipeTransform {
  private static readonly APPEARANCE: Record<UserReportStatus, string> = {
    pending: 'accent',
    resolved: 'positive',
    dismissed: 'neutral',
  };

  transform(status: UserReportStatus): string {
    return UserReportStatusAppearancePipe.APPEARANCE[status] ?? 'neutral';
  }
}
