import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { TuiNotification } from '@taiga-ui/core';
import {
  type TuiFileLike,
  TuiFileRejectedPipe,
  TuiFiles,
  TuiInputFiles,
} from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { Observable } from 'rxjs';

import { SanitizeHtmlPipe } from '../../pipes';

@Component({
  selector: 'app-import-8a-step-upload',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    SanitizeHtmlPipe,
    TranslatePipe,
    TuiFileRejectedPipe,
    TuiFiles,
    TuiInputFiles,
    TuiNotification,
  ],
  template: `
    <div class="grid gap-4">
      <div tuiNotification appearance="info" class="mt-4">
        <div
          [innerHTML]="'import8a.csvInstructions' | translate | sanitizeHtml"
        ></div>
      </div>

      <div class="mt-6">
        @if (!control().value) {
          <label tuiInputFiles>
            <input
              accept=".csv"
              tuiInputFiles
              [formControl]="control()"
              autocomplete="off"
            />
          </label>
        }

        <tui-files class="mt-2">
          @if (
            control().value | tuiFileRejected: { accept: '.csv' } | async;
            as file
          ) {
            <tui-file
              state="error"
              [file]="file"
              (remove)="removeFile.emit()"
            />
          }

          @if (loadedFile(); as file) {
            <tui-file [file]="file" (remove)="removeFile.emit()" />
          }

          @if (failedFiles() | async; as file) {
            <tui-file
              state="error"
              [file]="file"
              (remove)="removeFile.emit()"
            />
          }

          @if (loadingFiles() | async; as file) {
            <tui-file
              state="loading"
              [file]="file"
              (remove)="removeFile.emit()"
            />
          }
        </tui-files>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Import8aStepUploadComponent {
  readonly control = input.required<FormControl<TuiFileLike | null>>();
  readonly loadedFile = input<TuiFileLike | null>(null);
  readonly failedFiles = input.required<Observable<TuiFileLike | null>>();
  readonly loadingFiles = input.required<Observable<TuiFileLike | null>>();

  readonly removeFile = output<void>();
}
