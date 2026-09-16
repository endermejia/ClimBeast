import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

import { ReportUserFormComponent } from '../forms/report-user-form';

import { ReportUserDialogData } from '../../models';

@Component({
  selector: 'app-report-user-dialog',
  standalone: true,
  imports: [ReportUserFormComponent],
  template: `
    <app-report-user-form
      [targetUser]="context.data"
      (submitted)="context.completeWith($event)"
      (cancelled)="context.completeWith(false)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportUserDialogComponent {
  protected readonly context =
    injectContext<TuiDialogContext<boolean, ReportUserDialogData>>();
}
