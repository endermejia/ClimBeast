import { Component } from '@angular/core';

import { TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

import { ReportUserDialogData } from '../../models';

import { ReportUserFormComponent } from '../forms/report-user-form';

@Component({
  selector: 'app-report-user-dialog',
  imports: [ReportUserFormComponent],
  template: `
    <app-report-user-form
      [targetUser]="context.data"
      (submitted)="context.completeWith($event)"
      (cancelled)="context.completeWith(false)"
    />
  `,
})
export class ReportUserDialogComponent {
  protected readonly context =
    injectContext<TuiDialogContext<boolean, ReportUserDialogData>>();
}
