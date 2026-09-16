import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiIcon, TuiScrollbar } from '@taiga-ui/core';
import { TuiBadgedContent } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { EmptyStateComponent } from '../../components/ui/empty-state';

@Component({
  selector: 'app-admin-comment-reports',
  standalone: true,
  imports: [
    EmptyStateComponent,
    RouterLink,
    TranslatePipe,
    TuiBadgedContent,
    TuiIcon,
    TuiScrollbar,
  ],
  template: `
    <section class="flex flex-col w-full max-w-7xl mx-auto p-4 grow min-h-0">
      <header class="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h1 class="text-2xl font-bold m-0">
          <a
            routerLink="/admin"
            class="no-underline text-inherit flex items-center gap-2"
          >
            <tui-icon icon="@tui.arrow-left" />
            <tui-badged-content [style.--tui-radius.%]="50" class="shrink-0">
              <div
                class="w-11 h-11 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0"
              >
                <tui-icon icon="@tui.message-square-warning" />
              </div>
            </tui-badged-content>
            {{ 'admin.commentReports.title' | translate }}
          </a>
        </h1>
      </header>

      <p class="mb-6 text-tui-text-secondary opacity-60">
        {{ 'admin.commentReports.description' | translate }}
      </p>

      <tui-scrollbar class="flex grow">
        <div class="py-12">
          <app-empty-state
            icon="@tui.message-square-warning"
            message="admin.commentReports.empty"
          />
        </div>
      </tui-scrollbar>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class AdminCommentReportsComponent {}
