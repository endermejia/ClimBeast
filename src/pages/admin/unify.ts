import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiIcon } from '@taiga-ui/core';
import { TuiTabs } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { SuggestedUnifiedAreasComponent } from '../../components/admin/suggested-unified-areas';
import { SuggestedUnifiedCragsComponent } from '../../components/admin/suggested-unified-crags';
import { SuggestedUnifiedRoutesComponent } from '../../components/admin/suggested-unified-routes';

@Component({
  selector: 'app-admin-unify',
  imports: [
    CommonModule,
    RouterLink,
    SuggestedUnifiedAreasComponent,
    SuggestedUnifiedCragsComponent,
    SuggestedUnifiedRoutesComponent,
    TranslatePipe,
    TuiIcon,
    TuiTabs,
  ],
  template: `
    <div class="p-4 flex flex-col gap-4 max-w-7xl mx-auto w-full">
      <header class="mb-4 flex items-center justify-between gap-2">
        <h1 class="text-2xl font-bold m-0">
          <a
            routerLink="/admin"
            class="no-underline text-inherit flex items-center gap-2"
          >
            <tui-icon icon="@tui.arrow-left" />
            <div
              class="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0"
            >
              <tui-icon icon="@tui.copy" />
            </div>
            {{ 'admin.unifyTitle' | translate }}
          </a>
        </h1>
      </header>

      <p class="mb-6 text-tui-text-secondary opacity-60">
        {{ 'admin.unifyDescription' | translate }}
      </p>

      <tui-tabs
        [activeItemIndex]="activeTab()"
        (activeItemIndexChange)="activeTab.set($event)"
      >
        <button tuiTab>
          {{ 'areas' | translate }}
        </button>
        <button tuiTab>
          {{ 'crags' | translate }}
        </button>
        <button tuiTab>
          {{ 'routes' | translate }}
        </button>
      </tui-tabs>

      @switch (activeTab()) {
        @case (0) {
          <app-suggested-unified-areas />
        }
        @case (1) {
          <app-suggested-unified-crags />
        }
        @case (2) {
          <app-suggested-unified-routes />
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUnifyComponent {
  protected readonly activeTab = signal(0);
}
